"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchApi } from "@/lib/api";
import { BarChart3, Users, CreditCard } from "lucide-react";
import { SkeletonCard } from "@/components/ui/skeleton";

const RevenueTrendChart = dynamic(() => import("@/components/charts/RevenueTrendChart"), {
  loading: () => <SkeletonCard />,
});

const SubscriptionGrowthChart = dynamic(() => import("@/components/charts/SubscriptionGrowthChart"), {
  loading: () => <SkeletonCard />,
});

const money = (value) => `$${Number(value || 0).toLocaleString()}`;

const AnimatedKpiCard = memo(function AnimatedKpiCard({ label, targetValue, prefix = "", suffix = "", icon: Icon, tone = "text-primary" }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame;
    let start;
    const duration = 680;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.round(Number(targetValue || 0) * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetValue]);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className={`mt-3 text-3xl font-semibold ${tone}`}>
            {prefix}{value.toLocaleString()}{suffix}
          </p>
        </div>
        <span className="rounded-xl border border-border/50 bg-background/50 p-2 text-primary transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
    </article>
  );
});

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, activeSubscriptions: 0, paidInvoices: 0 });
  const [trend, setTrend] = useState([]);
  const [growthStats, setGrowthStats] = useState([]);
  const [publicSubscriptions, setPublicSubscriptions] = useState([]);
  const [publicLoading, setPublicLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryData, trendData, subscriptionStats, invoiceData, catalogData] = await Promise.all([
          fetchApi("/reports/summary"),
          fetchApi("/reports/revenue-trend"),
          fetchApi("/reports/subscription-stats"),
          fetchApi("/invoices"),
          fetchApi("/portal/subscriptions").catch(() => ({ data: { subscriptions: [] } })),
        ]);

        const paidInvoices = (invoiceData?.data?.invoices || []).filter((item) => String(item.status || "").toLowerCase() === "paid").length;
        setSummary({
          totalRevenue: Number(summaryData?.data?.summary?.totalRevenue || 0),
          activeSubscriptions: Number(summaryData?.data?.summary?.activeSubscriptions || 0),
          paidInvoices,
        });
        setTrend(trendData?.data?.trend || []);
        setGrowthStats(subscriptionStats?.data?.stats || []);
        setPublicSubscriptions((catalogData?.data?.subscriptions || []).filter((subscription) => Boolean(subscription?.is_public ?? subscription?.isPublic)));
      } finally {
        setLoading(false);
        setPublicLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const kpis = useMemo(() => [
    { label: "Revenue", value: Math.round(summary.totalRevenue || 0), prefix: "$", icon: BarChart3, tone: "text-emerald-300" },
    { label: "Active Subscriptions", value: Math.round(summary.activeSubscriptions || 0), icon: CreditCard, tone: "text-cyan-300" },
    { label: "Paid Invoices", value: Math.round(summary.paidInvoices || 0), icon: Users, tone: "text-violet-300" },
  ], [summary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user?.name || user?.email || "User"}</h1>
        <p className="mt-2 text-muted-foreground">
          Here is an overview of your workspace with live KPIs and growth insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
          : kpis.map((item) => (
              <AnimatedKpiCard
                key={item.label}
                label={item.label}
                targetValue={item.value}
                prefix={item.prefix}
                suffix={item.suffix}
                icon={item.icon}
                tone={item.tone}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RevenueTrendChart data={trend} />
        <SubscriptionGrowthChart stats={growthStats} />
      </div>

      <section className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Public subscription offers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Browse subscriptions that can be purchased from the user portal.</p>
          </div>
          <a href="/my-subscriptions" className="text-sm font-medium text-primary hover:underline">Open My Subscriptions</a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
          ) : publicSubscriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No public subscription offers are available right now.
            </div>
          ) : (
            publicSubscriptions.slice(0, 3).map((subscription) => (
              <article key={subscription.id} className="rounded-2xl border border-border/50 bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public offer</p>
                <h3 className="mt-2 text-base font-semibold text-foreground">{subscription.subscriptionNumber || subscription.id}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{subscription.planName || subscription.recurringPlanLabel || subscription.plan?.name || "Subscription plan"}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{subscription.status || "Draft"}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-border/50 bg-card/70 p-5 text-sm text-muted-foreground">
        <p>
          Snapshot: Revenue <span className="font-semibold text-foreground">{money(summary.totalRevenue)}</span>, Active subscriptions <span className="font-semibold text-foreground">{summary.activeSubscriptions}</span>, Paid invoices <span className="font-semibold text-foreground">{summary.paidInvoices}</span>.
        </p>
      </div>
    </div>
  );
}
