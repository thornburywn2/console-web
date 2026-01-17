/**
 * Commands Tab Component
 * Displays built-in and custom slash commands
 */

export default function CommandsTab({ commands }) {
  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">Built-in Commands</h3>
        <div className="space-y-2">
          {commands.builtin?.map((cmd) => (
            <div key={cmd.command} className="flex items-start gap-3 text-sm">
              <code className="px-2 py-0.5 bg-primary/20 text-primary rounded">{cmd.command}</code>
              <div>
                <div className="text-foreground">{cmd.description}</div>
                <div className="text-xs text-muted">{cmd.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {commands.custom?.length > 0 && (
        <div className="glass-panel p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3">Custom Commands</h3>
          <div className="space-y-2">
            {commands.custom.map((cmd) => (
              <div key={cmd.name} className="flex items-center justify-between text-sm">
                <code className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">{cmd.name}</code>
                <span className="text-xs text-muted truncate ml-2">{cmd.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
