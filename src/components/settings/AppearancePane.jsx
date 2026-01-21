/**
 * AppearancePane Component
 * Theme selection and appearance settings
 */

import { useTheme, THEMES } from '../../hooks/useTheme';

export default function AppearancePane() {
  const { theme: currentTheme, setTheme } = useTheme();

  const themeColors = {
    // Original themes
    dark: { bg: '#121217', primary: '#10b981', secondary: '#06b6d4', tertiary: '#8b5cf6' },
    dracula: { bg: '#282a36', primary: '#bd93f9', secondary: '#8be9fd', tertiary: '#ff79c6' },
    nord: { bg: '#2e3440', primary: '#88c0d0', secondary: '#81a1c1', tertiary: '#b48ead' },
    cyberpunk: { bg: '#0f1419', primary: '#22d3ee', secondary: '#e879f9', tertiary: '#fbbf24' },
    sepia: { bg: '#1c1814', primary: '#d97706', secondary: '#ca8a04', tertiary: '#c2410c' },
    light: { bg: '#f8f9fb', primary: '#0d9488', secondary: '#0284c7', tertiary: '#7c3aed' },
    // OpenCode-compatible themes
    matrix: { bg: '#000000', primary: '#00ff41', secondary: '#00ff41', tertiary: '#20c20e' },
    tokyonight: { bg: '#1a1b26', primary: '#7aa2f7', secondary: '#7dcfff', tertiary: '#bb9af7' },
    catppuccin: { bg: '#1e1e2e', primary: '#cba6f7', secondary: '#89b4fa', tertiary: '#f5c2e7' },
    'catppuccin-macchiato': { bg: '#24273a', primary: '#c6a0f6', secondary: '#8aadf4', tertiary: '#f5bde6' },
    gruvbox: { bg: '#282828', primary: '#fabd2f', secondary: '#83a598', tertiary: '#d3869b' },
    kanagawa: { bg: '#1f1f28', primary: '#7e9cd8', secondary: '#7fb4ca', tertiary: '#957fb8' },
    everforest: { bg: '#2d353b', primary: '#a7c080', secondary: '#7fbbb3', tertiary: '#d699b6' },
    ayu: { bg: '#0d1017', primary: '#e6b450', secondary: '#59c2ff', tertiary: '#d2a6ff' },
    'one-dark': { bg: '#282c34', primary: '#61afef', secondary: '#56b6c2', tertiary: '#c678dd' },
  };

  return (
    <div className="space-y-6">
      <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Appearance</h4>

      <div className="space-y-4">
        <label className="text-sm text-secondary">Theme</label>
        <p className="text-xs text-tertiary mb-3">Hover to preview, click to apply. Changes are instant.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {THEMES.map((themeOption) => {
            const isActive = currentTheme === themeOption.id;
            const colors = themeColors[themeOption.id] || themeColors.dark;
            const isLightTheme = themeOption.id === 'light';

            return (
              <button
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                onMouseEnter={() => document.documentElement.setAttribute('data-theme', themeOption.id)}
                onMouseLeave={() => document.documentElement.setAttribute('data-theme', currentTheme)}
                className={`relative flex flex-col items-center p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'ring-2'
                    : 'hover:border-strong'
                }`}
                style={{
                  background: isActive ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                  borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                  ringColor: isActive ? 'var(--accent-primary)' : undefined,
                }}
              >
                {/* Color Preview Circles */}
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: colors.bg,
                      border: `1px solid ${isLightTheme ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'}`,
                    }}
                  />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.primary, boxShadow: `0 0 6px ${colors.primary}40` }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.secondary, boxShadow: `0 0 6px ${colors.secondary}40` }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.tertiary, boxShadow: `0 0 6px ${colors.tertiary}40` }} />
                </div>

                {/* Theme Name */}
                <span className="text-sm font-medium text-primary">
                  {themeOption.name}
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
          className="mt-4 p-4 rounded-lg text-center"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <p className="text-sm text-secondary">
            {THEMES.find(t => t.id === currentTheme)?.description || 'Select a theme'}
          </p>
        </div>
      </div>
    </div>
  );
}
