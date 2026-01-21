/**
 * GeneralPane Component
 * General settings including app branding, session settings, and AI preferences
 */

import { CATEGORIES } from './constants';

export default function GeneralPane({ settings, onSave, setActiveCategory }) {
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider">General Settings</h4>

      {/* Application Branding */}
      <div className="p-4 rounded bg-[var(--bg-surface)] border border-hacker-purple/30 space-y-4">
        <h5 className="text-xs font-mono text-hacker-purple uppercase">Application Branding</h5>
        <div className="space-y-2">
          <label className="text-sm text-hacker-text">Application Name</label>
          <input
            type="text"
            value={settings.appName || 'Command Portal'}
            onChange={(e) => onSave({ appName: e.target.value })}
            placeholder="Command Portal"
            maxLength={50}
            className="input-glass font-mono"
          />
          <p className="text-xs text-hacker-text-dim">The name displayed in the header and browser title. Refreshing the page applies the change.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto Reconnect */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoReconnect}
              onChange={(e) => onSave({ autoReconnect: e.target.checked })}
              className="checkbox-glass"
            />
            <span className="text-sm text-hacker-text">Auto-reconnect sessions</span>
          </label>
          <p className="text-xs text-hacker-text-dim ml-7">Automatically reconnect to terminal sessions on page load</p>
        </div>

        {/* Keep Sessions Alive */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.keepSessionsAlive}
              onChange={(e) => onSave({ keepSessionsAlive: e.target.checked })}
              className="checkbox-glass"
            />
            <span className="text-sm text-hacker-text">Keep sessions alive</span>
          </label>
          <p className="text-xs text-hacker-text-dim ml-7">Keep tmux sessions running when disconnected</p>
        </div>

        {/* Session Timeout */}
        <div className="space-y-2">
          <label className="text-sm text-hacker-text">Session Timeout (seconds)</label>
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => onSave({ sessionTimeout: parseInt(e.target.value) || 3600 })}
            min={60}
            max={86400}
            className="input-glass font-mono"
          />
          <p className="text-xs text-hacker-text-dim">Time before idle sessions are marked as disconnected</p>
        </div>

        {/* Sidebar Width */}
        <div className="space-y-2">
          <label className="text-sm text-hacker-text">Sidebar Width (pixels)</label>
          <input
            type="number"
            value={settings.sidebarWidth}
            onChange={(e) => onSave({ sidebarWidth: parseInt(e.target.value) || 280 })}
            min={200}
            max={500}
            className="input-glass font-mono"
          />
        </div>

        {/* Right Sidebar Collapsed */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.rightSidebarCollapsed}
              onChange={(e) => onSave({ rightSidebarCollapsed: e.target.checked })}
              className="checkbox-glass"
            />
            <span className="text-sm text-hacker-text">Collapse right sidebar by default</span>
          </label>
        </div>
      </div>

      {/* AI Solution Preference Section */}
      <div className="mt-8 pt-6 border-t border-hacker-green/20">
        <h4 className="text-sm font-semibold text-hacker-cyan uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🤖</span> AI Coding Assistant
        </h4>
        <div className="space-y-4">
          {/* Preferred AI Solution */}
          <div className="space-y-2">
            <label className="text-sm text-hacker-text font-medium">Preferred AI Solution</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'claude-code', label: 'Claude Code', icon: '💻', description: 'Official Anthropic CLI' },
                { value: 'opencode', label: 'OpenCode', icon: '🌐', description: 'Open source, multi-provider' },
                { value: 'code-puppy', label: 'Code Puppy', icon: '🐕', description: 'Open source alternative' },
                { value: 'hybrid', label: 'Hybrid Mode', icon: '🔀', description: 'Code Puppy + Claude tools' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex flex-col p-3 rounded border cursor-pointer transition-all
                    ${settings.preferredAISolution === option.value
                      ? 'border-hacker-cyan bg-hacker-cyan/10'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-surface)]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="aiSolution"
                      value={option.value}
                      checked={settings.preferredAISolution === option.value}
                      onChange={(e) => onSave({ preferredAISolution: e.target.value })}
                      className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                    />
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-sm font-medium text-hacker-text">{option.label}</span>
                  </div>
                  <p className="text-xs text-hacker-text-dim mt-1 ml-6">{option.description}</p>
                </label>
              ))}
            </div>
            <p className="text-xs text-hacker-text-dim mt-2">
              This determines which AI assistant launches when you open a project terminal.
              Existing sessions will continue using their original AI solution.
            </p>
          </div>

          {/* OpenCode specific settings */}
          {settings.preferredAISolution === 'opencode' && (
            <div className="ml-6 p-4 bg-[var(--bg-surface)] border border-hacker-cyan/20 rounded space-y-4">
              <h5 className="text-xs font-semibold text-hacker-text uppercase tracking-wider flex items-center gap-2">
                <span>🌐</span> OpenCode Settings
              </h5>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">AI Provider</label>
                <select
                  value={settings.openCodeProvider || 'anthropic'}
                  onChange={(e) => onSave({ openCodeProvider: e.target.value })}
                  className="input-glass font-mono"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="local">Local Models</option>
                </select>
                <p className="text-xs text-hacker-text-dim">
                  OpenCode supports multiple AI providers - choose your preferred one
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Model (optional)</label>
                <input
                  type="text"
                  value={settings.openCodeModel || ''}
                  onChange={(e) => onSave({ openCodeModel: e.target.value || null })}
                  placeholder="e.g., claude-sonnet-4-20250514, gpt-4o"
                  className="input-glass font-mono"
                />
                <p className="text-xs text-hacker-text-dim">
                  Leave blank to use the provider's default model. Format: model-name or provider/model
                </p>
              </div>

              {/* Info box */}
              <div className="p-3 bg-hacker-cyan/10 border border-hacker-cyan/30 rounded text-xs">
                <p className="font-medium text-hacker-cyan mb-2">About OpenCode</p>
                <ul className="list-disc list-inside space-y-1 text-hacker-text-dim">
                  <li>Open-source AI coding agent (MIT licensed)</li>
                  <li>Two built-in agents: Build (full access) &amp; Plan (read-only)</li>
                  <li>LSP support and client/server architecture</li>
                  <li>Press Tab to switch between agents in the TUI</li>
                </ul>
              </div>
            </div>
          )}

          {/* Code Puppy specific settings */}
          {(settings.preferredAISolution === 'code-puppy' || settings.preferredAISolution === 'hybrid') && (
            <div className="ml-6 p-4 bg-[var(--bg-surface)] border border-hacker-green/20 rounded space-y-4">
              <h5 className="text-xs font-semibold text-hacker-text uppercase tracking-wider flex items-center gap-2">
                <span>🐕</span> Code Puppy Settings
              </h5>

              {/* Default Provider */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Default Provider</label>
                <select
                  value={settings.codePuppyProvider || 'anthropic'}
                  onChange={(e) => onSave({ codePuppyProvider: e.target.value })}
                  className="input-glass font-mono"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="cerebras">Cerebras</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              {/* Default Model */}
              <div className="space-y-2">
                <label className="text-sm text-hacker-text">Default Model (optional)</label>
                <input
                  type="text"
                  value={settings.codePuppyModel || ''}
                  onChange={(e) => onSave({ codePuppyModel: e.target.value || null })}
                  placeholder="e.g., claude-sonnet-4-20250514, gpt-4o"
                  className="input-glass font-mono"
                />
                <p className="text-xs text-hacker-text-dim">
                  Leave blank to use the provider's default model
                </p>
              </div>

              {/* Hybrid Mode Options */}
              {settings.preferredAISolution === 'hybrid' && (
                <div className="space-y-2 pt-4 border-t border-hacker-green/20">
                  <label className="text-sm text-hacker-text">Hybrid Mode Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hybridMode"
                        value="code-puppy-with-claude-tools"
                        checked={settings.hybridMode === 'code-puppy-with-claude-tools'}
                        onChange={(e) => onSave({ hybridMode: e.target.value })}
                        className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                      />
                      <span className="text-sm text-hacker-text">Code Puppy with Claude's MCP Servers</span>
                    </label>
                    <p className="text-xs text-hacker-text-dim ml-6">
                      Run Code Puppy but sync and use Claude Code's MCP server configuration
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input
                        type="radio"
                        name="hybridMode"
                        value="claude-with-puppy-agents"
                        checked={settings.hybridMode === 'claude-with-puppy-agents'}
                        onChange={(e) => onSave({ hybridMode: e.target.value })}
                        className="w-4 h-4 text-hacker-cyan focus:ring-hacker-cyan"
                      />
                      <span className="text-sm text-hacker-text">Claude Code with Code Puppy Agents</span>
                    </label>
                    <p className="text-xs text-hacker-text-dim ml-6">
                      Run Claude Code with access to invoke Code Puppy custom agents
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick action: Open Code Puppy Dashboard */}
          {(settings.preferredAISolution === 'code-puppy' || settings.preferredAISolution === 'hybrid') && (
            <div className="flex items-center gap-3">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'code_puppy' }));
                }}
                className="hacker-btn text-sm"
              >
                Open Code Puppy Dashboard →
              </a>
              <span className="text-xs text-hacker-text-dim">
                Configure agents, MCP servers, and more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Experimental Features Section */}
      <div className="mt-8 pt-6 border-t border-hacker-green/20">
        <h4 className="text-sm font-semibold text-hacker-warning uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🧪</span> Experimental Features
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showExperimentalFeatures || false}
                onChange={(e) => onSave({ showExperimentalFeatures: e.target.checked })}
                className="checkbox-glass"
              />
              <span className="text-sm text-hacker-text">Show experimental features</span>
            </label>
            <p className="text-xs text-hacker-text-dim ml-7">
              Enable experimental tabs in the Admin Dashboard (Tabby, Swarm). These features may be incomplete or require external dependencies.
            </p>
          </div>
          {settings.showExperimentalFeatures && (
            <div className="ml-7 p-3 bg-hacker-warning/10 border border-hacker-warning/30 rounded text-xs text-hacker-text-dim">
              <p className="font-medium text-hacker-warning mb-2">Experimental tabs enabled:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>TABBY</strong> - Tabby code completion (requires Docker + tabbyml/tabby image)</li>
                <li><strong>SWARM</strong> - Claude Flow multi-agent swarms (awaiting @anthropics/claude-flow release)</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
