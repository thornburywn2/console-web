/**
 * CreateProjectModal Component
 * Extensive project creation wizard with AI-powered suggestions
 *
 * Features:
 * - Initial prompt analysis for template suggestions
 * - Categorized template browser
 * - Smart defaults based on template
 * - Optional features selection
 * - Integration setup (GitHub, Cloudflare, Firewall)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { githubExtendedApi, cloudflareApi, firewallApi, projectsExtendedApi } from '../services/api.js';
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  STEPS,
  OPTIONAL_FEATURES,
  findTemplatesByKeywords,
  generateProjectName,
  generateDescription,
  StepIndicator,
  Toggle,
  InputField,
  TemplateCard,
  SummaryItem,
} from './create-project';

// Icons
const Icons = {
  sparkle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  cloud: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

/**
 * Suggested Template Card - shown when prompt matches
 */
function SuggestedTemplate({ template, selected, onSelect, matchScore }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={`
        relative w-full text-left p-4 rounded-xl border-2 transition-all
        ${selected
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
          : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 bg-[var(--bg-tertiary)]'
        }
      `}
    >
      {/* Match badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold
                      bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
        SUGGESTED
      </div>

      <div className="flex items-start gap-3">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text-primary)]">{template.name}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{template.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.stack?.slice(0, 4).map(tech => (
              <span key={tech} className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Category Filter Tabs
 */
function CategoryTabs({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`
          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${selected === null
            ? 'bg-[var(--accent-primary)] text-white'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
          }
        `}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
            ${selected === cat.id
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
            }
          `}
        >
          <span>{cat.icon}</span>
          {cat.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Compact Template Grid Item
 */
function TemplateGridItem({ template, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={`
        relative p-3 rounded-xl border transition-all text-left
        ${selected
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-2 ring-[var(--accent-primary)]/20'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-tertiary)]/50'
        }
      `}
    >
      {template.recommended && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
          <span className="text-white text-[10px]">★</span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{template.icon}</span>
        <span className="font-medium text-sm text-[var(--text-primary)] truncate">{template.name}</span>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{template.description}</p>
    </button>
  );
}

/**
 * Feature Toggle Chip
 */
function FeatureChip({ feature, enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(feature.id)}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left
        ${enabled
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-tertiary)]'
        }
      `}
    >
      <div className={`
        w-4 h-4 rounded border flex items-center justify-center
        ${enabled
          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
          : 'border-[var(--border-default)]'
        }
      `}>
        {enabled && <span className="text-white text-xs">✓</span>}
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{feature.name}</div>
        <div className="text-[10px] text-[var(--text-muted)]">{feature.description}</div>
      </div>
    </button>
  );
}

/**
 * Main CreateProjectModal Component
 */
export default function CreateProjectModal({ initialPrompt = '', onClose, onCreated }) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Idea step
  const [ideaPrompt, setIdeaPrompt] = useState(initialPrompt);

  // Template step
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Details step
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [port, setPort] = useState('');
  const [enabledFeatures, setEnabledFeatures] = useState(['docker', 'ci', 'testing', 'linting']);

  // Integrations step
  const [initGit, setInitGit] = useState(true);
  const [createGitHubRepo, setCreateGitHubRepo] = useState(false);
  const [repoVisibility, setRepoVisibility] = useState('private');
  const [addToFirewall, setAddToFirewall] = useState(true);
  const [publishToCloudflare, setPublishToCloudflare] = useState(false);
  const [subdomain, setSubdomain] = useState('');

  // Integration availability
  const [githubAvailable, setGithubAvailable] = useState(false);
  const [cloudflareAvailable, setCloudflareAvailable] = useState(false);

  // Status
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [creationStatus, setCreationStatus] = useState({});

  // Check integrations on mount
  useEffect(() => {
    const checkIntegrations = async () => {
      try {
        const [ghData, cfData] = await Promise.all([
          githubExtendedApi.getSettings().catch(() => ({})),
          cloudflareApi.getSettings().catch(() => ({})),
        ]);
        setGithubAvailable(!!ghData.authenticated);
        setCloudflareAvailable(!!cfData.configured);
      } catch (err) {
        console.error('Error checking integrations:', err.getUserMessage?.() || err.message);
      }
    };
    checkIntegrations();
  }, []);

  // Find suggested templates based on prompt
  const suggestedTemplates = useMemo(() => {
    return findTemplatesByKeywords(ideaPrompt).slice(0, 3);
  }, [ideaPrompt]);

  // Get selected template data
  const selectedTemplateData = useMemo(() => {
    return TEMPLATES.find(t => t.id === selectedTemplate);
  }, [selectedTemplate]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (!categoryFilter) return TEMPLATES;
    return TEMPLATES.filter(t => t.category === categoryFilter);
  }, [categoryFilter]);

  // Auto-fill details when template changes
  useEffect(() => {
    if (selectedTemplateData) {
      // Set default port from template
      if (selectedTemplateData.defaultPort && !port) {
        setPort(String(selectedTemplateData.defaultPort));
      }

      // Generate name and description from prompt if not set
      if (!projectName && ideaPrompt) {
        setProjectName(generateProjectName(ideaPrompt));
      }
      if (!projectDescription && ideaPrompt) {
        setProjectDescription(generateDescription(ideaPrompt, selectedTemplateData));
      }
    }
  }, [selectedTemplateData]);

  // Auto-generate subdomain from project name
  useEffect(() => {
    if (projectName && !subdomain) {
      setSubdomain(projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  }, [projectName]);

  // Toggle feature
  const toggleFeature = useCallback((featureId) => {
    setEnabledFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  }, []);

  // Validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Idea
        return null; // Always valid, prompt is optional
      case 1: // Template
        if (!selectedTemplate) return 'Please select a template';
        return null;
      case 2: // Details
        if (!projectName.trim()) return 'Project name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
          return 'Use only letters, numbers, hyphens, and underscores';
        }
        if (port && (isNaN(port) || parseInt(port) < 1 || parseInt(port) > 65535)) {
          return 'Invalid port number';
        }
        return null;
      case 3: // Integrations
        if (publishToCloudflare && !subdomain.trim()) {
          return 'Subdomain is required for Cloudflare publishing';
        }
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setCompletedSteps([...completedSteps, currentStep]);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');
    setCreationStatus({});

    try {
      // Step 1: Create project
      // Use backendId from the selected template for actual project creation
      setCreationStatus({ project: 'creating' });
      const projectData = await projectsExtendedApi.create({
        name: projectName.trim(),
        template: selectedTemplateData?.backendId || 'web-app-fullstack',
        port: port.trim() || undefined,
        description: projectDescription.trim(),
        features: enabledFeatures,
      });
      setCreationStatus(prev => ({ ...prev, project: 'done' }));

      // Step 2: Add firewall rule if enabled
      if (port.trim() && addToFirewall) {
        setCreationStatus(prev => ({ ...prev, firewall: 'creating' }));
        try {
          await firewallApi.addRule({
            action: 'allow',
            port: port.trim(),
            protocol: 'tcp',
            from: 'any',
            comment: `${projectName.trim()} project`,
          });
          setCreationStatus(prev => ({ ...prev, firewall: 'done' }));
        } catch (err) {
          console.warn('Firewall rule failed:', err.getUserMessage?.() || err.message);
          setCreationStatus(prev => ({ ...prev, firewall: 'failed' }));
        }
      }

      // Step 3: Create GitHub repo if enabled
      if (createGitHubRepo && githubAvailable) {
        setCreationStatus(prev => ({ ...prev, github: 'creating' }));
        try {
          const projects = await projectsExtendedApi.list();
          const project = projects.find(p => p.name === projectName.trim());

          if (project) {
            await projectsExtendedApi.createGitHubRepo(project.name, {
              name: projectName.trim(),
              description: projectDescription.trim(),
              isPrivate: repoVisibility === 'private',
            });
            setCreationStatus(prev => ({ ...prev, github: 'done' }));
          }
        } catch (err) {
          console.warn('GitHub repo creation failed:', err.getUserMessage?.() || err.message);
          setCreationStatus(prev => ({ ...prev, github: 'failed' }));
        }
      }

      // Step 4: Publish to Cloudflare if enabled
      if (publishToCloudflare && cloudflareAvailable && port.trim()) {
        setCreationStatus(prev => ({ ...prev, cloudflare: 'creating' }));
        try {
          await cloudflareApi.publish({
            projectId: projectName.trim(),
            subdomain: subdomain.trim(),
            localPort: parseInt(port.trim()),
            description: `Published from ${projectName.trim()}`
          });
          setCreationStatus(prev => ({ ...prev, cloudflare: 'done' }));
        } catch (err) {
          console.warn('Cloudflare publish failed:', err.getUserMessage?.() || err.message);
          setCreationStatus(prev => ({ ...prev, cloudflare: 'failed' }));
        }
      }

      // All done!
      setCreationStatus(prev => ({ ...prev, complete: true }));

      // Wait a moment to show completion status
      setTimeout(() => {
        onCreated(projectData);
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
      setIsCreating(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Idea
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
                              bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                {Icons.sparkle}
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                What would you like to create?
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Describe your project idea and we'll suggest the best template
              </p>
            </div>

            <div className="relative">
              <textarea
                value={ideaPrompt}
                onChange={(e) => setIdeaPrompt(e.target.value)}
                placeholder="e.g., A dashboard to track my fitness goals with charts and weekly reports..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                           text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none
                           focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
              <div className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)]">
                {ideaPrompt.length > 0 && `${ideaPrompt.length} characters`}
              </div>
            </div>

            {suggestedTemplates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  Based on your idea, we suggest:
                </h4>
                <div className="grid gap-3">
                  {suggestedTemplates.map(template => (
                    <SuggestedTemplate
                      key={template.id}
                      template={template}
                      selected={selectedTemplate === template.id}
                      onSelect={setSelectedTemplate}
                      matchScore={template.score}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-[var(--text-muted)]">
              Or skip this step and browse all templates →
            </p>
          </div>
        );

      case 1: // Template
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Choose a Template
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Select the type of project you want to create
              </p>
            </div>

            <CategoryTabs
              categories={TEMPLATE_CATEGORIES}
              selected={categoryFilter}
              onSelect={setCategoryFilter}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1">
              {filteredTemplates.map(template => (
                <TemplateGridItem
                  key={template.id}
                  template={template}
                  selected={selectedTemplate === template.id}
                  onSelect={setSelectedTemplate}
                />
              ))}
            </div>

            {selectedTemplateData && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent
                              border border-[var(--accent-primary)]/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{selectedTemplateData.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--text-primary)]">{selectedTemplateData.name}</h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{selectedTemplateData.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedTemplateData.stack?.map(tech => (
                        <span key={tech} className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-primary)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                          {tech}
                        </span>
                      ))}
                    </div>
                    {selectedTemplateData.features?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedTemplateData.features.map(f => (
                          <span key={f} className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            <span className="text-emerald-500">✓</span> {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Details
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Project Details
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Configure your project's name, port, and features
              </p>
            </div>

            <InputField
              label="Project Name"
              value={projectName}
              onChange={setProjectName}
              placeholder="my-awesome-project"
              description={`Will be created in ~/Projects/${projectName || 'project-name'}`}
              required
            />

            <InputField
              label="Description"
              value={projectDescription}
              onChange={setProjectDescription}
              placeholder="A brief description of what this project does..."
              description="This will be added to your CLAUDE.md"
            />

            <InputField
              label="Development Port"
              value={port}
              onChange={(v) => setPort(v.replace(/[^0-9]/g, ''))}
              placeholder={selectedTemplateData?.defaultPort ? String(selectedTemplateData.defaultPort) : '3000'}
              description="The port your dev server will run on"
            />

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Optional Features
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OPTIONAL_FEATURES.map(feature => (
                  <FeatureChip
                    key={feature.id}
                    feature={feature}
                    enabled={enabledFeatures.includes(feature.id)}
                    onToggle={toggleFeature}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Integrations
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Integrations
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Connect your project to external services
              </p>
            </div>

            {/* Git */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <Toggle
                checked={initGit}
                onChange={setInitGit}
                label="Initialize Git Repository"
                description="Run git init and create initial commit"
              />
            </div>

            {/* GitHub */}
            <div className={`p-4 rounded-xl border ${githubAvailable ? 'bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/30' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
              <Toggle
                checked={createGitHubRepo}
                onChange={setCreateGitHubRepo}
                label={
                  <span className="flex items-center gap-2">
                    {Icons.github}
                    Create GitHub Repository
                  </span>
                }
                description={githubAvailable
                  ? "Create a repo and push initial commit"
                  : "GitHub not authenticated - configure in Settings"
                }
              />

              {createGitHubRepo && githubAvailable && (
                <div className="mt-4 pl-11 space-y-3">
                  <div className="flex gap-2">
                    {['private', 'public'].map((visibility) => (
                      <button
                        key={visibility}
                        type="button"
                        onClick={() => setRepoVisibility(visibility)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${repoVisibility === visibility
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                          }`}
                      >
                        {visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Firewall */}
            {port && (
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <Toggle
                  checked={addToFirewall}
                  onChange={setAddToFirewall}
                  label={
                    <span className="flex items-center gap-2">
                      {Icons.shield}
                      Add Firewall Rule
                    </span>
                  }
                  description={`Allow port ${port} through UFW firewall`}
                />
              </div>
            )}

            {/* Cloudflare */}
            {port && (
              <div className={`p-4 rounded-xl border ${cloudflareAvailable ? 'bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/30' : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'}`}>
                <Toggle
                  checked={publishToCloudflare}
                  onChange={setPublishToCloudflare}
                  label={
                    <span className="flex items-center gap-2">
                      {Icons.cloud}
                      Publish to Cloudflare Tunnel
                    </span>
                  }
                  description={cloudflareAvailable
                    ? "Make your app accessible via a public URL"
                    : "Cloudflare not configured - configure in Settings"
                  }
                />

                {publishToCloudflare && cloudflareAvailable && (
                  <div className="mt-4 pl-11">
                    <InputField
                      label="Subdomain"
                      value={subdomain}
                      onChange={(v) => setSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="my-app"
                      description={`Your app will be available at ${subdomain || 'subdomain'}.example.com`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Ready to Create
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Review your configuration and create your project
              </p>
            </div>

            <div className="space-y-2">
              <SummaryItem
                icon={<span className="text-lg">📁</span>}
                label="Project"
                value={`${projectName} (${selectedTemplateData?.name || 'Empty'})`}
                status={creationStatus.project === 'done' ? 'success' : creationStatus.project === 'creating' ? 'pending' : 'ready'}
              />

              {projectDescription && (
                <SummaryItem
                  icon={<span className="text-lg">📝</span>}
                  label="Description"
                  value={projectDescription.substring(0, 50) + (projectDescription.length > 50 ? '...' : '')}
                />
              )}

              {port && (
                <SummaryItem
                  icon={<span className="text-lg">🔌</span>}
                  label="Port"
                  value={`Port ${port}${addToFirewall ? ' + Firewall Rule' : ''}`}
                  status={creationStatus.firewall === 'done' ? 'success' : creationStatus.firewall === 'creating' ? 'pending' : addToFirewall ? 'ready' : 'skip'}
                />
              )}

              {enabledFeatures.length > 0 && (
                <SummaryItem
                  icon={<span className="text-lg">✨</span>}
                  label="Features"
                  value={enabledFeatures.map(f => OPTIONAL_FEATURES.find(of => of.id === f)?.name).join(', ')}
                />
              )}

              {createGitHubRepo && (
                <SummaryItem
                  icon={<span className="text-lg" style={{ color: '#8b5cf6' }}>🐙</span>}
                  label="GitHub"
                  value={`${repoVisibility === 'private' ? 'Private' : 'Public'} Repository`}
                  status={creationStatus.github === 'done' ? 'success' : creationStatus.github === 'creating' ? 'pending' : 'ready'}
                />
              )}

              {publishToCloudflare && port && (
                <SummaryItem
                  icon={<span className="text-lg">☁️</span>}
                  label="Cloudflare"
                  value={`${subdomain}.example.com`}
                  status={creationStatus.cloudflare === 'done' ? 'success' : creationStatus.cloudflare === 'creating' ? 'pending' : 'ready'}
                />
              )}

              <SummaryItem
                icon={<span className="text-lg">📂</span>}
                label="Location"
                value={`~/Projects/${projectName}`}
              />
            </div>

            {creationStatus.complete && (
              <div className="p-6 rounded-xl text-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-emerald-400">Project created successfully!</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Opening your new project...</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={!isCreating ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative glass-elevated rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        style={{
          border: '1px solid var(--border-default)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.02))',
          }}
        >
          <h2 className="text-lg font-semibold flex items-center gap-3 text-[var(--text-primary)]">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            Create New Project
          </h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50 text-[var(--text-secondary)]"
          >
            {Icons.close}
          </button>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Content */}
        <div
          className="px-6 py-4 overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 220px)' }}
        >
          {renderStepContent()}

          {/* Error message */}
          {error && (
            <div
              className="mt-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-error)',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={currentStep === 0 ? onClose : handleBack}
            disabled={isCreating}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
                       bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)]
                       hover:bg-[var(--bg-primary)]"
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep
                    ? 'bg-[var(--accent-primary)]'
                    : idx < currentStep
                    ? 'bg-[var(--accent-primary)]/50'
                    : 'bg-[var(--border-default)]'
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                         bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white
                         hover:brightness-110"
            >
              Next
              {Icons.arrow}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50
                         bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white
                         hover:brightness-110"
            >
              {isCreating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  {Icons.check}
                  Create Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
