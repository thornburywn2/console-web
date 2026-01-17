/**
 * CreateProjectModal Component
 * Multi-step wizard for creating new projects
 *
 * Refactored to use extracted components from ./create-project/
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { githubExtendedApi, cloudflareApi, firewallApi, projectsExtendedApi } from '../services/api.js';
import {
  TEMPLATES,
  STEPS,
  StepIndicator,
  Toggle,
  InputField,
  TemplateCard,
  SummaryItem,
} from './create-project';

export default function CreateProjectModal({ onClose, onCreated }) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Form data
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('fullstack');
  const [initGit, setInitGit] = useState(true);

  // Network config
  const [port, setPort] = useState('');
  const [addToFirewall, setAddToFirewall] = useState(true);
  const [publishToCloudflare, setPublishToCloudflare] = useState(false);
  const [subdomain, setSubdomain] = useState('');

  // GitHub config
  const [createGitHubRepo, setCreateGitHubRepo] = useState(false);
  const [repoVisibility, setRepoVisibility] = useState('private');
  const [githubAvailable, setGithubAvailable] = useState(false);
  const [cloudflareAvailable, setCloudflareAvailable] = useState(false);

  // Status
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [creationStatus, setCreationStatus] = useState({});

  // Check GitHub and Cloudflare availability
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

  // Auto-generate subdomain from project name
  useEffect(() => {
    if (projectName && !subdomain) {
      setSubdomain(projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  }, [projectName]);

  // Validation
  const validateStep = (step) => {
    switch (step) {
      case 0: // Basics
        if (!projectName.trim()) return 'Project name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
          return 'Use only letters, numbers, hyphens, and underscores';
        }
        return null;
      case 1: // Template
        return null; // Always valid
      case 2: // Network
        if (port && (isNaN(port) || parseInt(port) < 1 || parseInt(port) > 65535)) {
          return 'Invalid port number';
        }
        if (publishToCloudflare && !subdomain.trim()) {
          return 'Subdomain is required for Cloudflare publishing';
        }
        return null;
      case 3: // GitHub
        return null; // Always valid
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
      setCreationStatus({ project: 'creating' });
      const projectData = await projectsExtendedApi.create({
        name: projectName.trim(),
        template: initGit ? 'git' : 'empty',
        port: port.trim() || undefined,
        description: projectDescription.trim(),
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

  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Let's create something awesome
              </h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Give your project a name and description
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
              description="Optional but helpful for documentation"
            />
          </div>
        );

      case 1: // Template
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Choose your starting point
              </h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Select a template that matches your project type
              </p>
            </div>

            <div className="space-y-3">
              {TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate === template.id}
                  onSelect={setSelectedTemplate}
                />
              ))}
            </div>

            <Toggle
              checked={initGit}
              onChange={setInitGit}
              label="Initialize Git repository"
              description="Run git init in the new project directory"
            />
          </div>
        );

      case 2: // Network
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Configure networking
              </h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Set up ports and external access
              </p>
            </div>

            <InputField
              label="Development Port"
              value={port}
              onChange={(v) => setPort(v.replace(/[^0-9]/g, ''))}
              placeholder="e.g., 5173, 3000, 8080"
              description="The port your dev server will run on"
            />

            {port && (
              <>
                <Toggle
                  checked={addToFirewall}
                  onChange={setAddToFirewall}
                  label="Add to firewall"
                  description={`Allow port ${port} through UFW firewall`}
                />

                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: cloudflareAvailable
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.05))'
                      : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Toggle
                    checked={publishToCloudflare}
                    onChange={setPublishToCloudflare}
                    label="Publish to Cloudflare Tunnel"
                    description={cloudflareAvailable
                      ? "Make your app accessible via a public URL"
                      : "Cloudflare not configured - configure in Settings"
                    }
                    accentColor="secondary"
                  />

                  {publishToCloudflare && cloudflareAvailable && (
                    <div className="mt-4 pl-14">
                      <InputField
                        label="Subdomain"
                        value={subdomain}
                        onChange={(v) => setSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="my-app"
                        description={`Your app will be available at ${subdomain || 'subdomain'}.example.com`}
                      />
                    </div>
                  )}

                  {!cloudflareAvailable && (
                    <p className="text-xs mt-2 pl-14" style={{ color: 'var(--text-muted)' }}>
                      Configure Cloudflare in Admin Dashboard → Settings → Integrations
                    </p>
                  )}
                </div>
              </>
            )}

            {!port && (
              <div
                className="p-4 rounded-xl text-center"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Enter a port number to configure firewall and Cloudflare options
                </p>
              </div>
            )}
          </div>
        );

      case 3: // GitHub
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                GitHub Integration
              </h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Optionally create a GitHub repository for your project
              </p>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                background: githubAvailable
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.05))'
                  : 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Toggle
                checked={createGitHubRepo}
                onChange={setCreateGitHubRepo}
                label="Create GitHub Repository"
                description={githubAvailable
                  ? "Automatically create a repo and push initial commit"
                  : "GitHub not authenticated - configure in Settings"
                }
              />

              {createGitHubRepo && githubAvailable && (
                <div className="mt-4 pl-14 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Repository Visibility
                    </label>
                    <div className="flex gap-3">
                      {['private', 'public'].map((visibility) => (
                        <button
                          key={visibility}
                          type="button"
                          onClick={() => setRepoVisibility(visibility)}
                          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                          style={{
                            background: repoVisibility === visibility
                              ? visibility === 'private'
                                ? 'var(--accent-primary)'
                                : 'var(--status-warning)'
                              : 'var(--bg-tertiary)',
                            color: repoVisibility === visibility ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${repoVisibility === visibility ? 'transparent' : 'var(--border-default)'}`,
                          }}
                        >
                          {visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {repoVisibility === 'private'
                        ? 'Only you and collaborators can see this repository'
                        : 'Anyone on the internet can see this repository'}
                    </p>
                  </div>
                </div>
              )}

              {!githubAvailable && (
                <p className="text-xs mt-2 pl-14" style={{ color: 'var(--text-muted)' }}>
                  Configure GitHub in Admin Dashboard → Settings → Integrations
                </p>
              )}
            </div>

            {!createGitHubRepo && (
              <div
                className="p-4 rounded-xl text-center"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  You can always create a GitHub repository later from the project's GitHub panel
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Review & Create
              </h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Review your project configuration before creating
              </p>
            </div>

            <div className="space-y-3">
              <SummaryItem
                icon={<span className="text-lg">📁</span>}
                label="Project"
                value={projectName}
                status={creationStatus.project === 'done' ? 'success' : creationStatus.project === 'creating' ? 'pending' : 'success'}
              />

              <SummaryItem
                icon={<span className="text-lg">{selectedTemplateData?.icon}</span>}
                label="Template"
                value={selectedTemplateData?.name || 'None'}
              />

              {port && (
                <SummaryItem
                  icon={<span className="text-lg">🔌</span>}
                  label="Port"
                  value={`Port ${port}${addToFirewall ? ' + Firewall' : ''}`}
                  status={creationStatus.firewall === 'done' ? 'success' : creationStatus.firewall === 'creating' ? 'pending' : addToFirewall ? 'pending' : 'skip'}
                />
              )}

              {publishToCloudflare && port && (
                <SummaryItem
                  icon={<span className="text-lg">☁️</span>}
                  label="Cloudflare"
                  value={`${subdomain}.example.com`}
                  status={creationStatus.cloudflare === 'done' ? 'success' : creationStatus.cloudflare === 'creating' ? 'pending' : 'pending'}
                />
              )}

              {createGitHubRepo && (
                <SummaryItem
                  icon={
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)' }}>
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  }
                  label="GitHub"
                  value={`${repoVisibility === 'private' ? '🔒 Private' : '🌐 Public'} Repository`}
                  status={creationStatus.github === 'done' ? 'success' : creationStatus.github === 'creating' ? 'pending' : 'pending'}
                />
              )}

              <SummaryItem
                icon={<span className="text-lg">📝</span>}
                label="Git"
                value={initGit ? 'Initialize repository' : 'No git init'}
                status={initGit ? 'pending' : 'skip'}
              />
            </div>

            {creationStatus.complete && (
              <div
                className="p-4 rounded-xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1))',
                  border: '1px solid var(--accent-primary)',
                }}
              >
                <svg className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Project created successfully!
                </p>
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
          <h2 className="text-lg font-semibold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            Create New Project
          </h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
          style={{ maxHeight: 'calc(90vh - 250px)' }}
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
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
              }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
              }}
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
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
