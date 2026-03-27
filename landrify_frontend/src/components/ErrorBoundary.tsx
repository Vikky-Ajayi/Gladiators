import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-landrify-bg px-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white shadow-xl border border-red-100">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We hit an unexpected error. Please refresh the page and try again.
            </p>
            {this.state.message && <p className="text-sm text-red-600">{this.state.message}</p>}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
