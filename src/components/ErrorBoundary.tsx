import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Game Error Caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    try {
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) caches.delete(key);
        });
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) reg.unregister();
        });
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 bg-black text-white font-apple">
          <div className="w-full max-w-sm apple-glass p-6 rounded-3xl border border-white/20 text-center space-y-4 shadow-2xl backdrop-blur-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center text-2xl">
              ⚡
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">Update Ready</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              A fresh update has been deployed. Tap reload to get the latest microsecond engine version.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-5 rounded-full bg-[#0071e3] hover:bg-[#0077ED] text-white font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(0,113,227,0.4)] active:scale-95"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
