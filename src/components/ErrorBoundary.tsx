import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MascotMoment } from './ui/MascotMoment';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      let friendly = 'Something broke in the signal stream. Reset the view to continue.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.operationType && parsed?.error) {
          friendly = `Database ${parsed.operationType} error: ${parsed.error}`;
        }
      } catch {
        friendly = this.state.errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <MascotMoment
              mode="error"
              title="Signal Interrupted"
              subtitle={friendly}
              actionLabel="Recover Session"
              onAction={this.handleReset}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
