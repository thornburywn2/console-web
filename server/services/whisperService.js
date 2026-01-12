/**
 * Whisper Service - Local Speech-to-Text
 * P0 Phase 4: Whisper.cpp Docker Integration
 *
 * Provides high-accuracy transcription using Whisper.cpp running in Docker.
 * Features:
 * - Local/self-hosted transcription (no external API calls)
 * - Multiple model sizes (tiny, base, small, medium, large)
 * - Automatic Docker container management
 * - Audio preprocessing and chunking
 * - Language detection and forced language support
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Whisper configuration
const WHISPER_CONFIG = {
  // Docker image for Whisper.cpp
  dockerImage: 'ghcr.io/ggerganov/whisper.cpp:main',
  // Container name
  containerName: 'cw-whisper',
  // Default model size
  defaultModel: 'base.en',
  // Available models (smaller = faster, larger = more accurate)
  models: {
    'tiny': { size: '75MB', speed: 'fastest', accuracy: 'basic' },
    'tiny.en': { size: '75MB', speed: 'fastest', accuracy: 'basic', english: true },
    'base': { size: '142MB', speed: 'fast', accuracy: 'good' },
    'base.en': { size: '142MB', speed: 'fast', accuracy: 'good', english: true },
    'small': { size: '466MB', speed: 'medium', accuracy: 'better' },
    'small.en': { size: '466MB', speed: 'medium', accuracy: 'better', english: true },
    'medium': { size: '1.5GB', speed: 'slow', accuracy: 'great' },
    'medium.en': { size: '1.5GB', speed: 'slow', accuracy: 'great', english: true },
    'large': { size: '2.9GB', speed: 'slowest', accuracy: 'best' }
  },
  // Model storage directory
  modelsDir: path.join(os.homedir(), '.cache', 'whisper'),
  // Temp directory for audio files
  tempDir: path.join(os.tmpdir(), 'cw-whisper'),
  // Default language
  defaultLanguage: 'en',
  // Audio format settings
  audioFormat: {
    sampleRate: 16000,
    channels: 1,
    encoding: 'LINEAR16'
  }
};

class WhisperService {
  constructor() {
    this.isAvailable = false;
    this.currentModel = WHISPER_CONFIG.defaultModel;
    this.containerRunning = false;
  }

  /**
   * Initialize the Whisper service
   */
  async initialize() {
    try {
      // Check Docker availability
      await this.checkDocker();

      // Ensure directories exist
      await fs.mkdir(WHISPER_CONFIG.modelsDir, { recursive: true });
      await fs.mkdir(WHISPER_CONFIG.tempDir, { recursive: true });

      // Check/pull Docker image
      await this.ensureImage();

      this.isAvailable = true;
      return true;
    } catch (err) {
      console.error('Whisper initialization failed:', err.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Check if Docker is available
   */
  async checkDocker() {
    try {
      await execAsync('docker --version');
      return true;
    } catch (err) {
      throw new Error('Docker is not available');
    }
  }

  /**
   * Ensure Whisper Docker image is available
   */
  async ensureImage() {
    try {
      // Check if image exists locally
      const { stdout } = await execAsync(`docker images -q ${WHISPER_CONFIG.dockerImage}`);
      if (!stdout.trim()) {
        console.log('Pulling Whisper Docker image...');
        await execAsync(`docker pull ${WHISPER_CONFIG.dockerImage}`);
      }
      return true;
    } catch (err) {
      throw new Error(`Failed to ensure Whisper image: ${err.message}`);
    }
  }

  /**
   * Download a specific model
   */
  async downloadModel(modelName) {
    if (!WHISPER_CONFIG.models[modelName]) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelPath = path.join(WHISPER_CONFIG.modelsDir, `ggml-${modelName}.bin`);

    // Check if model already exists
    try {
      await fs.access(modelPath);
      return modelPath;
    } catch {
      // Model doesn't exist, need to download
    }

    console.log(`Downloading Whisper model: ${modelName}...`);

    // Download model using Docker
    const downloadCmd = `docker run --rm \
      -v ${WHISPER_CONFIG.modelsDir}:/models \
      ${WHISPER_CONFIG.dockerImage} \
      ./models/download-ggml-model.sh ${modelName}`;

    try {
      await execAsync(downloadCmd);
      return modelPath;
    } catch (err) {
      throw new Error(`Failed to download model ${modelName}: ${err.message}`);
    }
  }

  /**
   * Transcribe audio file
   * @param {string|Buffer} audio - Audio file path or buffer
   * @param {Object} options - Transcription options
   */
  async transcribe(audio, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Whisper service not available');
    }

    const {
      model = this.currentModel,
      language = WHISPER_CONFIG.defaultLanguage,
      translate = false,
      timestamps = false,
      prompt = ''
    } = options;

    // Prepare audio file
    const audioPath = typeof audio === 'string'
      ? audio
      : await this.saveAudioBuffer(audio);

    // Ensure model is downloaded
    const modelPath = await this.downloadModel(model);

    // Build Whisper command
    const args = [
      'run', '--rm',
      '-v', `${path.dirname(audioPath)}:/audio`,
      '-v', `${WHISPER_CONFIG.modelsDir}:/models`,
      WHISPER_CONFIG.dockerImage,
      './main',
      '-m', `/models/ggml-${model}.bin`,
      '-f', `/audio/${path.basename(audioPath)}`,
      '-l', language,
      '--output-json'
    ];

    if (translate) {
      args.push('--translate');
    }

    if (prompt) {
      args.push('--prompt', prompt);
    }

    if (!timestamps) {
      args.push('--no-timestamps');
    }

    // Run transcription
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('docker', args);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        // Cleanup temp file if we created it
        if (typeof audio !== 'string') {
          fs.unlink(audioPath).catch(() => {});
        }

        if (code !== 0) {
          reject(new Error(`Whisper failed: ${stderr}`));
          return;
        }

        try {
          // Parse JSON output
          const result = this.parseOutput(stdout);
          resolve(result);
        } catch (err) {
          // Try to extract text directly
          const text = this.extractText(stdout);
          resolve({
            text,
            confidence: 0.9,
            language,
            model
          });
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to run Whisper: ${err.message}`));
      });
    });
  }

  /**
   * Save audio buffer to temp file
   */
  async saveAudioBuffer(buffer) {
    const filename = `audio_${Date.now()}.wav`;
    const filepath = path.join(WHISPER_CONFIG.tempDir, filename);
    await fs.writeFile(filepath, buffer);
    return filepath;
  }

  /**
   * Parse Whisper JSON output
   */
  parseOutput(output) {
    try {
      // Try to find JSON in output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall through to text extraction
    }
    return null;
  }

  /**
   * Extract plain text from Whisper output
   */
  extractText(output) {
    // Remove timestamps and clean up
    const lines = output.split('\n')
      .filter(line => !line.startsWith('[') && line.trim())
      .map(line => line.trim());

    return lines.join(' ').trim();
  }

  /**
   * Transcribe from Web Audio API blob
   * @param {Blob} blob - Audio blob from MediaRecorder
   */
  async transcribeBlob(blob, options = {}) {
    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save as WAV file (Whisper prefers 16kHz mono WAV)
    const wavPath = await this.convertToWav(buffer, blob.type);

    return this.transcribe(wavPath, options);
  }

  /**
   * Convert audio to WAV format using FFmpeg
   */
  async convertToWav(buffer, mimeType) {
    const inputPath = path.join(WHISPER_CONFIG.tempDir, `input_${Date.now()}.webm`);
    const outputPath = path.join(WHISPER_CONFIG.tempDir, `audio_${Date.now()}.wav`);

    await fs.writeFile(inputPath, buffer);

    // Convert using FFmpeg (commonly available in Docker or system)
    try {
      await execAsync(
        `ffmpeg -i ${inputPath} -ar 16000 -ac 1 -c:a pcm_s16le ${outputPath} -y`
      );
      await fs.unlink(inputPath);
      return outputPath;
    } catch (err) {
      // If FFmpeg fails, try to use the file directly
      console.warn('FFmpeg conversion failed, trying direct transcription');
      return inputPath;
    }
  }

  /**
   * Get available models
   */
  getModels() {
    return WHISPER_CONFIG.models;
  }

  /**
   * Set default model
   */
  setModel(modelName) {
    if (!WHISPER_CONFIG.models[modelName]) {
      throw new Error(`Unknown model: ${modelName}`);
    }
    this.currentModel = modelName;
  }

  /**
   * Get service status
   */
  async getStatus() {
    return {
      available: this.isAvailable,
      currentModel: this.currentModel,
      models: WHISPER_CONFIG.models,
      modelsDir: WHISPER_CONFIG.modelsDir
    };
  }

  /**
   * Clean up temp files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(WHISPER_CONFIG.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(WHISPER_CONFIG.tempDir, file));
      }
    } catch (err) {
      console.error('Cleanup failed:', err.message);
    }
  }
}

// Singleton instance
export const whisperService = new WhisperService();

export default whisperService;
