"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { canAccessDashboard } from "@/lib/rbac/permissions";

export function DashboardLayoutWrapper({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hydrateUser, loading, token, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      // 1. If no token, redirect to login
      if (!token) {
        if (isMounted) router.replace("/login");
        return;
      }
      
      // 2. Hydrate user
      try {
        await hydrateUser();
        // Force evaluation of store state after wait
        const currentUser = useAuthStore.getState().user;
        const currentRole = (currentUser?.role || "user").toLowerCase();
        
        // 3. Non-dashboard roles redirect away from dashboard
        if (!canAccessDashboard(currentRole)) {
          if (isMounted) router.replace("/portal");
          return; // Stop here, don't show dashboard
        }
        
        if (isMounted) setIsReady(true);
      } catch (error) {
        // invalid token -> logout happens automatically in hydrateUser
        if (isMounted) router.replace("/login");
      }
    };
    
    initAuth();
    
    return () => { isMounted = false; };
  }, [token, router, hydrateUser]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!isReady || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Authenticating workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background selection:bg-primary/20">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={sidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
