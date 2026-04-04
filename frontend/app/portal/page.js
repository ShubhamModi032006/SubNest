"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, Layout } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function PortalPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8 selection:bg-primary/20">
        <div className="w-full max-w-2xl rounded-3xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl sm:p-12 relative overflow-hidden">
          {/* Decorative Background Accents */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          
          <div className="relative flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 text-primary mb-6 shadow-inner ring-1 ring-primary/20">
              <Layout className="h-10 w-10" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome to the User Portal
            </h1>
            
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-lg text-muted-foreground">
                Hello there, <span className="font-semibold text-primary">{user?.name || user?.email || "User"}</span>!
              </p>
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20">
                {user?.role || "USER"} ACCOUNT
              </span>
            </div>
            
            <p className="mt-6 max-w-md text-sm text-muted-foreground leading-relaxed text-balance">
              This space is dedicated to end-user portal access. 
              The internal administrative dashboard is restricted to authorized personnel. 
              Further interactive features will be available here soon.
            </p>

            <div className="mt-10">
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="lg" 
                className="rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300 gap-2 font-medium shadow-sm hover:shadow-destructive/20"
              >
                <LogOut className="h-5 w-5" />
                Sign out securely
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
