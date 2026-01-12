/**
 * AgentMarketplace Component
 * Browse and install pre-configured AI agents from the catalog
 * Categories: Code Quality, Git Workflow, Security, Testing, Documentation, DevOps, Productivity
 *
 * Uses hacker theme to match Console.web styling
 */

import { useState, useEffect, useCallback } from 'react';
import AgentCard from './AgentCard';
import AgentConfigModal from './AgentConfigModal';

// Category icons using Lucide-style SVGs
const CATEGORY_ICONS = {
  'code-quality': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'git-workflow': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  'security': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  'testing': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  'documentation': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'devops': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  'productivity': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
};

// Trigger type display names
const TRIGGER_LABELS = {
  'FILE_CHANGE': 'On File Change',
  'GIT_PRE_COMMIT': 'Pre-Commit',
  'GIT_POST_COMMIT': 'Post-Commit',
  'GIT_PRE_PUSH': 'Pre-Push',
  'GIT_POST_MERGE': 'Post-Merge',
  'GIT_POST_CHECKOUT': 'Post-Checkout',
  'SESSION_START': 'Session Start',
  'SESSION_END': 'Session End',
  'MANUAL': 'Manual'
};

export default function AgentMarketplace({ onInstall, onClose, projects = [] }) {
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch catalog data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [agentsRes, categoriesRes, statsRes] = await Promise.all([
          fetch('/api/marketplace/agents'),
          fetch('/api/marketplace/categories'),
          fetch('/api/marketplace/stats')
        ]);

        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setAgents(data);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (err) {
        setError('Failed to load marketplace');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter agents based on category and search
  const filteredAgents = agents.filter(agent => {
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Install an agent from catalog
  const handleInstall = async (agent, config) => {
    setInstalling(agent.id);
    setError(null);

    try {
      const response = await fetch(`/api/marketplace/agents/${agent.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state to show as installed
        setAgents(prev => prev.map(a =>
          a.id === agent.id ? { ...a, isInstalled: true } : a
        ));
        setSelectedAgent(null);
        if (onInstall) onInstall(result.agent);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to install agent');
      }
    } catch (err) {
      setError('Failed to install agent');
      console.error(err);
    } finally {
      setInstalling(null);
    }
  };

  // Uninstall an agent
  const handleUninstall = async (agentId) => {
    try {
      const response = await fetch(`/api/marketplace/agents/${agentId}/uninstall`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, isInstalled: false } : a
        ));
      }
    } catch (err) {
      console.error('Failed to uninstall agent:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hacker-green"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-hacker-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-hacker-border">
        <div>
          <h2 className="text-xl font-semibold text-hacker-green font-mono uppercase tracking-wider">
            {'>'} AI_AGENT_MARKETPLACE
          </h2>
          <p className="text-sm text-hacker-text-dim mt-1 font-mono">
            Discover and install automation agents for your workflow
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-hacker-text-dim hover:text-hacker-green hover:bg-hacker-surface rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Banner */}
      {stats && (
        <div className="flex items-center gap-6 px-4 py-3 bg-hacker-surface/50 border-b border-hacker-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-hacker-cyan font-mono">{stats.totalAgents}</span>
            <span className="text-sm text-hacker-text-dim font-mono">Agents</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-hacker-green font-mono">{stats.installedCount}</span>
            <span className="text-sm text-hacker-text-dim font-mono">Installed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-hacker-purple font-mono">{stats.totalCategories}</span>
            <span className="text-sm text-hacker-text-dim font-mono">Categories</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-hacker-border">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hacker-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="w-full pl-10 pr-4 py-2 bg-hacker-surface border border-hacker-border rounded-lg text-hacker-text placeholder-hacker-text-dim focus:outline-none focus:border-hacker-green/50 font-mono"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-mono ${
              selectedCategory === 'all'
                ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/30'
                : 'bg-hacker-surface text-hacker-text-dim border border-hacker-border hover:border-hacker-green/30'
            }`}
          >
            All ({agents.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-mono ${
                selectedCategory === cat.id
                  ? 'bg-hacker-green/20 text-hacker-green border border-hacker-green/30'
                  : 'bg-hacker-surface text-hacker-text-dim border border-hacker-border hover:border-hacker-green/30'
              }`}
            >
              {CATEGORY_ICONS[cat.id]}
              {cat.name} ({cat.agentCount})
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-hacker-error/10 border border-hacker-error/30 rounded-lg text-hacker-error text-sm font-mono">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Agent Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-hacker-text-dim mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-hacker-text-dim font-mono">No agents found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                categoryIcon={CATEGORY_ICONS[agent.category]}
                triggerLabels={TRIGGER_LABELS}
                isInstalling={installing === agent.id}
                onSelect={() => setSelectedAgent(agent)}
                onUninstall={() => handleUninstall(agent.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Config Modal */}
      {selectedAgent && (
        <AgentConfigModal
          agent={selectedAgent}
          triggerLabels={TRIGGER_LABELS}
          projects={projects}
          isInstalling={installing === selectedAgent.id}
          onInstall={(config) => handleInstall(selectedAgent, config)}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
