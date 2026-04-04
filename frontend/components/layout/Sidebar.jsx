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
  FileText,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import {
  isAdmin,
  isInternal,
  normalizeRole,
  canAccessConfiguration,
} from "@/lib/rbac/permissions";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "internal"] },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard, roles: ["admin", "internal"] },
  { name: "Invoices", href: "/dashboard/invoices", icon: ReceiptText, roles: ["admin", "internal"] },
  { name: "Products", href: "/dashboard/products", icon: Box, roles: ["admin", "internal"] },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users, roles: ["admin", "internal"] },
  { name: "Approvals", href: "/dashboard/approvals", icon: ShieldCheck, roles: ["admin", "internal"] },
  { name: "Quotation Templates", href: "/dashboard/quotation-templates", icon: FileText, roles: ["admin"] },
  { name: "Users", href: "/dashboard/users", icon: Users, roles: ["admin"] },
  { name: "Reporting", href: "/reporting", icon: BarChart3, roles: ["admin"] },
  { name: "My Profile", href: "/profile", icon: UserCircle, roles: ["admin"] },
];

const configurationItems = [
  { name: "Plans", href: "/dashboard/configuration/plans", icon: Tag },
  { name: "Taxes", href: "/dashboard/configuration/taxes", icon: Receipt },
  { name: "Discounts", href: "/dashboard/configuration/discounts", icon: BadgePercent },
];

export function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = normalizeRole(user?.role);
  const admin = isAdmin(userRole);
  const internal = isInternal(userRole);
  const allowConfiguration = canAccessConfiguration(userRole);

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
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
                "mr-3 h-5 w-5 shrink-0 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="flex items-center gap-2">
                {item.name}
                {internal && item.name === "Products" ? (
                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    Restricted
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}

        {allowConfiguration ? (
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
                      "mr-3 h-4 w-4 shrink-0 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {!admin && internal ? (
          <p className="mt-4 rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Internal role has operational access only. Pricing, user management and destructive actions require admin approval.
          </p>
        ) : null}
      </nav>
    </aside>
  );
}
