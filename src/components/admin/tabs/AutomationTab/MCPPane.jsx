/**
 * MCPPane Component
 * MCP Server management using the MCPServerManager component
 */

import MCPServerManager from '../../../MCPServerManager';

export function MCPPane() {
  return (
    <div className="space-y-6 animate-fade-in">
      <MCPServerManager />
    </div>
  );
}

export default MCPPane;
