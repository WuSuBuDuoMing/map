/**
 * React error boundary component.
 *
 * Catches rendering errors in its child tree and displays a fallback UI
 * with an error message and a retry button. If no custom `fallback` prop
 * is provided, a default Chinese-language error card is rendered.
 *
 * @module components/ErrorBoundary
 */

"use client";

import React from "react";

/** Internal state tracking whether an error has been caught. */
type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error boundary that catches rendering errors in its child tree.
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-[#D8DDD8] bg-[#FAFBF7] p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-[#5A6670]">出错了</p>
            <p className="mt-2 text-sm text-[#5A6670]/60">
              {this.state.error?.message || "发生了未知错误"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-lg bg-[#E8B8C2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#D4A0AC]"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
