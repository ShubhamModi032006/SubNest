"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchApi } from "@/lib/api";
import { useTheme } from "@/components/providers/ThemeProvider";
import { subscribeToToasts } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Search, Bell, Moon, Sun } from "lucide-react";

const buildQuickPath = (result) => {
  if (result.kind === "product") return `/dashboard/products/${result.id}`;
  if (result.kind === "subscription") return `/dashboard/subscriptions/${result.id}`;
  if (result.kind === "user") return `/dashboard/users/${result.id}`;
  return "/dashboard";
};

export function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "seed_payment",
      type: "Payment success",
      message: "Latest payment captured successfully.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed_invoice",
      type: "Invoice generated",
      message: "A new invoice was generated from subscription flow.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed_approval",
      type: "Approval updates",
      message: "A request was recently reviewed by admin.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      let type = "System update";
      const text = String(toast.message || "").toLowerCase();
      if (toast.type === "error") type = "System alert";
      if (toast.type === "warning") type = "Action required";
      if (toast.type === "success") type = "Update";
      if (toast.type === "info") type = "Info";
      if (text.includes("payment")) type = "Payment success";
      if (text.includes("invoice")) type = "Invoice generated";
      if (text.includes("approval")) type = "Approval updates";

      setNotifications((prev) => [
        {
          id: toast.id,
          type,
          message: toast.message,
          createdAt: toast.createdAt,
        },
        ...prev,
      ].slice(0, 8));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const [productsRes, subscriptionsRes, usersRes] = await Promise.allSettled([
          fetchApi("/products"),
          fetchApi("/subscriptions"),
          fetchApi("/users"),
        ]);

        const normalized = [];

        if (productsRes.status === "fulfilled") {
          (productsRes.value?.products || []).forEach((item) => {
            if (String(item?.name || "").toLowerCase().includes(term.toLowerCase())) {
              normalized.push({ kind: "product", id: item.id, label: item.name, meta: item.type || "Product" });
            }
          });
        }

        if (subscriptionsRes.status === "fulfilled") {
          (subscriptionsRes.value?.subscriptions || []).forEach((item) => {
            const number = item.subscription_number || item.subscriptionNumber || "";
            if (String(number).toLowerCase().includes(term.toLowerCase())) {
              normalized.push({ kind: "subscription", id: item.id, label: number, meta: item.status || "Subscription" });
            }
          });
        }

        if (usersRes.status === "fulfilled") {
          (usersRes.value?.users || []).forEach((item) => {
            const name = item.name || item.email || "User";
            if (String(name).toLowerCase().includes(term.toLowerCase())) {
              normalized.push({ kind: "user", id: item.id, label: name, meta: item.role || "User" });
            }
          });
        }

        setResults(normalized.slice(0, 8));
      } finally {
        setLoadingSearch(false);
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [search]);

  const unreadCount = useMemo(() => notifications.length, [notifications.length]);

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

      <div className="flex items-center gap-3">
        <div ref={searchRef} className="relative hidden w-80 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, subscriptions, users"
            className="h-10 w-full rounded-xl border border-border/60 bg-background/70 pl-9 pr-3 text-sm outline-none ring-primary transition focus:ring-2"
          />
          {searchOpen ? (
            <div className="absolute right-0 top-12 z-40 w-full rounded-xl border border-border/60 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
              {loadingSearch ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No quick results</p>
              ) : (
                <div className="space-y-1">
                  {results.map((result) => (
                    <Link
                      key={`${result.kind}_${result.id}`}
                      href={buildQuickPath(result)}
                      onClick={() => setSearchOpen(false)}
                      className="block rounded-lg border border-transparent px-3 py-2 transition hover:border-border hover:bg-muted/20"
                    >
                      <p className="text-sm font-medium">{result.label}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{result.kind} · {result.meta}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-card/60 transition hover:bg-muted/20"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-card/60 transition hover:bg-muted/20"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-12 z-40 w-80 rounded-xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent notifications</p>
              <div className="space-y-2">
                {notifications.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-primary">{item.type}</p>
                    <p className="mt-1 text-sm">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

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
