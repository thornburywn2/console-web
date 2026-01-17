/**
 * Project Creator Component
 * Multi-step wizard for creating new projects from templates
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useCallback } from 'react';
import TemplateCard from './TemplateCard';
import { projectTemplatesApi } from '../services/api.js';

const STEPS = [
  { id: 1, title: 'Select Template', description: 'Choose a project type' },
  { id: 2, title: 'Project Details', description: 'Configure your project' },
  { id: 3, title: 'Options', description: 'Additional settings' },
  { id: 4, title: 'Create', description: 'Review and create' }
];

export default function ProjectCreator({ isOpen, onClose, onProjectCreated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({});
  const [options, setOptions] = useState({
    initGit: true,
    installDeps: true,
    createGitHubRepo: false,
    setupHooks: true
  });

  // Load templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await projectTemplatesApi.list();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Initialize variables with defaults
    const initialVariables = {};
    for (const varDef of template.variables || []) {
      if (varDef.default !== undefined) {
        initialVariables[varDef.name] = varDef.default;
      }
    }
    setVariables(initialVariables);
    setCurrentStep(2);
  };

  const handleVariableChange = (name, value) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (name, value) => {
    setOptions(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    if (currentStep === 2) {
      // Validate required variables
      for (const varDef of selectedTemplate?.variables || []) {
        if (varDef.required && !variables[varDef.name]) {
          setError(`${varDef.label} is required`);
          return false;
        }
        if (varDef.pattern && variables[varDef.name]) {
          const regex = new RegExp(varDef.pattern);
          if (!regex.test(variables[varDef.name])) {
            setError(varDef.patternMessage || `Invalid format for ${varDef.label}`);
            return false;
          }
        }
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);

      const data = await projectTemplatesApi.create({
        templateId: selectedTemplate.id,
        variables,
        options
      });

      setResult(data);
      if (onProjectCreated) {
        onProjectCreated(data.project);
      }
    } catch (err) {
      setError(err.getUserMessage?.() || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setVariables({});
    setOptions({
      initGit: true,
      installDeps: true,
      createGitHubRepo: false,
      setupHooks: true
    });
    setError(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900/95 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Create New Project</h2>
            <p className="text-sm text-gray-400 mt-1">
              {STEPS[currentStep - 1]?.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${currentStep > step.id ? 'bg-green-500 text-white' : ''}
                  ${currentStep === step.id ? 'bg-blue-500 text-white' : ''}
                  ${currentStep < step.id ? 'bg-gray-700 text-gray-400' : ''}
                `}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.id}
                </div>
                <span className={`ml-2 text-sm ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-2 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (
                templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={selectedTemplate?.id === template.id}
                    onSelect={() => handleTemplateSelect(template)}
                  />
                ))
              )}
            </div>
          )}

          {/* Step 2: Project Details */}
          {currentStep === 2 && selectedTemplate && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  <div>
                    <h3 className="font-medium text-white">{selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-400">{selectedTemplate.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(selectedTemplate.variables || []).map(varDef => (
                  <div key={varDef.name}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {varDef.label}
                      {varDef.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {varDef.type === 'textarea' ? (
                      <textarea
                        value={variables[varDef.name] || ''}
                        onChange={(e) => handleVariableChange(varDef.name, e.target.value)}
                        placeholder={varDef.placeholder}
                        maxLength={varDef.maxLength}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                    ) : varDef.type === 'number' ? (
                      <input
                        type="number"
                        value={variables[varDef.name] || ''}
                        onChange={(e) => handleVariableChange(varDef.name, parseInt(e.target.value, 10) || '')}
                        min={varDef.min}
                        max={varDef.max}
                        placeholder={varDef.placeholder}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <input
                        type="text"
                        value={variables[varDef.name] || ''}
                        onChange={(e) => handleVariableChange(varDef.name, e.target.value)}
                        placeholder={varDef.placeholder}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    {varDef.patternMessage && (
                      <p className="mt-1 text-xs text-gray-500">{varDef.patternMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Options */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Project Options</h3>

              <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={options.initGit}
                  onChange={(e) => handleOptionChange('initGit', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white font-medium">Initialize Git Repository</span>
                  <p className="text-sm text-gray-400">Create initial commit with all template files</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={options.installDeps}
                  onChange={(e) => handleOptionChange('installDeps', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white font-medium">Install Dependencies</span>
                  <p className="text-sm text-gray-400">Run bun install and post-create commands</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={options.setupHooks}
                  onChange={(e) => handleOptionChange('setupHooks', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white font-medium">Setup Git Hooks</span>
                  <p className="text-sm text-gray-400">Install Husky pre-commit and pre-push hooks</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-800 opacity-50">
                <input
                  type="checkbox"
                  checked={options.createGitHubRepo}
                  onChange={(e) => handleOptionChange('createGitHubRepo', e.target.checked)}
                  disabled
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white font-medium">Create GitHub Repository</span>
                  <p className="text-sm text-gray-400">Create and push to GitHub (coming soon)</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && !result && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Review Your Project</h3>

              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
                  <span className="text-3xl">{selectedTemplate?.icon}</span>
                  <div>
                    <h4 className="text-lg font-medium text-white">{selectedTemplate?.name}</h4>
                    <p className="text-sm text-gray-400">{selectedTemplate?.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-400">{key}:</span>
                      <span className="ml-2 text-white">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Tech Stack:</h5>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTemplate?.stack || []).map(tech => (
                      <span key={tech} className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Options:</h5>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {options.initGit && <li>Initialize Git repository</li>}
                    {options.installDeps && <li>Install dependencies</li>}
                    {options.setupHooks && <li>Setup Git hooks</li>}
                    {options.createGitHubRepo && <li>Create GitHub repository</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Project Created Successfully!</h3>
              <p className="text-gray-400 mb-4">{result.project?.path}</p>
              <p className="text-sm text-gray-500">{result.filesCreated} files created</p>

              {result.commandResults?.length > 0 && (
                <div className="mt-6 text-left max-w-lg mx-auto">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Post-create commands:</h4>
                  <div className="space-y-2">
                    {result.commandResults.map((cmd, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${cmd.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        <code>{cmd.command}</code>
                        {cmd.success ? ' ✓' : ` - ${cmd.error}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={currentStep === 1 ? handleClose : handleBack}
            disabled={creating}
            className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {result ? (
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Done
            </button>
          ) : currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={currentStep === 1 && !selectedTemplate}
              className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
