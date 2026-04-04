"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { ShoppingCart, Home, Store, UserRound, Loader2, LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/my-account", label: "My Account", icon: UserRound },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
];

export function PortalShell({ title, subtitle, children, showBackdrop = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const { user, token, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(useAuthStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !token) {
      router.replace("/login");
    }
  }, [hydrated, user, token, router]);

  if (!hydrated || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground", showBackdrop && "selection:bg-primary/20")}>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-24 top-36 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-400 text-sm font-black text-white shadow-lg shadow-primary/20">
              S
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">SubNest</p>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Signed in</span>
                <span className="text-sm font-medium">{user.name || user.email}</span>
              </div>
            ) : null}
            <Link href="/cart" className="relative rounded-full border border-border/50 bg-card/60 px-4 py-2 text-sm font-medium">
              Cart
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">{cartCount}</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {(title || subtitle) ? (
          <div className="mb-8 space-y-2">
            {title ? <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1> : null}
            {subtitle ? <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
