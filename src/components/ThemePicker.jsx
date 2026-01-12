/**
 * Theme Picker Component
 * A modal for selecting and previewing themes
 */

import { useState } from 'react';
import { THEMES } from '../hooks/useTheme';

export default function ThemePicker({ isOpen, onClose, currentTheme, onSelectTheme }) {
  const [previewTheme, setPreviewTheme] = useState(null);

  if (!isOpen) return null;

  // Handle preview hover
  const handleMouseEnter = (themeId) => {
    setPreviewTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  // Restore current theme on mouse leave
  const handleMouseLeave = () => {
    setPreviewTheme(null);
    document.documentElement.setAttribute('data-theme', currentTheme);
  };

  // Select theme and close
  const handleSelect = (themeId) => {
    onSelectTheme(themeId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleMouseLeave();
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl glass-elevated rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        style={{ border: '1px solid var(--border-color)' }}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <h2 className="text-lg font-bold text-primary tracking-wider">
              SELECT THEME
            </h2>
          </div>
          <button
            onClick={() => {
              handleMouseLeave();
              onClose();
            }}
            className="btn-icon"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;
              const isPreviewing = previewTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  onMouseEnter={() => handleMouseEnter(theme.id)}
                  className={`relative flex flex-col items-center p-4 rounded-lg border transition-all ${
                    isActive
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-default hover:border-strong'
                  }`}
                  style={{
                    background: isActive || isPreviewing ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                    borderColor: isActive ? 'var(--accent-primary)' : undefined,
                  }}
                >
                  {/* Color Preview Circles */}
                  <div className="flex gap-2 mb-3">
                    <ThemePreviewDot theme={theme.id} type="bg" />
                    <ThemePreviewDot theme={theme.id} type="primary" />
                    <ThemePreviewDot theme={theme.id} type="secondary" />
                    <ThemePreviewDot theme={theme.id} type="tertiary" />
                  </div>

                  {/* Theme Name */}
                  <span className="text-sm font-medium text-primary">
                    {theme.name}
                  </span>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <svg
                        className="w-4 h-4"
                        style={{ color: 'var(--accent-primary)' }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Theme Description */}
          <div
            className="mt-6 p-4 rounded-lg text-center"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <p className="text-sm text-secondary">
              {previewTheme
                ? THEMES.find(t => t.id === previewTheme)?.description
                : THEMES.find(t => t.id === currentTheme)?.description
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3 border-t text-xs font-mono"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Hover to preview</span>
          <span>Click to apply</span>
        </div>
      </div>
    </div>
  );
}

// Theme preview dot with actual colors - updated for WCAG compliant themes
function ThemePreviewDot({ theme, type }) {
  const colors = {
    dark: { bg: '#121217', primary: '#10b981', secondary: '#06b6d4', tertiary: '#8b5cf6' },
    dracula: { bg: '#282a36', primary: '#bd93f9', secondary: '#8be9fd', tertiary: '#ff79c6' },
    nord: { bg: '#2e3440', primary: '#88c0d0', secondary: '#81a1c1', tertiary: '#b48ead' },
    cyberpunk: { bg: '#0f1419', primary: '#22d3ee', secondary: '#e879f9', tertiary: '#fbbf24' },
    sepia: { bg: '#1c1814', primary: '#d97706', secondary: '#ca8a04', tertiary: '#c2410c' },
    light: { bg: '#f8f9fb', primary: '#0d9488', secondary: '#0284c7', tertiary: '#7c3aed' },
  };

  const themeColors = colors[theme] || colors.dark;
  const color = themeColors[type];
  const isLightTheme = theme === 'light';

  return (
    <div
      className="w-4 h-4 rounded-full"
      style={{
        backgroundColor: color,
        border: type === 'bg' ? `1px solid ${isLightTheme ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'}` : 'none',
        boxShadow: type !== 'bg' ? `0 0 6px ${color}40` : 'none',
      }}
    />
  );
}
