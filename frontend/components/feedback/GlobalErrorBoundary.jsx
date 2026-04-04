"use client";

import React from "react";

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "An unexpected error occurred." };
  }

  componentDidCatch(error) {
    console.error("GlobalErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card/80 p-8 text-center shadow-2xl">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground">{this.state.message}</p>
            <button
              type="button"
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
