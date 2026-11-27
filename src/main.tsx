import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[AppErrorBoundary] Uncaught render error:', error, errorInfo);
    this.setState({
      componentStack: errorInfo?.componentStack || ''
    });
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected runtime error occurred.';
      const stackPreview = this.state.componentStack || this.state.error?.stack || '';

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-lg rounded-2xl border-2 border-rose-500/60 bg-slate-900/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 font-black text-lg shrink-0">
                !
              </div>
              <div>
                <h1 className="text-base font-bold text-rose-300 tracking-wide uppercase">
                  Runtime Error Detected
                </h1>
                <p className="text-xs text-slate-400">
                  Your saved study progress in local storage is safe.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-1">
                Error Message
              </div>
              <p className="text-sm font-mono text-slate-100 break-words">
                {errorMessage}
              </p>
            </div>

            {stackPreview ? (
              <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Component Stack
                </div>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
                  {stackPreview.trim()}
                </pre>
              </div>
            ) : null}

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-sm transition cursor-pointer shadow-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
