"use client";

import { useAuthStore } from "@/store/authStore";
import { canAccessConfiguration } from "@/lib/rbac/permissions";

export default function ConfigurationLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  if (!canAccessConfiguration(role)) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Configuration access is restricted to admins.
      </div>
    );
  }

  return children;
}
