/**
 * Route Index
 * Exports all route modules for easy import in main server
 */

export { createFoldersRouter } from './folders.js';
export { createPromptsRouter } from './prompts.js';
export { createSnippetsRouter } from './snippets.js';
export { createThemesRouter } from './themes.js';
export { createAlertsRouter } from './alerts.js';
export { createAgentsRouter } from './agents.js';
export { createSearchRouter } from './search.js';
export { createNotesRouter } from './notes.js';
export { createTemplatesRouter } from './templates.js';
export { createSessionsRouter } from './sessions.js';
export { createAIRouter } from './ai.js';
export { createFilesRouter, createLogsRouter, createDiffRouter, createExportRouter, createImportRouter } from './files.js';
export { createGitRouter } from './git.js';
export { createBackupsRouter } from './backups.js';
export { createShareRouter, createActivityRouter, createCommentsRouter, createTeamRouter, createHandoffRouter } from './collaboration.js';
export { createMetricsRouter, createUptimeRouter, createNetworkRouter, createCostRouter } from './monitoring.js';
export { createPortsRouter, createEnvRouter, createDbBrowserRouter, createProxyRouter } from './devtools.js';
export { createMCPRouter } from './mcp.js';
export { createContextsRouter } from './contexts.js';
export { createCheckpointsRouter } from './checkpoints.js';
export { createGithubRouter } from './github.js';
export { createCloudflareRouter } from './cloudflare.js';
export { createMemoryRouter } from './memory.js';
export { createPlansRouter } from './plans.js';
export { createBrowserRouter } from './browser.js';
export { createShortcutsRouter } from './shortcuts.js';
export { createLifecycleRouter } from './lifecycle.js';
export { createMarketplaceRouter } from './marketplace.js';
export { createVoiceRouter } from './voice.js';
export { createAiderRouter } from './aider.js';
export { createTabbyRouter } from './tabby.js';
export { createClaudeFlowRouter } from './claudeFlow.js';
export { createInfrastructureRouter } from './infrastructure.js';
export { createUsersFirewallRouter } from './usersFirewall.js';
export { createProjectTemplatesRouter } from './projectTemplates.js';
export { createDependenciesRouter } from './dependencies.js';
export { createCodePuppyRouter } from './codePuppy.js';
export { createSystemRouter } from './system.js';
export { createProjectTagsRouter } from './project-tags.js';
export { createObservabilityRouter } from './observability.js';
