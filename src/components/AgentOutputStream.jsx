/**
 * AgentOutputStream Component
 * Real-time streaming output viewer for agent executions
 * Shows live output via Socket.IO with auto-scroll
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export default function AgentOutputStream({ agentId, socket }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentExecution, setCurrentExecution] = useState(null);
  const outputRef = useRef(null);
  const lastScrollTop = useRef(0);

  // Handle socket events for this agent
  // Server emits 'agent:status' for state changes and 'agent:output' for output streaming
  useEffect(() => {
    if (!socket || !agentId) return;

    // Handle output streaming from agent execution
    const handleAgentOutput = (data) => {
      if (data.agentId === agentId) {
        setOutput(prev => prev + data.output);
        setIsRunning(true);
        if (data.executionId) {
          setCurrentExecution(data.executionId);
        }
      }
    };

    // Handle status changes (started, completed, failed, etc.)
    const handleAgentStatus = (data) => {
      if (data.agentId === agentId) {
        switch (data.status) {
          case 'running':
          case 'started':
            setOutput(''); // Clear previous output on new run
            setIsRunning(true);
            if (data.executionId) {
              setCurrentExecution(data.executionId);
            }
            break;
          case 'completed':
          case 'success':
            setIsRunning(false);
            break;
          case 'failed':
          case 'error':
            if (data.error) {
              setOutput(prev => prev + `\n[ERROR] ${data.error}\n`);
            }
            setIsRunning(false);
            break;
          case 'stopped':
            setIsRunning(false);
            break;
          default:
            // Handle any other status
            break;
        }
      }
    };

    socket.on('agent:output', handleAgentOutput);
    socket.on('agent:status', handleAgentStatus);

    return () => {
      socket.off('agent:output', handleAgentOutput);
      socket.off('agent:status', handleAgentStatus);
    };
  }, [socket, agentId]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!outputRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    // If user scrolled up, disable auto-scroll
    if (scrollTop < lastScrollTop.current && !isAtBottom) {
      setAutoScroll(false);
    }
    // If user scrolled to bottom, re-enable auto-scroll
    else if (isAtBottom) {
      setAutoScroll(true);
    }

    lastScrollTop.current = scrollTop;
  }, []);

  const clearOutput = () => {
    setOutput('');
    setCurrentExecution(null);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-output-${agentId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-400">Running</span>
              </>
            ) : output ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-400">Complete</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                <span className="text-sm text-gray-400">Idle</span>
              </>
            )}
          </div>

          {currentExecution && (
            <span className="text-xs text-gray-500 font-mono">
              {currentExecution.slice(0, 8)}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded transition-colors ${
              autoScroll
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            disabled={!output}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy to clipboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Download button */}
          <button
            onClick={downloadOutput}
            disabled={!output}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download output"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Clear button */}
          <button
            onClick={clearOutput}
            disabled={!output && !isRunning}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear output"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 mt-3 bg-gray-900 rounded-lg overflow-auto font-mono text-sm"
        style={{ minHeight: '300px', maxHeight: '500px' }}
      >
        {output ? (
          <pre className="p-4 text-gray-300 whitespace-pre-wrap break-words">
            {output}
            {isRunning && (
              <span className="inline-flex items-center ml-1">
                <span className="animate-pulse">|</span>
              </span>
            )}
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            {isRunning ? (
              <>
                <svg className="w-8 h-8 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Starting agent...</span>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>No output yet</span>
                <span className="text-xs mt-1">Run the agent to see output here</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      {output && (
        <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
          <span>{output.split('\n').length} lines</span>
          <span>{(output.length / 1024).toFixed(2)} KB</span>
        </div>
      )}
    </div>
  );
}
