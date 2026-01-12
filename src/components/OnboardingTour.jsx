/**
 * Onboarding Tour Component
 * Interactive guide for new users
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Command Portal',
    content: 'Your all-in-one development operations platform. Let me show you around!',
    target: null,
    placement: 'center'
  },
  {
    id: 'sidebar',
    title: 'Project Sidebar',
    content: 'Browse and select your projects from the left sidebar. Use folders and tags to organize them.',
    target: '[data-tour="sidebar"]',
    placement: 'right'
  },
  {
    id: 'terminal',
    title: 'Terminal',
    content: 'Interactive terminal powered by tmux. Your sessions persist even if you close the browser.',
    target: '[data-tour="terminal"]',
    placement: 'top'
  },
  {
    id: 'right-sidebar',
    title: 'Quick Stats',
    content: 'Monitor system resources, Docker containers, and session status at a glance.',
    target: '[data-tour="right-sidebar"]',
    placement: 'left'
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    content: 'Press Ctrl+Shift+P anytime for quick access to all features.',
    target: '[data-tour="command-palette"]',
    placement: 'bottom',
    highlight: true
  },
  {
    id: 'search',
    title: 'Global Search',
    content: 'Press Ctrl+K to search everything - projects, sessions, commands, and more.',
    target: '[data-tour="search"]',
    placement: 'bottom'
  },
  {
    id: 'admin',
    title: 'Admin Dashboard',
    content: 'Full system control with Docker management, service monitoring, and theme customization.',
    target: '[data-tour="admin"]',
    placement: 'left'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    content: 'Explore the features and customize your workflow. Need help? Press ? anytime.',
    target: null,
    placement: 'center'
  }
];

function TourTooltip({ step, totalSteps, currentStep, onNext, onPrev, onSkip, onComplete, position }) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div
      className="fixed z-[9999] w-80 rounded-xl shadow-2xl animate-fade-in"
      style={{
        ...position,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-accent)'
      }}
    >
      {/* Arrow */}
      {step.placement !== 'center' && (
        <div
          className="absolute w-3 h-3 rotate-45"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-accent)',
            borderRight: 'none',
            borderBottom: 'none',
            ...(step.placement === 'right' ? { left: -7, top: '50%', transform: 'translateY(-50%) rotate(-45deg)' } :
                step.placement === 'left' ? { right: -7, top: '50%', transform: 'translateY(-50%) rotate(135deg)' } :
                step.placement === 'top' ? { bottom: -7, left: '50%', transform: 'translateX(-50%) rotate(-135deg)' } :
                { top: -7, left: '50%', transform: 'translateX(-50%) rotate(45deg)' })
          }}
        />
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-primary">{step.title}</h3>
          <button onClick={onSkip} className="text-muted hover:text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-secondary mb-4">{step.content}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-accent' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="px-3 py-1.5 text-sm text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-muted">{currentStep + 1} of {totalSteps}</span>
          <button
            onClick={isLast ? onComplete : onNext}
            className="px-4 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent/80"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spotlight({ target, padding = 10 }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const element = document.querySelector(target);
    if (element) {
      const updateRect = () => {
        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - padding,
          left: r.left - padding,
          width: r.width + padding * 2,
          height: r.height + padding * 2
        });
      };
      updateRect();
      window.addEventListener('resize', updateRect);
      return () => window.removeEventListener('resize', updateRect);
    }
  }, [target, padding]);

  if (!rect) return null;

  return (
    <div
      className="fixed z-[9998] rounded-lg transition-all duration-300"
      style={{
        ...rect,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
        pointerEvents: 'none'
      }}
    />
  );
}

export default function OnboardingTour({
  steps = DEFAULT_STEPS,
  onComplete,
  onSkip,
  autoStart = false
}) {
  const [isActive, setIsActive] = useState(autoStart);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  const step = steps[currentStep];

  // Calculate tooltip position
  useEffect(() => {
    if (!isActive || !step) return;

    const calculatePosition = () => {
      if (step.placement === 'center' || !step.target) {
        setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        return;
      }

      const element = document.querySelector(step.target);
      if (!element) {
        setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        return;
      }

      const rect = element.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const offset = 20;

      let pos = {};
      switch (step.placement) {
        case 'right':
          pos = {
            top: rect.top + rect.height / 2,
            left: rect.right + offset,
            transform: 'translateY(-50%)'
          };
          break;
        case 'left':
          pos = {
            top: rect.top + rect.height / 2,
            left: rect.left - tooltipWidth - offset,
            transform: 'translateY(-50%)'
          };
          break;
        case 'top':
          pos = {
            top: rect.top - tooltipHeight - offset,
            left: rect.left + rect.width / 2,
            transform: 'translateX(-50%)'
          };
          break;
        case 'bottom':
        default:
          pos = {
            top: rect.bottom + offset,
            left: rect.left + rect.width / 2,
            transform: 'translateX(-50%)'
          };
      }

      setPosition(pos);
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [isActive, step, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('tour-completed', 'true');
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('tour-completed', 'true');
    onSkip?.();
  }, [onSkip]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  // Check if should auto-start
  useEffect(() => {
    if (autoStart && !localStorage.getItem('tour-completed')) {
      const timer = setTimeout(startTour, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, startTour]);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9997] bg-black/50" />

      {/* Spotlight */}
      <Spotlight target={step?.target} />

      {/* Tooltip */}
      <TourTooltip
        step={step}
        totalSteps={steps.length}
        currentStep={currentStep}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onComplete={handleComplete}
        position={position}
      />
    </>
  );
}

// Hook to manage onboarding
export function useOnboarding(steps = DEFAULT_STEPS) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
    localStorage.setItem('tour-completed', 'true');
  }, []);

  const shouldShow = !localStorage.getItem('tour-completed');

  return {
    isActive,
    currentStep,
    step: steps[currentStep],
    start,
    complete,
    shouldShow,
    next: () => setCurrentStep(s => Math.min(s + 1, steps.length - 1)),
    prev: () => setCurrentStep(s => Math.max(s - 1, 0))
  };
}
