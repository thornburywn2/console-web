/**
 * Tabby Manager Service
 * P2 Phase 1: Tabby Docker Deployment
 *
 * Manages Tabby AI code completion service via Docker.
 * Features:
 * - Docker container lifecycle management
 * - GPU/CPU deployment options
 * - Model selection and configuration
 * - Health monitoring
 */

import Docker from 'dockerode';
import { EventEmitter } from 'events';
import os from 'os';
import { createLogger } from './logger.js';
// Note: Using native fetch (Node 18+)

const log = createLogger('tabby-manager');

// Tabby Docker configuration
const TABBY_CONFIG = {
  image: 'tabbyml/tabby',
  defaultTag: 'latest',
  gpuImage: 'tabbyml/tabby:gpu',
  containerName: 'command-portal-tabby',
  defaultPort: 8080,
  healthEndpoint: '/health',
  modelsEndpoint: '/v1/models',
  completionsEndpoint: '/v1/completions'
};

// Available Tabby models
const TABBY_MODELS = {
  'StarCoder-1B': {
    id: 'TabbyML/StarCoder-1B',
    size: '1B',
    type: 'completion',
    memory: '4GB',
    description: 'Fast and lightweight'
  },
  'StarCoder-3B': {
    id: 'TabbyML/StarCoder-3B',
    size: '3B',
    type: 'completion',
    memory: '8GB',
    description: 'Balanced performance'
  },
  'StarCoder-7B': {
    id: 'TabbyML/StarCoder-7B',
    size: '7B',
    type: 'completion',
    memory: '16GB',
    description: 'Best quality, needs GPU'
  },
  'CodeLlama-7B': {
    id: 'TabbyML/CodeLlama-7B',
    size: '7B',
    type: 'completion',
    memory: '16GB',
    description: 'Meta CodeLlama'
  },
  'DeepseekCoder-1.3B': {
    id: 'TabbyML/DeepseekCoder-1.3B',
    size: '1.3B',
    type: 'completion',
    memory: '4GB',
    description: 'Efficient coding model'
  },
  'DeepseekCoder-6.7B': {
    id: 'TabbyML/DeepseekCoder-6.7B',
    size: '6.7B',
    type: 'completion',
    memory: '16GB',
    description: 'High-quality Deepseek'
  }
};

/**
 * Tabby Docker Manager
 */
class TabbyManager extends EventEmitter {
  constructor() {
    super();
    this.docker = new Docker();
    this.container = null;
    this.status = 'stopped';
    this.config = {
      model: 'StarCoder-1B',
      useGpu: false,
      port: TABBY_CONFIG.defaultPort,
      dataDir: `${os.homedir()}/.tabby`
    };
    this.healthCheckInterval = null;
    this.stats = {
      requests: 0,
      completions: 0,
      errors: 0,
      avgLatency: 0,
      lastRequest: null
    };
  }

  /**
   * Check if Docker is available
   */
  async checkDocker() {
    try {
      await this.docker.ping();
      return { available: true };
    } catch (err) {
      return { available: false, error: err.message };
    }
  }

  /**
   * Check if Tabby image exists locally
   */
  async checkImage() {
    try {
      const images = await this.docker.listImages();
      const tabbyImages = images.filter(img =>
        img.RepoTags?.some(tag => tag.startsWith('tabbyml/tabby'))
      );
      return {
        exists: tabbyImages.length > 0,
        images: tabbyImages.map(img => ({
          id: img.Id.substring(7, 19),
          tags: img.RepoTags,
          size: Math.round(img.Size / 1024 / 1024) + 'MB'
        }))
      };
    } catch (err) {
      return { exists: false, error: err.message };
    }
  }

  /**
   * Pull Tabby Docker image
   */
  async pullImage(useGpu = false, onProgress = null) {
    const imageName = useGpu ? TABBY_CONFIG.gpuImage : `${TABBY_CONFIG.image}:${TABBY_CONFIG.defaultTag}`;

    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, {}, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, image: imageName });
          }
        }, (event) => {
          if (onProgress) {
            onProgress(event);
          }
          this.emit('pull-progress', event);
        });
      });
    });
  }

  /**
   * Check if GPU is available
   */
  async checkGpu() {
    try {
      const info = await this.docker.info();
      // Check for NVIDIA runtime
      const hasNvidia = info.Runtimes && info.Runtimes.nvidia;

      // Also check if nvidia-smi is available
      try {
        const { execSync } = await import('child_process');
        execSync('nvidia-smi', { stdio: 'ignore' });
        return { available: true, runtime: hasNvidia ? 'nvidia' : 'host' };
      } catch {
        return { available: false, reason: 'nvidia-smi not found' };
      }
    } catch (err) {
      return { available: false, error: err.message };
    }
  }

  /**
   * Start Tabby container
   */
  async start(options = {}) {
    const {
      model = this.config.model,
      useGpu = this.config.useGpu,
      port = this.config.port,
      dataDir = this.config.dataDir
    } = options;

    // Update config
    this.config = { model, useGpu, port, dataDir };

    // Check if already running
    if (this.status === 'running') {
      throw new Error('Tabby is already running');
    }

    // Check for existing container
    try {
      const existing = await this.docker.getContainer(TABBY_CONFIG.containerName);
      const info = await existing.inspect();

      if (info.State.Running) {
        this.container = existing;
        this.status = 'running';
        this.startHealthCheck();
        return { success: true, message: 'Attached to existing container' };
      } else {
        // Remove stopped container
        await existing.remove();
      }
    } catch {
      // Container doesn't exist, proceed
    }

    // Get model config
    const modelConfig = TABBY_MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }

    // Build container options
    const image = useGpu ? TABBY_CONFIG.gpuImage : `${TABBY_CONFIG.image}:${TABBY_CONFIG.defaultTag}`;

    const containerConfig = {
      Image: image,
      name: TABBY_CONFIG.containerName,
      Cmd: ['serve', '--model', modelConfig.id, '--device', useGpu ? 'cuda' : 'cpu'],
      ExposedPorts: {
        '8080/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '8080/tcp': [{ HostPort: String(port) }]
        },
        Binds: [
          `${dataDir}:/data`
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Labels: {
        'command-portal': 'true',
        'tabby-model': model
      }
    };

    // Add GPU support if requested
    if (useGpu) {
      containerConfig.HostConfig.DeviceRequests = [
        {
          Count: -1, // All GPUs
          Capabilities: [['gpu']]
        }
      ];
    }

    this.status = 'starting';
    this.emit('status', 'starting');

    try {
      // Create and start container
      this.container = await this.docker.createContainer(containerConfig);
      await this.container.start();

      // Wait for Tabby to be ready
      await this.waitForReady();

      this.status = 'running';
      this.emit('status', 'running');
      this.startHealthCheck();

      return {
        success: true,
        containerId: this.container.id.substring(0, 12),
        model,
        port,
        url: `http://localhost:${port}`
      };
    } catch (err) {
      this.status = 'error';
      this.emit('status', 'error');
      this.emit('error', err.message);
      throw err;
    }
  }

  /**
   * Wait for Tabby to be ready
   */
  async waitForReady(timeout = 120000) {
    const start = Date.now();
    const url = `http://localhost:${this.config.port}${TABBY_CONFIG.healthEndpoint}`;

    while (Date.now() - start < timeout) {
      try {
        const res = await fetch(url, { timeout: 5000 });
        if (res.ok) {
          return true;
        }
      } catch {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Tabby failed to start within timeout');
  }

  /**
   * Stop Tabby container
   */
  async stop() {
    if (!this.container) {
      return { success: true, message: 'No container running' };
    }

    this.stopHealthCheck();

    try {
      await this.container.stop({ t: 10 });
      await this.container.remove();
      this.container = null;
      this.status = 'stopped';
      this.emit('status', 'stopped');
      return { success: true };
    } catch (err) {
      this.emit('error', err.message);
      throw err;
    }
  }

  /**
   * Restart Tabby container
   */
  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.start(this.config);
  }

  /**
   * Get container status
   */
  async getStatus() {
    const status = {
      status: this.status,
      config: this.config,
      container: null,
      health: null,
      stats: this.stats
    };

    if (this.container) {
      try {
        const info = await this.container.inspect();
        status.container = {
          id: info.Id.substring(0, 12),
          name: info.Name,
          state: info.State.Status,
          running: info.State.Running,
          created: info.Created,
          started: info.State.StartedAt
        };

        // Get resource stats
        const containerStats = await this.container.stats({ stream: false });
        const cpuDelta = containerStats.cpu_stats.cpu_usage.total_usage - containerStats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = containerStats.cpu_stats.system_cpu_usage - containerStats.precpu_stats.system_cpu_usage;
        const cpuPercent = (cpuDelta / systemDelta) * containerStats.cpu_stats.online_cpus * 100;

        status.resources = {
          cpu: cpuPercent.toFixed(1) + '%',
          memory: Math.round(containerStats.memory_stats.usage / 1024 / 1024) + 'MB',
          memoryLimit: Math.round(containerStats.memory_stats.limit / 1024 / 1024) + 'MB'
        };
      } catch (err) {
        log.error({ error: err.message }, 'failed to get container info');
      }
    }

    // Check health
    if (this.status === 'running') {
      try {
        const res = await fetch(`http://localhost:${this.config.port}${TABBY_CONFIG.healthEndpoint}`);
        status.health = res.ok ? 'healthy' : 'unhealthy';
      } catch {
        status.health = 'unhealthy';
      }
    }

    return status;
  }

  /**
   * Get available models
   */
  getModels() {
    return TABBY_MODELS;
  }

  /**
   * Get container logs
   */
  async getLogs(tail = 100) {
    if (!this.container) {
      return [];
    }

    try {
      const logs = await this.container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true
      });

      return logs.toString().split('\n').filter(Boolean);
    } catch (err) {
      return [err.message];
    }
  }

  /**
   * Test code completion
   */
  async testCompletion(code = 'def hello_world():') {
    if (this.status !== 'running') {
      throw new Error('Tabby is not running');
    }

    const start = Date.now();

    try {
      const res = await fetch(`http://localhost:${this.config.port}${TABBY_CONFIG.completionsEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'python',
          segments: {
            prefix: code
          }
        })
      });

      const data = await res.json();
      const latency = Date.now() - start;

      // Update stats
      this.stats.requests++;
      this.stats.completions++;
      this.stats.lastRequest = new Date();
      this.stats.avgLatency = Math.round(
        (this.stats.avgLatency * (this.stats.requests - 1) + latency) / this.stats.requests
      );

      return {
        success: true,
        completion: data.choices?.[0]?.text || '',
        latency: latency + 'ms'
      };
    } catch (err) {
      this.stats.requests++;
      this.stats.errors++;
      throw err;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthCheck() {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${this.config.port}${TABBY_CONFIG.healthEndpoint}`);
        if (!res.ok && this.status === 'running') {
          this.emit('health', 'degraded');
        } else {
          this.emit('health', 'healthy');
        }
      } catch {
        if (this.status === 'running') {
          this.emit('health', 'unhealthy');
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop health monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Update model (requires restart)
   */
  async updateModel(model) {
    if (!TABBY_MODELS[model]) {
      throw new Error(`Unknown model: ${model}`);
    }

    this.config.model = model;

    if (this.status === 'running') {
      return await this.restart();
    }

    return { success: true, message: 'Model updated, start Tabby to apply' };
  }
}

// Singleton instance
export const tabbyManager = new TabbyManager();

export default tabbyManager;
