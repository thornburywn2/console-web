/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    // Theme selectors are defined in index.css as custom CSS, not Tailwind-generated
    // No safelist needed - all dynamic classes use object lookups with literal strings
    // Status colors: text-green-400, bg-green-500/20, etc. are scanned from JS objects
  ],
  theme: {
    extend: {
      colors: {
        // Modern glassmorphism palette
        glass: {
          bg: '#0c0c0c',
          surface: 'rgba(28, 28, 28, 0.6)',
          elevated: 'rgba(18, 18, 18, 0.7)',
          overlay: 'rgba(255, 255, 255, 0.03)',
        },
        accent: {
          primary: '#10b981',
          'primary-dim': '#059669',
          secondary: '#06b6d4',
          tertiary: '#8b5cf6',
        },
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
        // Legacy hacker theme mappings for backwards compatibility
        // NOTE: text colors removed to prevent conflict with CSS variable-based theming
        hacker: {
          bg: '#0c0c0c',
          darker: '#080808',
          surface: '#121212',
          elevated: '#1a1a1a',
          border: 'rgba(255, 255, 255, 0.1)',
          green: '#10b981',
          'green-dim': '#059669',
          'green-glow': 'rgba(16, 185, 129, 0.4)',
          cyan: '#06b6d4',
          'cyan-dim': '#0891b2',
          'cyan-glow': 'rgba(6, 182, 212, 0.4)',
          purple: '#8b5cf6',
          'purple-dim': '#7c3aed',
          'purple-glow': 'rgba(139, 92, 246, 0.4)',
          // text colors now use CSS variables via .text-hacker-text class in index.css
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
        terminal: {
          bg: '#0c0c0c',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.05)',
          accent: '#10b981',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        '3xs': '0.5625rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '4px',
        'xl': '24px',
        '2xl': '40px',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'float': '0 20px 60px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
