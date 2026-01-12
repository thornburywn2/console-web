/**
 * Persona Selector Component
 * AI persona selection for pre-configured system prompts
 */

import { useState, useRef, useEffect } from 'react';

// Built-in AI personas
const BUILT_IN_PERSONAS = [
  {
    id: 'default',
    name: 'Default Claude',
    description: 'Standard Claude assistant',
    icon: '🤖',
    systemPrompt: '',
    isBuiltIn: true,
  },
  {
    id: 'code-expert',
    name: 'Code Expert',
    description: 'Senior developer focused on clean code and best practices',
    icon: '👨‍💻',
    systemPrompt: 'You are a senior software developer with 15+ years of experience. Focus on clean code, SOLID principles, proper error handling, and thorough testing. Always suggest best practices and point out potential issues.',
    isBuiltIn: true,
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    description: 'Infrastructure, CI/CD, and deployment expert',
    icon: '🛠️',
    systemPrompt: 'You are a DevOps engineer specializing in CI/CD pipelines, containerization, infrastructure as code, and cloud services. Focus on automation, scalability, and reliability.',
    isBuiltIn: true,
  },
  {
    id: 'security',
    name: 'Security Analyst',
    description: 'Focus on security best practices and vulnerability analysis',
    icon: '🔒',
    systemPrompt: 'You are a cybersecurity expert. Analyze all code and configurations for security vulnerabilities, suggest secure alternatives, and explain potential attack vectors. Follow OWASP guidelines.',
    isBuiltIn: true,
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Thorough code review with constructive feedback',
    icon: '🔍',
    systemPrompt: 'You are conducting a thorough code review. Check for bugs, code smells, performance issues, and adherence to best practices. Provide constructive feedback with specific suggestions for improvement.',
    isBuiltIn: true,
  },
  {
    id: 'architect',
    name: 'System Architect',
    description: 'High-level design and architecture decisions',
    icon: '🏗️',
    systemPrompt: 'You are a system architect focusing on high-level design decisions. Consider scalability, maintainability, and future growth. Suggest appropriate patterns, technologies, and architectural approaches.',
    isBuiltIn: true,
  },
  {
    id: 'debugger',
    name: 'Debug Detective',
    description: 'Specialized in finding and fixing bugs',
    icon: '🔧',
    systemPrompt: 'You are a debugging specialist. Methodically analyze issues, trace through code flow, identify root causes, and suggest targeted fixes. Ask clarifying questions to narrow down problems.',
    isBuiltIn: true,
  },
  {
    id: 'teacher',
    name: 'Patient Teacher',
    description: 'Explains concepts clearly with examples',
    icon: '📚',
    systemPrompt: 'You are a patient teacher who explains programming concepts clearly. Use analogies, provide examples, and break down complex topics into understandable pieces. Encourage questions.',
    isBuiltIn: true,
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Concise responses, less is more',
    icon: '✨',
    systemPrompt: 'You value brevity. Give concise, direct answers without unnecessary explanation. Use bullet points and code snippets. Only elaborate when asked.',
    isBuiltIn: true,
  },
  {
    id: 'pair-programmer',
    name: 'Pair Programmer',
    description: 'Collaborative coding partner',
    icon: '👥',
    systemPrompt: 'You are a pair programming partner. Think out loud, discuss approaches before implementing, and actively collaborate on solutions. Ask for input and validate assumptions.',
    isBuiltIn: true,
  },
];

export default function PersonaSelector({
  selectedPersona,
  onSelectPersona,
  customPersonas = [],
  onManagePersonas,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const allPersonas = [...BUILT_IN_PERSONAS, ...customPersonas];
  const currentPersona = allPersonas.find(p => p.id === selectedPersona) || BUILT_IN_PERSONAS[0];

  // Filter personas
  const filteredPersonas = allPersonas.filter(persona =>
    searchQuery === '' ||
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle persona selection
  const handleSelect = (persona) => {
    onSelectPersona?.(persona);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
          title={currentPersona.name}
        >
          <span className="text-lg">{currentPersona.icon}</span>
          <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {allPersonas.map(persona => (
                <button
                  key={persona.id}
                  onClick={() => handleSelect(persona)}
                  className={`w-full text-left p-2 flex items-center gap-2 hover:bg-white/5 transition-colors ${
                    persona.id === selectedPersona ? 'bg-accent/10' : ''
                  }`}
                >
                  <span>{persona.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{persona.name}</div>
                    <div className="text-2xs text-muted truncate">{persona.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Persona Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span className="text-xl">{currentPersona.icon}</span>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-primary truncate">{currentPersona.name}</div>
          <div className="text-2xs text-muted truncate">{currentPersona.description}</div>
        </div>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search personas..."
                className="w-full pl-8 pr-3 py-1.5 rounded text-xs"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Persona List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredPersonas.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No personas found
              </div>
            ) : (
              <>
                {/* Built-in Personas */}
                {filteredPersonas.filter(p => p.isBuiltIn).length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted" style={{ background: 'var(--bg-tertiary)' }}>
                      Built-in
                    </div>
                    {filteredPersonas.filter(p => p.isBuiltIn).map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => handleSelect(persona)}
                        className={`w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors ${
                          persona.id === selectedPersona ? 'bg-accent/10' : ''
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{persona.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary">{persona.name}</div>
                          <div className="text-xs text-secondary mt-0.5">{persona.description}</div>
                        </div>
                        {persona.id === selectedPersona && (
                          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Personas */}
                {filteredPersonas.filter(p => !p.isBuiltIn).length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted" style={{ background: 'var(--bg-tertiary)' }}>
                      Custom
                    </div>
                    {filteredPersonas.filter(p => !p.isBuiltIn).map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => handleSelect(persona)}
                        className={`w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors ${
                          persona.id === selectedPersona ? 'bg-accent/10' : ''
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{persona.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary">{persona.name}</div>
                          <div className="text-xs text-secondary mt-0.5">{persona.description}</div>
                        </div>
                        {persona.id === selectedPersona && (
                          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {onManagePersonas && (
            <div className="p-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManagePersonas();
                }}
                className="w-full text-center text-xs text-accent hover:underline py-1"
              >
                + Manage Custom Personas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export built-in personas for use in other components
export { BUILT_IN_PERSONAS };
