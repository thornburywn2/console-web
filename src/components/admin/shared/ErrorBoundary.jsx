/**
 * ErrorBoundary Component
 * Catches errors in tab components to prevent full dashboard crashes
 */

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Tab Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <TabErrorFallback
            error={this.state.error}
            onRetry={this.handleRetry}
            tabName={this.props.tabName}
          />
        )
      );
    }

    return this.props.children;
  }
}

/**
 * TabErrorFallback - Default error display for failed tabs
 */
export function TabErrorFallback({ error, onRetry, tabName = 'Component' }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="hacker-card p-6 text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h3 className="text-lg font-mono text-hacker-error mb-2">
          {tabName} Failed to Load
        </h3>
        <p className="text-sm text-hacker-text-dim mb-4 font-mono">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onRetry}
            className="hacker-btn"
          >
            [RETRY]
          </button>
          <button
            onClick={() => window.location.reload()}
            className="hacker-btn bg-hacker-warning/10 border-hacker-warning/30 text-hacker-warning"
          >
            [RELOAD PAGE]
          </button>
        </div>
      </div>

      {/* Error details (collapsed by default) */}
      <details className="hacker-card p-4">
        <summary className="text-xs text-hacker-text-dim cursor-pointer font-mono">
          [SHOW ERROR DETAILS]
        </summary>
        <pre className="mt-4 p-3 bg-black/50 rounded text-xs text-hacker-error overflow-x-auto font-mono">
          {error?.stack || 'No stack trace available'}
        </pre>
      </details>
    </div>
  );
}

export default ErrorBoundary;
