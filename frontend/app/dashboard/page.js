"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="w-full rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to your Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Hello there, <span className="font-semibold text-primary">{user?.name || user?.email || "User"}</span>! Start building your Next.js application.
      </p>

      <div className="mt-8">
        <Button onClick={handleLogout} variant="default">
          Sign out
        </Button>
      </div>
    </div>
  );
}
