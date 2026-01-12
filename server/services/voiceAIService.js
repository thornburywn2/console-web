/**
 * Voice AI Service - AI-Enhanced Context Parsing
 * P0 Phase 5: AI-Enhanced Context-Aware Parsing
 *
 * Uses Claude AI to intelligently parse voice commands with context awareness.
 * Features:
 * - Context-aware command interpretation
 * - Multi-turn conversation support
 * - Project-specific command suggestions
 * - Intent disambiguation using AI
 * - Natural language to structured command conversion
 */

import Anthropic from '@anthropic-ai/sdk';

// System prompt for voice command parsing
const VOICE_PARSER_SYSTEM_PROMPT = `You are a voice command parser for a development terminal called "Console.web". Your job is to interpret natural language voice commands and convert them into structured actions.

Available command categories:
1. TERMINAL - Commands to run in the terminal (npm, git, shell commands)
2. GIT - Git operations (commit, push, pull, branch, etc.)
3. NAVIGATION - Navigate to different views (projects, admin, settings)
4. UI - Toggle UI elements (sidebar, themes, fullscreen)
5. SESSION - Manage terminal sessions (new, save, close, rename)
6. CLAUDE - Send queries to Claude Code AI assistant

Response format (JSON):
{
  "action": "action-name",
  "type": "terminal|git|navigation|ui|session|claude",
  "command": "the actual command to execute (for terminal/git types)",
  "route": "/path" (for navigation types),
  "parameters": { ... } (any additional parameters),
  "confidence": 0.0-1.0,
  "explanation": "brief explanation of interpretation",
  "alternatives": [ ... ] (other possible interpretations if ambiguous)
}

Context variables available:
- currentProject: The currently selected project
- currentBranch: Current git branch
- recentCommands: Recent terminal commands
- sessionHistory: Recent voice commands

IMPORTANT RULES:
1. Always return valid JSON
2. For ambiguous commands, provide alternatives
3. Consider the project context when interpreting
4. Be conservative with destructive commands (delete, reset, force)
5. For git commits, ensure message makes sense
6. If you're not sure, ask for clarification in the explanation`;

class VoiceAIService {
  constructor() {
    this.client = null;
    this.conversationHistory = new Map(); // sessionId -> messages[]
    this.maxHistoryLength = 10;
  }

  /**
   * Initialize the AI client
   */
  initialize() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set - AI voice parsing disabled');
      return false;
    }

    this.client = new Anthropic({ apiKey });
    return true;
  }

  /**
   * Check if AI service is available
   */
  isAvailable() {
    return !!this.client;
  }

  /**
   * Parse a voice command using AI
   * @param {string} transcript - The voice transcript
   * @param {Object} context - Current context
   */
  async parseCommand(transcript, context = {}) {
    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    const {
      sessionId,
      currentProject,
      currentBranch,
      recentCommands = [],
      recentVoiceCommands = [],
      projectFiles = []
    } = context;

    // Build context message
    const contextMessage = this.buildContextMessage(context);

    // Get conversation history for this session
    const history = this.getSessionHistory(sessionId);

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Fast model for real-time parsing
        max_tokens: 500,
        system: VOICE_PARSER_SYSTEM_PROMPT,
        messages: [
          ...history,
          {
            role: 'user',
            content: `Context:\n${contextMessage}\n\nVoice command to parse:\n"${transcript}"`
          }
        ]
      });

      const assistantMessage = response.content[0].text;

      // Update conversation history
      this.addToHistory(sessionId, 'user', transcript);
      this.addToHistory(sessionId, 'assistant', assistantMessage);

      // Parse the JSON response
      const parsed = this.parseAIResponse(assistantMessage, transcript);

      return {
        success: true,
        parsed,
        rawResponse: assistantMessage
      };
    } catch (error) {
      console.error('AI parsing error:', error);
      throw error;
    }
  }

  /**
   * Build context message for AI
   */
  buildContextMessage(context) {
    const parts = [];

    if (context.currentProject) {
      parts.push(`Current project: ${context.currentProject}`);
    }

    if (context.currentBranch) {
      parts.push(`Current git branch: ${context.currentBranch}`);
    }

    if (context.recentCommands?.length > 0) {
      parts.push(`Recent terminal commands:\n${context.recentCommands.slice(-5).map(c => `  - ${c}`).join('\n')}`);
    }

    if (context.recentVoiceCommands?.length > 0) {
      parts.push(`Recent voice commands:\n${context.recentVoiceCommands.slice(-5).map(c => `  - ${c}`).join('\n')}`);
    }

    if (context.projectFiles?.length > 0) {
      parts.push(`Project files (sample):\n${context.projectFiles.slice(0, 10).map(f => `  - ${f}`).join('\n')}`);
    }

    return parts.join('\n\n') || 'No additional context available.';
  }

  /**
   * Parse AI response into structured command
   */
  parseAIResponse(response, originalTranscript) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Ensure required fields
        return {
          action: parsed.action || 'unknown',
          type: parsed.type || 'terminal',
          command: parsed.command || null,
          route: parsed.route || null,
          parameters: parsed.parameters || {},
          confidence: parsed.confidence || 0.8,
          explanation: parsed.explanation || '',
          alternatives: parsed.alternatives || [],
          needsDisambiguation: (parsed.alternatives?.length > 0 && parsed.confidence < 0.7),
          aiParsed: true
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    // Fallback: return as passthrough to Claude
    return {
      action: 'passthrough',
      type: 'claude',
      command: originalTranscript,
      confidence: 0.5,
      explanation: 'Unable to parse structured command - passing to Claude Code',
      alternatives: [],
      needsDisambiguation: false,
      aiParsed: false
    };
  }

  /**
   * Get session conversation history
   */
  getSessionHistory(sessionId) {
    if (!sessionId) return [];
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Add message to session history
   */
  addToHistory(sessionId, role, content) {
    if (!sessionId) return;

    let history = this.conversationHistory.get(sessionId) || [];
    history.push({ role, content });

    // Trim history to max length
    if (history.length > this.maxHistoryLength * 2) {
      history = history.slice(-this.maxHistoryLength * 2);
    }

    this.conversationHistory.set(sessionId, history);
  }

  /**
   * Clear session history
   */
  clearHistory(sessionId) {
    if (sessionId) {
      this.conversationHistory.delete(sessionId);
    } else {
      this.conversationHistory.clear();
    }
  }

  /**
   * Generate command suggestions based on context
   */
  async suggestCommands(context = {}) {
    if (!this.client) {
      return [];
    }

    const {
      currentProject,
      currentBranch,
      recentCommands = [],
      lastError
    } = context;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Based on this development context, suggest 5 useful voice commands:

Project: ${currentProject || 'unknown'}
Branch: ${currentBranch || 'unknown'}
Recent commands: ${recentCommands.slice(-3).join(', ') || 'none'}
Last error: ${lastError || 'none'}

Return a JSON array of suggestions:
[
  {
    "phrase": "suggested voice command",
    "description": "what it does",
    "priority": "high|medium|low"
  }
]`
        }]
      });

      const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Suggestion generation error:', error);
    }

    return [];
  }

  /**
   * Disambiguate between multiple command interpretations
   */
  async disambiguate(transcript, alternatives, context = {}) {
    if (!this.client) {
      return alternatives[0] || null;
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Given this voice command and context, which interpretation is most likely?

Voice command: "${transcript}"
Project: ${context.currentProject || 'unknown'}
Recent activity: ${context.recentCommands?.slice(-3).join(', ') || 'none'}

Possible interpretations:
${alternatives.map((a, i) => `${i + 1}. ${a.action}: ${a.description || a.command}`).join('\n')}

Respond with just the number (1, 2, 3, etc.) of the most likely interpretation.`
        }]
      });

      const choice = parseInt(response.content[0].text.trim());
      if (choice >= 1 && choice <= alternatives.length) {
        return alternatives[choice - 1];
      }
    } catch (error) {
      console.error('Disambiguation error:', error);
    }

    return alternatives[0] || null;
  }

  /**
   * Process multi-turn voice conversation
   * Useful for complex commands that require clarification
   */
  async continueConversation(sessionId, userMessage, context = {}) {
    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    const history = this.getSessionHistory(sessionId);

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        system: `${VOICE_PARSER_SYSTEM_PROMPT}

You are in a multi-turn conversation to clarify a voice command.
Ask clarifying questions if needed, or provide the final parsed command when ready.`,
        messages: [
          ...history,
          { role: 'user', content: userMessage }
        ]
      });

      const assistantMessage = response.content[0].text;

      this.addToHistory(sessionId, 'user', userMessage);
      this.addToHistory(sessionId, 'assistant', assistantMessage);

      // Check if response contains a final command
      const hasCommand = assistantMessage.includes('"action"');

      return {
        message: assistantMessage,
        isComplete: hasCommand,
        parsed: hasCommand ? this.parseAIResponse(assistantMessage, userMessage) : null
      };
    } catch (error) {
      console.error('Conversation error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const voiceAIService = new VoiceAIService();

export default voiceAIService;
