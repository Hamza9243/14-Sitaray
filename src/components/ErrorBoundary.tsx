import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches a render/lifecycle crash in its children and quietly renders nothing
 * instead of taking the whole app down with it — used around AnimatedSplashOverlay
 * (decorative, not essential) after a nested-animation bug there once crash-looped
 * the Android WebView badly enough to prevent it, and everything after it, from
 * ever painting. Logs the error so it's still visible in the console/logcat.
 */
export class ErrorBoundary extends Component<PropsWithChildren<{ fallback?: React.ReactNode }>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
