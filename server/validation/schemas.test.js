/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  paginationSchema,
  searchSchema,
  sessionSchema,
  sessionUpdateSchema,
  folderSchema,
  tagSchema,
  promptSchema,
  snippetSchema,
  agentSchema,
  noteSchema,
  templateSchema,
  alertSchema,
  workflowSchema,
  gitCommitSchema,
  gitBranchSchema,
  dockerContainerActionSchema,
  dockerExecSchema,
  filePathSchema,
  fileWriteSchema,
  serviceNameSchema,
  serviceActionSchema,
  firewallRuleSchema,
  mcpServerSchema,
  settingsUpdateSchema,
} from './schemas.js';

describe('Validation Schemas', () => {
  // ==========================================================================
  // UUID Schema
  // ==========================================================================
  describe('uuidSchema', () => {
    it('should accept valid UUID', () => {
      const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Pagination Schema
  // ==========================================================================
  describe('paginationSchema', () => {
    it('should accept valid pagination', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20, order: 'desc' });
    });

    it('should use defaults for missing values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20, order: 'desc' });
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.safeParse({ page: '2', limit: '50' });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(2);
      expect(result.data?.limit).toBe(50);
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Session Schema
  // ==========================================================================
  describe('sessionSchema', () => {
    it('should accept valid session with sp- prefix', () => {
      const result = sessionSchema.safeParse({
        name: 'sp-my-session',
      });
      expect(result.success).toBe(true);
    });

    it('should accept session with optional fields', () => {
      const result = sessionSchema.safeParse({
        name: 'sp-test_session-123',
        workingDirectory: '/home/user/Projects',
        terminalCols: 120,
        terminalRows: 40,
      });
      expect(result.success).toBe(true);
    });

    it('should reject session without sp- prefix', () => {
      const result = sessionSchema.safeParse({
        name: 'my-session',
      });
      expect(result.success).toBe(false);
    });

    it('should reject session with special characters', () => {
      const result = sessionSchema.safeParse({
        name: 'sp-my session!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 4 characters', () => {
      const result = sessionSchema.safeParse({
        name: 'sp-',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Folder Schema
  // ==========================================================================
  describe('folderSchema', () => {
    it('should accept valid folder', () => {
      const result = folderSchema.safeParse({
        name: 'My Folder',
      });
      expect(result.success).toBe(true);
    });

    it('should accept folder with all fields', () => {
      const result = folderSchema.safeParse({
        name: 'Projects',
        icon: 'folder',
        color: '#3B82F6',
        sortOrder: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex color', () => {
      const result = folderSchema.safeParse({
        name: 'Test',
        color: 'blue',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = folderSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Prompt Schema
  // ==========================================================================
  describe('promptSchema', () => {
    it('should accept valid prompt', () => {
      const result = promptSchema.safeParse({
        title: 'Test Prompt',
        content: 'This is the prompt content',
      });
      expect(result.success).toBe(true);
    });

    it('should accept prompt with all fields', () => {
      const result = promptSchema.safeParse({
        title: 'Code Review',
        content: 'Review this code for bugs',
        category: 'development',
        tags: ['review', 'code'],
        isPublic: true,
        isFavorite: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject prompt without title', () => {
      const result = promptSchema.safeParse({
        content: 'Content only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject prompt without content', () => {
      const result = promptSchema.safeParse({
        title: 'Title only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many tags', () => {
      const result = promptSchema.safeParse({
        title: 'Test',
        content: 'Content',
        tags: Array(21).fill('tag'),
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Snippet Schema
  // ==========================================================================
  describe('snippetSchema', () => {
    it('should accept valid snippet', () => {
      const result = snippetSchema.safeParse({
        title: 'Git Status',
        command: 'git status',
      });
      expect(result.success).toBe(true);
    });

    it('should accept snippet with optional fields', () => {
      const result = snippetSchema.safeParse({
        title: 'Docker Restart',
        command: 'docker restart mycontainer',
        description: 'Restart the main container',
        category: 'docker',
        tags: ['docker', 'restart'],
        shortcut: 'ctrl+d',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty command', () => {
      const result = snippetSchema.safeParse({
        title: 'Test',
        command: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Agent Schema
  // ==========================================================================
  describe('agentSchema', () => {
    it('should accept valid agent', () => {
      const result = agentSchema.safeParse({
        name: 'Build Agent',
        trigger: 'manual',
        actions: [{ type: 'run_command' }],
      });
      expect(result.success).toBe(true);
    });

    it('should accept all trigger types', () => {
      const triggers = ['manual', 'schedule', 'file_change', 'git_event', 'session_event', 'webhook'];
      triggers.forEach((trigger) => {
        const result = agentSchema.safeParse({
          name: 'Test',
          trigger,
          actions: [{ type: 'test' }],
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid trigger type', () => {
      const result = agentSchema.safeParse({
        name: 'Test',
        trigger: 'invalid_trigger',
        actions: [{ type: 'test' }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty actions array', () => {
      const result = agentSchema.safeParse({
        name: 'Test',
        trigger: 'manual',
        actions: [],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Alert Schema
  // ==========================================================================
  describe('alertSchema', () => {
    it('should accept valid alert', () => {
      const result = alertSchema.safeParse({
        name: 'High CPU Alert',
        metric: 'cpu_usage',
        condition: 'gt',
        threshold: 80,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all condition types', () => {
      const conditions = ['gt', 'lt', 'eq', 'gte', 'lte', 'ne'];
      conditions.forEach((condition) => {
        const result = alertSchema.safeParse({
          name: 'Test',
          metric: 'test',
          condition,
          threshold: 50,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid condition', () => {
      const result = alertSchema.safeParse({
        name: 'Test',
        metric: 'test',
        condition: 'invalid',
        threshold: 50,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Git Schemas
  // ==========================================================================
  describe('gitCommitSchema', () => {
    it('should accept valid commit', () => {
      const result = gitCommitSchema.safeParse({
        message: 'feat: add new feature',
      });
      expect(result.success).toBe(true);
    });

    it('should accept commit with files', () => {
      const result = gitCommitSchema.safeParse({
        message: 'fix: bug fix',
        files: ['src/app.js', 'package.json'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = gitCommitSchema.safeParse({
        message: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gitBranchSchema', () => {
    it('should accept valid branch name', () => {
      const result = gitBranchSchema.safeParse({
        name: 'feature/new-feature',
      });
      expect(result.success).toBe(true);
    });

    it('should accept branch with from', () => {
      const result = gitBranchSchema.safeParse({
        name: 'feature/test',
        from: 'main',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid branch characters', () => {
      const result = gitBranchSchema.safeParse({
        name: 'feature with spaces',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Docker Schemas
  // ==========================================================================
  describe('dockerContainerActionSchema', () => {
    it('should accept valid actions', () => {
      const actions = ['start', 'stop', 'restart', 'pause', 'unpause', 'kill'];
      actions.forEach((action) => {
        const result = dockerContainerActionSchema.safeParse({ action });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid action', () => {
      const result = dockerContainerActionSchema.safeParse({
        action: 'delete',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('dockerExecSchema', () => {
    it('should accept valid exec command', () => {
      const result = dockerExecSchema.safeParse({
        cmd: ['ls', '-la'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty command array', () => {
      const result = dockerExecSchema.safeParse({
        cmd: [],
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // File Schemas
  // ==========================================================================
  describe('filePathSchema', () => {
    it('should accept valid path', () => {
      const result = filePathSchema.safeParse({
        path: '/home/user/file.txt',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty path', () => {
      const result = filePathSchema.safeParse({
        path: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('fileWriteSchema', () => {
    it('should accept valid file write', () => {
      const result = fileWriteSchema.safeParse({
        path: '/home/user/file.txt',
        content: 'Hello, World!',
      });
      expect(result.success).toBe(true);
    });

    it('should accept base64 encoding', () => {
      const result = fileWriteSchema.safeParse({
        path: '/tmp/file.bin',
        content: 'SGVsbG8=',
        encoding: 'base64',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid encoding', () => {
      const result = fileWriteSchema.safeParse({
        path: '/tmp/file.txt',
        content: 'test',
        encoding: 'ascii',
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Service Schemas
  // ==========================================================================
  describe('serviceNameSchema', () => {
    it('should accept valid service names', () => {
      const names = ['nginx', 'docker', 'ssh.service', 'my_service-1', '@user.service'];
      names.forEach((name) => {
        const result = serviceNameSchema.safeParse({ name });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid characters', () => {
      const result = serviceNameSchema.safeParse({
        name: 'service with spaces',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('serviceActionSchema', () => {
    it('should accept valid actions', () => {
      const actions = ['start', 'stop', 'restart', 'enable', 'disable'];
      actions.forEach((action) => {
        const result = serviceActionSchema.safeParse({ action });
        expect(result.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Firewall Schema
  // ==========================================================================
  describe('firewallRuleSchema', () => {
    it('should accept valid firewall rule', () => {
      const result = firewallRuleSchema.safeParse({
        port: 80,
      });
      expect(result.success).toBe(true);
    });

    it('should accept full firewall rule', () => {
      const result = firewallRuleSchema.safeParse({
        port: 443,
        protocol: 'tcp',
        direction: 'in',
        action: 'allow',
        from: '192.168.1.0/24',
        comment: 'HTTPS traffic',
      });
      expect(result.success).toBe(true);
    });

    it('should reject port 0', () => {
      const result = firewallRuleSchema.safeParse({
        port: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject port above 65535', () => {
      const result = firewallRuleSchema.safeParse({
        port: 70000,
      });
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // MCP Schema
  // ==========================================================================
  describe('mcpServerSchema', () => {
    it('should accept valid MCP server', () => {
      const result = mcpServerSchema.safeParse({
        name: 'filesystem',
        command: 'npx',
      });
      expect(result.success).toBe(true);
    });

    it('should accept full MCP server config', () => {
      const result = mcpServerSchema.safeParse({
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        enabled: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Settings Schema
  // ==========================================================================
  describe('settingsUpdateSchema', () => {
    it('should accept valid settings', () => {
      const result = settingsUpdateSchema.safeParse({
        theme: 'dark',
        terminalFontSize: 14,
        notificationsEnabled: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty update', () => {
      const result = settingsUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject font size too small', () => {
      const result = settingsUpdateSchema.safeParse({
        terminalFontSize: 4,
      });
      expect(result.success).toBe(false);
    });

    it('should reject font size too large', () => {
      const result = settingsUpdateSchema.safeParse({
        terminalFontSize: 50,
      });
      expect(result.success).toBe(false);
    });
  });
});
