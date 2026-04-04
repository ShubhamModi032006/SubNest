"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Simple Header */}
        <header className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <h2 className="text-lg font-bold tracking-tight text-primary">Dashboard</h2>
          </div>
        </header>
        
        <main className="p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
