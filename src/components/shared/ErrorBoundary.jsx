/**
 * @file ErrorBoundary.jsx
 * @description React Error Boundary for graceful error handling
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // You could also log the error to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-cricket-dark flex items-center justify-center p-4">
          <div className="card p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-cricket-text-primary">
                  Something went wrong
                </h1>
                <p className="text-cricket-text-secondary text-sm mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            {/* Error details (development mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 bg-cricket-secondary p-4 rounded border border-red-700/30">
                <h3 className="text-sm font-semibold text-red-400 mb-2">Error Details:</h3>
                <pre className="text-xs text-cricket-text-secondary overflow-x-auto">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-cricket-text-secondary cursor-pointer hover:text-cricket-text-primary">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-cricket-text-secondary mt-2 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn-secondary flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>

            {/* Helpful message */}
            <div className="mt-6 p-4 bg-cricket-secondary/50 rounded text-sm text-cricket-text-secondary">
              <p className="mb-2">
                If this problem persists, try the following:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Clear your browser cache and reload</li>
                <li>Check the browser console for more details</li>
                <li>Refresh the page</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
