/**
 * MCPToolBrowser Component
 * Browse and test MCP tools across all servers
 */

import { useState, useEffect } from 'react';

export default function MCPToolBrowser({ servers }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [testArgs, setTestArgs] = useState('{}');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [filterServer, setFilterServer] = useState('all');

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/mcp/tools/all');
      if (!response.ok) throw new Error('Failed to fetch tools');
      const data = await response.json();
      setTools(data);
    } catch (err) {
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestTool = async () => {
    if (!selectedTool) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      let args = {};
      try {
        args = JSON.parse(testArgs);
      } catch {
        setTestResult({ error: 'Invalid JSON in arguments' });
        setTestLoading(false);
        return;
      }

      const response = await fetch(`/api/mcp/${selectedTool.serverId}/tools/${selectedTool.name}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args })
      });

      const data = await response.json();

      if (!response.ok) {
        setTestResult({ error: data.error || 'Tool call failed' });
      } else {
        setTestResult({ success: true, result: data.result });
      }
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  // Filter and search tools
  const filteredTools = tools.filter(tool => {
    const matchesSearch = !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesServer = filterServer === 'all' || tool.serverId === filterServer;

    return matchesSearch && matchesServer;
  });

  // Group tools by server
  const toolsByServer = filteredTools.reduce((acc, tool) => {
    const serverName = tool.server?.name || 'Unknown';
    if (!acc[serverName]) {
      acc[serverName] = [];
    }
    acc[serverName].push(tool);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-700/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterServer}
          onChange={(e) => setFilterServer(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Servers</option>
          {servers.map(server => (
            <option key={server.id} value={server.id}>{server.name}</option>
          ))}
        </select>
      </div>

      {/* Tools list */}
      {tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg font-medium">No tools discovered</p>
          <p className="text-sm mt-1">Start MCP servers and discover their tools</p>
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No tools match your search
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tools grouped by server */}
          <div className="space-y-4">
            {Object.entries(toolsByServer).map(([serverName, serverTools]) => (
              <div key={serverName}>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {serverName}
                  <span className="text-gray-600">({serverTools.length})</span>
                </h3>
                <div className="space-y-2">
                  {serverTools.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setSelectedTool(tool);
                        setTestArgs('{}');
                        setTestResult(null);
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedTool?.id === tool.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      <div className="font-medium text-gray-200 font-mono text-sm">
                        {tool.name}
                      </div>
                      {tool.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {tool.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tool details and tester */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            {selectedTool ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-100 font-mono">{selectedTool.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedTool.description || 'No description available'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Server: {selectedTool.server?.name}
                  </p>
                </div>

                {/* Input schema */}
                {selectedTool.inputSchema && Object.keys(selectedTool.inputSchema).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Input Schema</h4>
                    <pre className="p-3 bg-gray-900 rounded text-xs text-gray-400 overflow-auto max-h-32 font-mono">
                      {JSON.stringify(selectedTool.inputSchema, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Test tool */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Test Tool</h4>
                  <textarea
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleTestTool}
                    disabled={testLoading || !selectedTool.server?.enabled}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {testLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Run Tool
                      </>
                    )}
                  </button>
                </div>

                {/* Test result */}
                {testResult && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Result</h4>
                    {testResult.error ? (
                      <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                        {testResult.error}
                      </div>
                    ) : (
                      <pre className="p-3 bg-gray-900 rounded text-xs text-green-400 overflow-auto max-h-48 font-mono">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p>Select a tool to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
