"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { canAccessDashboard } from "@/lib/rbac/permissions";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  BarChart3,
  Lock,
  Workflow,
  TrendingUp,
  Shield,
  Clock,
  Repeat,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useAuthStore.persist;

    if (!persistApi) {
      setHydrated(true);
      return undefined;
    }

    const hasHydrated = typeof persistApi.hasHydrated === "function" ? persistApi.hasHydrated() : true;
    setHydrated(Boolean(hasHydrated));

    if (typeof persistApi.onFinishHydration === "function") {
      const unsubscribe = persistApi.onFinishHydration(() => {
        setHydrated(true);
      });
      return unsubscribe;
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!hydrated || !token) return;

    const role = String(user?.role || "user").toLowerCase();
    if (canAccessDashboard(role)) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, user, router]);

  if (!hydrated) {
    return null;
  }

  const currentRole = String(user?.role || "user").toLowerCase();
  const isPortalUser = Boolean(token) && !canAccessDashboard(currentRole);

  if (isPortalUser) {
    return (
      <PortalShell
        title={`Welcome back, ${user?.name || "there"}`}
        subtitle="Your subscription cockpit: discover plans, manage active subscriptions, and stay billing-ready."
      >
        <section>
          <div className="grid gap-6 lg:grid-cols-3">
            <Link href="/shop" className="group rounded-3xl border border-border/50 bg-card/70 p-7 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-card/90 lg:col-span-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <ShoppingBag className="h-6 w-6" />
            </div>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">Subscription Shop</h3>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Browse curated public subscriptions, compare terms clearly, and add the right plan to cart in seconds.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
                Explore plans <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            <div className="rounded-3xl border border-border/50 bg-card/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick Actions</p>
              <div className="mt-4 space-y-3">
                <Link href="/cart" className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-4 py-3 text-sm font-medium transition hover:border-cyan-300/40 hover:bg-background/70">
                  Open Cart
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                </Link>
                <Link href="/my-account" className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-4 py-3 text-sm font-medium transition hover:border-cyan-300/40 hover:bg-background/70">
                  View Account
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                </Link>
                <Link href="/my-invoices" className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-4 py-3 text-sm font-medium transition hover:border-cyan-300/40 hover:bg-background/70">
                  Billing & Invoices
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                </Link>
              </div>
            </div>

            <Link href="/my-subscriptions" className="group rounded-3xl border border-border/50 bg-card/70 p-7 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-card/90 lg:col-span-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                <Repeat className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">My Subscriptions</h3>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Monitor lifecycle stages, renewal dates, and order progress from a single timeline-friendly workspace.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">
                Open subscriptions <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>
      </PortalShell>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 bottom-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-cyan-400 to-emerald-400 text-lg font-black text-white shadow-lg shadow-primary/40">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">SubNest</p>
              <p className="text-xs text-muted-foreground">Subscription Ops</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="rounded-full px-6 font-medium">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-full px-6 font-medium gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            Subscription commerce reimagined
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
            <span className="block mb-3">Run Your Subscription</span>
            <span className="block bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Business Like a Pro
            </span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            All-in-one platform for managing products, plans, invoices, approvals, and
            Stripe payments. Stop juggling tools. Start scaling faster.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold gap-2">
                Start Building <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base font-semibold">
                Sign In to Portal
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>99.9% uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Stripe ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Role-based control</span>
            </div>
          </div>
        </div>

        {/* Demo/showcase area */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10" />
          </div>
          <div className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl p-8 sm:p-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/50 bg-background/40 p-6 hover:bg-background/60 transition-colors"
                >
                  <feature.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="mt-20 grid sm:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 text-center"
            >
              <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                {stat.number}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 rounded-3xl border border-border/50 bg-gradient-to-r from-primary/15 via-cyan-500/15 to-emerald-500/15 backdrop-blur-xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to transform your subscription ops?</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Join teams already using SubNest to streamline their billing, manage invoices, and grow revenue.
          </p>
          <Link href="/signup">
            <Button size="lg" className="rounded-full px-8 h-12 mt-8 text-base font-semibold">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    icon: BarChart3,
    title: "Complete Visibility",
    description: "Real-time dashboards for products, plans, invoices, and revenue metrics.",
  },
  {
    icon: Workflow,
    title: "Approval Workflows",
    description: "Role-based approvals for sensitive actions with audit trails.",
  },
  {
    icon: Lock,
    title: "Secure by Default",
    description: "Role-safe access controls and Stripe-powered secure checkout.",
  },
  {
    icon: TrendingUp,
    title: "Scale Effortlessly",
    description: "Built for growth with features that scale with your business.",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "Compliance-friendly with detailed activity logs and approval trails.",
  },
  {
    icon: Clock,
    title: "Quick Setup",
    description: "Get started in minutes. No complex configuration needed.",
  },
];

const stats = [
  { number: "99.9%", label: "Payment uptime" },
  { number: "30s", label: "Average setup time" },
  { number: "10x", label: "Faster than custom tools" },
];

