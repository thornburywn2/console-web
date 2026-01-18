/**
 * AgentTreeView Component
 * Tree/DAG visualization of agents organized by project with execution relationships
 * Phase 3: Mission Control - Agent Observability
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agentsApi } from '../services/api.js';
import { useAgentSocket } from '../hooks/useAgentSocket.js';

// Status configuration
const STATUS_CONFIG = {
  RUNNING: { color: '#22c55e', bg: 'bg-green-500/20', icon: '▶', pulse: true },
  PENDING: { color: '#f59e0b', bg: 'bg-yellow-500/20', icon: '⏳', pulse: true },
  COMPLETED: { color: '#06b6d4', bg: 'bg-cyan-500/20', icon: '✓', pulse: false },
  FAILED: { color: '#ef4444', bg: 'bg-red-500/20', icon: '✗', pulse: false },
  CANCELLED: { color: '#6b7280', bg: 'bg-gray-500/20', icon: '⊘', pulse: false },
};

// Trigger type icons
const TRIGGER_ICONS = {
  MANUAL: '👆',
  FILE_CHANGE: '📄',
  GIT_PRE_COMMIT: '📝',
  GIT_POST_COMMIT: '✅',
  GIT_PRE_PUSH: '⬆️',
  SESSION_START: '🚀',
  SESSION_END: '🛑',
  SESSION_COMMAND_COMPLETE: '💻',
  SYSTEM_RESOURCE: '📊',
  SYSTEM_ALERT: '🚨',
};

// Tree node component
function TreeNode({ agent, level = 0, isLast = false, onSelect, isSelected, runningState }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = agent.childExecutions?.length > 0;
  const isRunning = runningState || agent.executions?.some(e => e.status === 'RUNNING' || e.status === 'PENDING');
  const latestExecution = agent.executions?.[0];
  const status = isRunning ? 'RUNNING' : (latestExecution?.status || 'COMPLETED');
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLETED;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-hacker-cyan/20' : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(agent)}
      >
        {/* Expand/collapse for nodes with children */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-4 h-4 flex items-center justify-center text-[10px] text-hacker-text-dim hover:text-hacker-text"
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Status indicator */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: config.color }}
        />

        {/* Trigger icon */}
        <span className="text-xs">{TRIGGER_ICONS[agent.triggerType] || '⚡'}</span>

        {/* Agent name */}
        <span className="font-mono text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
          {agent.name}
        </span>

        {/* Status badge */}
        {isRunning && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
            LIVE
          </span>
        )}

        {/* Enabled indicator */}
        {!agent.enabled && (
          <span className="text-[9px] font-mono text-hacker-text-dim">OFF</span>
        )}
      </div>

      {/* Child executions (for DAG view) */}
      {expanded && hasChildren && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-hacker-border"
            style={{ left: `${level * 16 + 16}px` }}
          />
          {agent.childExecutions.map((child, index) => (
            <TreeNode
              key={child.id}
              agent={child}
              level={level + 1}
              isLast={index === agent.childExecutions.length - 1}
              onSelect={onSelect}
              isSelected={isSelected && child.id === agent.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Project group component
function ProjectGroup({ project, agents, onSelectAgent, selectedAgentId, runningAgents }) {
  const [expanded, setExpanded] = useState(true);
  const runningCount = agents.filter(a =>
    runningAgents.some(r => r.agentId === a.id) ||
    a.executions?.some(e => e.status === 'RUNNING' || e.status === 'PENDING')
  ).length;

  return (
    <div className="mb-2">
      {/* Project header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
      >
        <span className="text-[10px] text-hacker-text-dim">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="text-sm">📁</span>
        <span className="font-mono text-xs text-hacker-text flex-1 text-left truncate">
          {project?.name || 'Global Agents'}
        </span>
        <span className="text-[10px] font-mono text-hacker-text-dim">
          {agents.length}
        </span>
        {runningCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {runningCount}
          </span>
        )}
      </button>

      {/* Agents in project */}
      {expanded && (
        <div className="ml-2 border-l border-hacker-border/30">
          {agents.map((agent) => (
            <TreeNode
              key={agent.id}
              agent={agent}
              level={0}
              onSelect={onSelectAgent}
              isSelected={selectedAgentId === agent.id}
              runningState={runningAgents.find(r => r.agentId === agent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentTreeView({ onSelectAgent, selectedAgentId, compact = false }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('project'); // 'project' | 'status' | 'flat'
  const [filter, setFilter] = useState('all'); // 'all' | 'running' | 'enabled'

  // Real-time updates
  const { runningAgents, isConnected } = useAgentSocket();

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentsApi.list();
      const agentList = Array.isArray(data) ? data : (data.agents || []);
      setAgents(agentList);
      setError(null);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // Group agents by project
  const groupedByProject = useMemo(() => {
    const groups = new Map();

    // Filter agents
    let filtered = agents;
    if (filter === 'running') {
      filtered = agents.filter(a =>
        runningAgents.some(r => r.agentId === a.id) ||
        a.executions?.some(e => e.status === 'RUNNING' || e.status === 'PENDING')
      );
    } else if (filter === 'enabled') {
      filtered = agents.filter(a => a.enabled);
    }

    // Group by project
    filtered.forEach(agent => {
      const key = agent.projectId || '__global__';
      if (!groups.has(key)) {
        groups.set(key, {
          project: agent.project || null,
          agents: []
        });
      }
      groups.get(key).agents.push(agent);
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Global agents last
      if (!a.project) return 1;
      if (!b.project) return -1;
      return (a.project.name || '').localeCompare(b.project.name || '');
    });
  }, [agents, runningAgents, filter]);

  // Group by status
  const groupedByStatus = useMemo(() => {
    const running = [];
    const idle = [];

    agents.forEach(agent => {
      const isRunning = runningAgents.some(r => r.agentId === agent.id) ||
        agent.executions?.some(e => e.status === 'RUNNING' || e.status === 'PENDING');
      if (isRunning) {
        running.push(agent);
      } else {
        idle.push(agent);
      }
    });

    return { running, idle };
  }, [agents, runningAgents]);

  // Stats
  const stats = useMemo(() => ({
    total: agents.length,
    enabled: agents.filter(a => a.enabled).length,
    running: runningAgents.length,
  }), [agents, runningAgents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-hacker-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 font-mono text-sm mb-2">{error}</p>
        <button onClick={fetchAgents} className="text-sm text-hacker-cyan hover:underline font-mono">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-hacker-border/30">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌳</span>
          <span className="font-mono text-xs text-hacker-text-dim">Agent Tree</span>
          {isConnected && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Real-time connected" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          {['project', 'status', 'flat'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                viewMode === mode
                  ? 'bg-hacker-cyan/30 text-hacker-cyan'
                  : 'text-hacker-text-dim hover:text-hacker-text'
              }`}
              title={mode === 'project' ? 'Group by project' : mode === 'status' ? 'Group by status' : 'Flat list'}
            >
              {mode === 'project' ? '📁' : mode === 'status' ? '⚡' : '≡'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-2 py-1 text-[10px] font-mono border-b border-hacker-border/20">
        <span className="text-hacker-text-dim">{stats.total} total</span>
        <span className="text-hacker-text-dim">{stats.enabled} enabled</span>
        {stats.running > 0 && (
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {stats.running} running
          </span>
        )}
        {/* Filter dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-auto bg-transparent text-hacker-text-dim text-[10px] font-mono border-none focus:outline-none cursor-pointer"
        >
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="enabled">Enabled</option>
        </select>
      </div>

      {/* Tree content */}
      <div className={`overflow-y-auto ${compact ? 'flex-1' : 'max-h-96'}`}>
        {viewMode === 'project' && (
          groupedByProject.length === 0 ? (
            <div className="p-4 text-center text-hacker-text-dim font-mono text-xs">
              No agents found
            </div>
          ) : (
            groupedByProject.map((group, index) => (
              <ProjectGroup
                key={group.project?.id || '__global__'}
                project={group.project}
                agents={group.agents}
                onSelectAgent={onSelectAgent}
                selectedAgentId={selectedAgentId}
                runningAgents={runningAgents}
              />
            ))
          )
        )}

        {viewMode === 'status' && (
          <>
            {groupedByStatus.running.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Running ({groupedByStatus.running.length})
                </div>
                <div className="ml-2 border-l border-green-500/30">
                  {groupedByStatus.running.map((agent) => (
                    <TreeNode
                      key={agent.id}
                      agent={agent}
                      onSelect={onSelectAgent}
                      isSelected={selectedAgentId === agent.id}
                      runningState={runningAgents.find(r => r.agentId === agent.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {groupedByStatus.idle.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-hacker-text-dim">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  Idle ({groupedByStatus.idle.length})
                </div>
                <div className="ml-2 border-l border-hacker-border/30">
                  {groupedByStatus.idle.map((agent) => (
                    <TreeNode
                      key={agent.id}
                      agent={agent}
                      onSelect={onSelectAgent}
                      isSelected={selectedAgentId === agent.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === 'flat' && (
          <div className="p-1">
            {agents.length === 0 ? (
              <div className="p-4 text-center text-hacker-text-dim font-mono text-xs">
                No agents found
              </div>
            ) : (
              agents
                .filter(a => {
                  if (filter === 'running') return runningAgents.some(r => r.agentId === a.id);
                  if (filter === 'enabled') return a.enabled;
                  return true;
                })
                .map((agent) => (
                  <TreeNode
                    key={agent.id}
                    agent={agent}
                    onSelect={onSelectAgent}
                    isSelected={selectedAgentId === agent.id}
                    runningState={runningAgents.find(r => r.agentId === agent.id)}
                  />
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
