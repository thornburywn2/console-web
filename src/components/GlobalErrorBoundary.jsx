/**
 * Global Error Boundary Component
 *
 * Catches React errors at the application level and provides
 * a user-friendly error UI with Sentry integration.
 */

import React from 'react';
import { captureException, getLastEventId, showReportDialog, isSentryEnabled } from '../sentry';

/**
 * Error boundary state
 */
const initialState = {
  hasError: false,
  error: null,
  errorInfo: null,
  eventId: null,
};

/**
 * Global Error Boundary
 *
 * Wraps the entire application to catch unhandled React errors.
 * Reports errors to Sentry and displays a user-friendly error page.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  static getDerivedStateFromError(error) {
    // Update state to show fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to Sentry with component stack
    const eventId = captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
      tags: {
        errorBoundary: 'global',
      },
    });

    this.setState({
      errorInfo,
      eventId: eventId || getLastEventId(),
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('GlobalErrorBoundary caught error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      showReportDialog({
        eventId: this.state.eventId,
      });
    }
  };

  handleReset = () => {
    this.setState(initialState);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 p-8 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl font-semibold text-white text-center mb-2">
                Something went wrong
              </h1>

              {/* Description */}
              <p className="text-gray-400 text-center mb-6">
                An unexpected error occurred. Our team has been notified and is working on a fix.
              </p>

              {/* Error Reference */}
              {this.state.eventId && (
                <div className="bg-gray-900/50 rounded-lg p-3 mb-6">
                  <p className="text-xs text-gray-500 text-center">
                    Error Reference: <span className="text-gray-400 font-mono">{this.state.eventId}</span>
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReload}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Go to Home
                </button>

                {isSentryEnabled() && this.state.eventId && (
                  <button
                    onClick={this.handleReportFeedback}
                    className="w-full px-4 py-2.5 bg-transparent hover:bg-gray-700/50 text-gray-400 rounded-lg font-medium transition-colors border border-gray-600"
                  >
                    Report Feedback
                  </button>
                )}
              </div>

              {/* Development Error Details */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                    Error Details (Development)
                  </summary>
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-auto max-h-64">
                    <pre className="text-xs text-red-400 whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </pre>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-gray-600 text-xs mt-4">
              Console.web v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
