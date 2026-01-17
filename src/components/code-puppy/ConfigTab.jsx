/**
 * Config Tab Component
 * Manages Code Puppy configuration settings
 */

import { useState } from 'react';
import ConfigItem from './ConfigItem';
import { CONFIG_TABS } from './constants';

export default function ConfigTab({ config, onUpdateConfig }) {
  const [configTab, setConfigTab] = useState('general');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        {CONFIG_TABS.map((tab) => (
          <button key={tab} onClick={() => setConfigTab(tab)}
            className={`px-3 py-1 rounded text-xs ${
              configTab === tab ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted'
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="glass-panel p-4 rounded-lg space-y-3">
        {configTab === 'general' && (
          <>
            <ConfigItem label="Default Model" value={config.model} onChange={(v) => onUpdateConfig('model', v)} />
            <ConfigItem label="Default Agent" value={config.default_agent} onChange={(v) => onUpdateConfig('default_agent', v)} />
            <ConfigItem label="Message Limit" value={config.message_limit} type="number" onChange={(v) => onUpdateConfig('message_limit', parseInt(v))} />
            <ConfigItem label="Auto Save Session" value={config.auto_save_session} type="checkbox" onChange={(v) => onUpdateConfig('auto_save_session', v)} />
          </>
        )}
        {configTab === 'safety' && (
          <>
            <ConfigItem label="YOLO Mode" value={config.yolo_mode} type="checkbox" onChange={(v) => onUpdateConfig('yolo_mode', v)} />
            <ConfigItem label="Allow Recursion" value={config.allow_recursion} type="checkbox" onChange={(v) => onUpdateConfig('allow_recursion', v)} />
            <ConfigItem label="Safety Permission Level" value={config.safety_permission_level} options={['ask', 'warn', 'allow']} onChange={(v) => onUpdateConfig('safety_permission_level', v)} />
          </>
        )}
        {configTab === 'display' && (
          <>
            <ConfigItem label="Diff Context Lines" value={config.diff_context_lines} type="number" onChange={(v) => onUpdateConfig('diff_context_lines', parseInt(v))} />
            <ConfigItem label="Highlight Addition Color" value={config.highlight_addition_color} type="color" onChange={(v) => onUpdateConfig('highlight_addition_color', v)} />
            <ConfigItem label="Highlight Deletion Color" value={config.highlight_deletion_color} type="color" onChange={(v) => onUpdateConfig('highlight_deletion_color', v)} />
            <ConfigItem label="Suppress Thinking" value={config.suppress_thinking_messages} type="checkbox" onChange={(v) => onUpdateConfig('suppress_thinking_messages', v)} />
            <ConfigItem label="Suppress Info" value={config.suppress_informational_messages} type="checkbox" onChange={(v) => onUpdateConfig('suppress_informational_messages', v)} />
          </>
        )}
        {configTab === 'advanced' && (
          <>
            <ConfigItem label="Enable DBOS" value={config.enable_dbos} type="checkbox" onChange={(v) => onUpdateConfig('enable_dbos', v)} />
            <ConfigItem label="Disable MCP" value={config.disable_mcp} type="checkbox" onChange={(v) => onUpdateConfig('disable_mcp', v)} />
            <ConfigItem label="HTTP/2" value={config.http2} type="checkbox" onChange={(v) => onUpdateConfig('http2', v)} />
            <ConfigItem label="Grep Output Verbose" value={config.grep_output_verbose} type="checkbox" onChange={(v) => onUpdateConfig('grep_output_verbose', v)} />
            <ConfigItem label="Subagent Verbose" value={config.subagent_verbose} type="checkbox" onChange={(v) => onUpdateConfig('subagent_verbose', v)} />
            <ConfigItem label="Compaction Strategy" value={config.compaction_strategy} options={['truncate', 'summarize']} onChange={(v) => onUpdateConfig('compaction_strategy', v)} />
            <ConfigItem label="Compaction Threshold" value={config.compaction_threshold} type="number" onChange={(v) => onUpdateConfig('compaction_threshold', parseInt(v))} />
            <ConfigItem label="Protected Token Count" value={config.protected_token_count} type="number" onChange={(v) => onUpdateConfig('protected_token_count', parseInt(v))} />
          </>
        )}
      </div>
    </div>
  );
}
