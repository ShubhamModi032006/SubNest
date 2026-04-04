"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

export function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
          onClick={onMenuToggle}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-foreground">{user?.name || user?.email || "User"}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              <span className="inline-block px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                {user?.role || "USER"}
              </span>
            </span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={logout}
          className="rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
