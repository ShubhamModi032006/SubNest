"use client";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { GlobalErrorBoundary } from "@/components/feedback/GlobalErrorBoundary";

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
