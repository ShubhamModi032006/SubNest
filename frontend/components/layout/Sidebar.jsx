"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CreditCard, 
  Box, 
  BarChart3, 
  Users, 
  Settings, 
  UserCircle,
  Tag,
  Receipt,
  BadgePercent,
} from "lucide-react";
import { allowRoles } from "@/lib/guards/roleGuard";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard, roles: ["admin", "internal"] },
  { name: "Products", href: "/dashboard/products", icon: Box },
  { name: "Reporting", href: "/reporting", icon: BarChart3 },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "My Profile", href: "/profile", icon: UserCircle },
];

const configurationItems = [
  { name: "Plans", href: "/dashboard/configuration/plans", icon: Tag },
  { name: "Taxes", href: "/dashboard/configuration/taxes", icon: Receipt },
  { name: "Discounts", href: "/dashboard/configuration/discounts", icon: BadgePercent },
];

export function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role || "user";
  const canAccessConfiguration = allowRoles(["admin", "internal"], userRole);

  const filteredItems = menuItems.filter(
    (item) => !item.roles || allowRoles(item.roles, userRole)
  );

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 transform flex flex-col border-r border-border/50 bg-card/80 transition-transform duration-300 ease-in-out backdrop-blur-xl md:translate-x-0 md:static md:w-64",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <span className="text-2xl font-bold tracking-tight text-primary">SubNest</span>
      </div>
      
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.name}
            </Link>
          );
        })}

        {canAccessConfiguration ? (
          <div className="mt-6 rounded-xl border border-border/40 bg-muted/10 p-2">
            <div className="mb-1 flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Settings className="h-4 w-4" />
              Configuration
            </div>
            <div className="space-y-1">
              {configurationItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
