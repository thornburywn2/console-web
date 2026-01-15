/**
 * Setup Wizard Component
 * Beautiful first-time setup experience with feature selection
 */

import { useState, useEffect, useCallback } from 'react';

// Feature definitions with dependencies
const FEATURES = {
  github: {
    id: 'github',
    name: 'GitHub Integration',
    description: 'Repository management, clone, push, and CI/CD status',
    icon: '🐙',
    color: '#a855f7',
    category: 'integrations',
    defaultEnabled: true,
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Tunnels',
    description: 'One-click publish to the web with automatic DNS',
    icon: '☁️',
    color: '#f97316',
    category: 'integrations',
    defaultEnabled: true,
  },
  docker: {
    id: 'docker',
    name: 'Docker Management',
    description: 'Container lifecycle, images, volumes, and logs',
    icon: '🐳',
    color: '#3b82f6',
    category: 'infrastructure',
    defaultEnabled: true,
  },
  systemd: {
    id: 'systemd',
    name: 'System Services',
    description: 'Systemd service control and monitoring',
    icon: '⚙️',
    color: '#22c55e',
    category: 'infrastructure',
    defaultEnabled: true,
  },
  security: {
    id: 'security',
    name: 'Security Scanning',
    description: 'Pre-push hooks, secret detection, vulnerability scanning',
    icon: '🛡️',
    color: '#ef4444',
    category: 'tools',
    defaultEnabled: true,
  },
  agents: {
    id: 'agents',
    name: 'AI Agents & Marketplace',
    description: 'Automation agents and pre-built marketplace',
    icon: '🤖',
    color: '#8b5cf6',
    category: 'tools',
    defaultEnabled: true,
  },
  mcp: {
    id: 'mcp',
    name: 'MCP Server Catalog',
    description: 'Claude Code MCP server management',
    icon: '🧩',
    color: '#06b6d4',
    category: 'tools',
    defaultEnabled: true,
  },
  voice: {
    id: 'voice',
    name: 'Voice Commands',
    description: 'Speech recognition for hands-free control',
    icon: '🎤',
    color: '#ec4899',
    category: 'experimental',
    defaultEnabled: false,
  },
};

// Widget presets based on feature selection
const WIDGET_PRESETS = {
  minimal: {
    name: 'Minimal',
    description: 'Essential widgets only',
    widgets: ['system', 'projects', 'sessions'],
  },
  developer: {
    name: 'Developer',
    description: 'Focus on development workflows',
    widgets: ['system', 'projects', 'projectInfo', 'github', 'sessions'],
  },
  devops: {
    name: 'DevOps',
    description: 'Full infrastructure control',
    widgets: ['system', 'projects', 'projectInfo', 'github', 'cloudflare', 'docker', 'ports', 'sessions'],
  },
  custom: {
    name: 'Custom',
    description: 'Choose your own widgets',
    widgets: [],
  },
};

// Theme options
const THEMES = [
  { id: 'default', name: 'Emerald Dark', preview: 'linear-gradient(135deg, #0a0c14 0%, #10b981 100%)' },
  { id: 'light', name: 'Light', preview: 'linear-gradient(135deg, #f8f9fb 0%, #0d9488 100%)' },
  { id: 'ocean', name: 'Ocean', preview: 'linear-gradient(135deg, #0c1929 0%, #0891b2 100%)' },
  { id: 'cyberpunk', name: 'Cyberpunk', preview: 'linear-gradient(135deg, #0f1419 0%, #22d3ee 100%)' },
  { id: 'dracula', name: 'Dracula', preview: 'linear-gradient(135deg, #282a36 0%, #bd93f9 100%)' },
  { id: 'nord', name: 'Nord', preview: 'linear-gradient(135deg, #2e3440 0%, #88c0d0 100%)' },
];

const STORAGE_KEY = 'cw-setup-completed';
const FEATURES_KEY = 'cw-enabled-features';
const WIDGET_PRESET_KEY = 'cw-widget-preset';

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all duration-300 ${
              index < currentStep
                ? 'bg-accent text-black'
                : index === currentStep
                ? 'bg-accent/20 text-accent border-2 border-accent'
                : 'bg-white/5 text-muted border border-white/10'
            }`}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 transition-colors duration-300 ${
                index < currentStep ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ feature, enabled, onToggle }) {
  return (
    <button
      onClick={() => onToggle(feature.id)}
      className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
        enabled
          ? 'ring-2 ring-accent bg-accent/10'
          : 'bg-white/5 hover:bg-white/10 border border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${feature.color}20` }}
        >
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-primary">{feature.name}</h4>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                enabled ? 'bg-accent border-accent' : 'border-white/30'
              }`}
            >
              {enabled && (
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
          <p className="text-xs text-muted mt-1">{feature.description}</p>
        </div>
      </div>
    </button>
  );
}

function PresetCard({ preset, presetKey, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(presetKey)}
      className={`p-4 rounded-xl text-left transition-all duration-200 ${
        selected
          ? 'ring-2 ring-accent bg-accent/10'
          : 'bg-white/5 hover:bg-white/10 border border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-primary">{preset.name}</h4>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? 'bg-accent border-accent' : 'border-white/30'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{preset.description}</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {preset.widgets.slice(0, 5).map((w) => (
          <span
            key={w}
            className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-secondary font-mono"
          >
            {w}
          </span>
        ))}
        {preset.widgets.length > 5 && (
          <span className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-muted font-mono">
            +{preset.widgets.length - 5}
          </span>
        )}
      </div>
    </button>
  );
}

function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`p-3 rounded-xl text-center transition-all duration-200 ${
        selected
          ? 'ring-2 ring-accent'
          : 'border border-white/10 hover:border-white/20'
      }`}
    >
      <div
        className="w-full h-16 rounded-lg mb-2"
        style={{ background: theme.preview }}
      />
      <span className="text-sm text-primary font-medium">{theme.name}</span>
    </button>
  );
}

export default function SetupWizard({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [enabledFeatures, setEnabledFeatures] = useState(() => {
    // Initialize with defaults
    const defaults = {};
    Object.values(FEATURES).forEach((f) => {
      defaults[f.id] = f.defaultEnabled;
    });
    return defaults;
  });
  const [selectedPreset, setSelectedPreset] = useState('devops');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'features', title: 'Features' },
    { id: 'widgets', title: 'Layout' },
    { id: 'theme', title: 'Theme' },
    { id: 'complete', title: 'Ready' },
  ];

  const toggleFeature = useCallback((featureId) => {
    setEnabledFeatures((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s - 1);
        setIsAnimating(false);
      }, 150);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    // Save preferences
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(FEATURES_KEY, JSON.stringify(enabledFeatures));
    localStorage.setItem(WIDGET_PRESET_KEY, selectedPreset);
    localStorage.setItem('tour-completed', 'true');

    // Apply theme
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('cw-theme', JSON.stringify({ theme: selectedTheme }));

    // Apply widget preset
    if (selectedPreset !== 'custom') {
      const preset = WIDGET_PRESETS[selectedPreset];
      const widgets = preset.widgets.map((type, idx) => ({
        id: `${type}-${idx + 1}`,
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
      }));
      localStorage.setItem('sidebar-widgets', JSON.stringify({ widgets }));
    }

    onComplete?.();
  }, [enabledFeatures, selectedPreset, selectedTheme, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem('tour-completed', 'true');
    onSkip?.();
  }, [onSkip]);

  const featuresByCategory = {
    integrations: Object.values(FEATURES).filter((f) => f.category === 'integrations'),
    infrastructure: Object.values(FEATURES).filter((f) => f.category === 'infrastructure'),
    tools: Object.values(FEATURES).filter((f) => f.category === 'tools'),
    experimental: Object.values(FEATURES).filter((f) => f.category === 'experimental'),
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 90%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
            var(--bg-base, #0a0c14)
          `,
        }}
      />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-accent/30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden transition-opacity duration-150 ${
          isAnimating ? 'opacity-50' : 'opacity-100'
        }`}
        style={{
          background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 0 100px rgba(16, 185, 129, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-8 py-6 text-center"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={handleSkip}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Skip Setup →
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
              <span className="text-xl font-mono font-bold text-accent">{'>'}_</span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Console.web</h1>
          </div>
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/20 mb-4">
                <span className="text-5xl">🚀</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">Welcome to Console.web</h2>
              <p className="text-lg text-secondary max-w-xl mx-auto">
                Your unified development operations platform. Let's personalize your experience in just a few steps.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto pt-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-xs text-muted">Persistent Sessions</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl mb-2">🔧</div>
                  <div className="text-xs text-muted">Infrastructure Control</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-xs text-muted">AI-Powered</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Features */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary mb-2">Choose Your Features</h2>
                <p className="text-sm text-muted">
                  Select the integrations and tools you want enabled. You can change these later in Settings.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
                    Integrations
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {featuresByCategory.integrations.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        enabled={enabledFeatures[feature.id]}
                        onToggle={toggleFeature}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
                    Infrastructure
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {featuresByCategory.infrastructure.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        enabled={enabledFeatures[feature.id]}
                        onToggle={toggleFeature}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
                    Tools
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {featuresByCategory.tools.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        enabled={enabledFeatures[feature.id]}
                        onToggle={toggleFeature}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
                    Experimental
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {featuresByCategory.experimental.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        enabled={enabledFeatures[feature.id]}
                        onToggle={toggleFeature}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Widget Layout */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary mb-2">Sidebar Layout</h2>
                <p className="text-sm text-muted">
                  Choose a widget preset for your right sidebar. You can customize further after setup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(WIDGET_PRESETS).map(([key, preset]) => (
                  <PresetCard
                    key={key}
                    presetKey={key}
                    preset={preset}
                    selected={selectedPreset === key}
                    onSelect={setSelectedPreset}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Theme */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary mb-2">Choose Your Theme</h2>
                <p className="text-sm text-muted">
                  Select a color scheme that suits your style. More themes available in Settings.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {THEMES.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    selected={selectedTheme === theme.id}
                    onSelect={setSelectedTheme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/20 mb-4">
                <span className="text-5xl">✨</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">You're All Set!</h2>
              <p className="text-lg text-secondary max-w-xl mx-auto">
                Your workspace is configured and ready to go. Here's what we've set up:
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {Object.values(enabledFeatures).filter(Boolean).length}
                  </div>
                  <div className="text-xs text-muted">Features Enabled</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {WIDGET_PRESETS[selectedPreset]?.widgets.length || 'Custom'}
                  </div>
                  <div className="text-xs text-muted">Widgets</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {THEMES.find((t) => t.id === selectedTheme)?.name}
                  </div>
                  <div className="text-xs text-muted">Theme</div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-xs text-muted">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-primary">Ctrl+,</kbd> anytime to open Settings
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <div className="text-xs text-muted font-mono">
            Step {currentStep + 1} of {steps.length}
          </div>

          <button
            onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
            className="px-6 py-2 text-sm font-semibold rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Launch Console.web' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to check if setup is needed
export function useSetupWizard() {
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay for smoother UX
      const timer = setTimeout(() => setShowSetup(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = useCallback(() => {
    setShowSetup(false);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FEATURES_KEY);
    localStorage.removeItem(WIDGET_PRESET_KEY);
    localStorage.removeItem('tour-completed');
    setShowSetup(true);
  }, []);

  return {
    showSetup,
    complete,
    reset,
    isCompleted: !!localStorage.getItem(STORAGE_KEY),
  };
}

// Get enabled features
export function getEnabledFeatures() {
  try {
    const stored = localStorage.getItem(FEATURES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
