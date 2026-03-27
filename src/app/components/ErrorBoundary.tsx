import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="w-full max-w-[430px] text-center space-y-6">
            <div className="w-16 h-16 rounded-md3-extra-large bg-error-container flex items-center justify-center mx-auto">
              <span className="text-display-sm text-on-error-container">!</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-headline-md font-medium text-on-surface">Something went wrong</h2>
              <p className="text-body-md text-on-surface-variant">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-8 bg-primary text-on-primary text-label-lg font-medium rounded-md3-full hover:shadow-md3-1 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
