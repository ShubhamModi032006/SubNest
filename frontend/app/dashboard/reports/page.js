"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function MetricCard({ label, value, tone = "text-primary" }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [summaryData, trendData, statsData] = await Promise.all([
          fetchApi("/reports/summary"),
          fetchApi("/reports/revenue-trend"),
          fetchApi("/reports/subscription-stats"),
        ]);
        setSummary(summaryData.summary || null);
        setTrend(trendData.trend || []);
        setSubscriptionStats(statsData.stats || []);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const metrics = useMemo(() => {
    const revenue = Number(summary?.totalRevenue || 0);
    const activeSubscriptions = Number(summary?.activeSubscriptions || 0);
    const overdueInvoices = Number(summary?.overdueInvoices || 0);
    const monthlyGrowth = trend.length > 1 && trend[0]?.value ? Math.round(((trend[trend.length - 1]?.value || 0) / trend[0].value) * 100) : 0;
    return { revenue, activeSubscriptions, overdueInvoices, monthlyGrowth };
  }, [summary, trend]);

  const monthlySeries = trend;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Admin reporting</p>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Operational metrics for revenue, subscriptions, and invoice health.</p>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/50 bg-card/60" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total revenue" value={money(metrics.revenue)} tone="text-emerald-300" />
            <MetricCard label="Active subscriptions" value={metrics.activeSubscriptions} tone="text-cyan-300" />
            <MetricCard label="Monthly growth" value={`${metrics.monthlyGrowth}%`} tone="text-amber-300" />
            <MetricCard label="Overdue invoices" value={metrics.overdueInvoices} tone="text-rose-300" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-border/50 bg-card/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Revenue trend</p>
              <div className="mt-6 flex h-72 items-end gap-3">
                {monthlySeries.map((bucket) => {
                  const max = Math.max(...monthlySeries.map((item) => item.value), 1);
                  const height = (bucket.value / max) * 100;
                  return (
                    <div key={bucket.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <div className="w-full rounded-t-2xl bg-gradient-to-t from-primary to-cyan-400" style={{ height: `${Math.max(8, height)}%` }} />
                      <span className="text-xs text-muted-foreground">{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-border/50 bg-card/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subscription count</p>
              <div className="mt-6 space-y-4">
                {subscriptionStats.slice(0, 6).map((subscription) => (
                  <div key={subscription.status} className="rounded-2xl border border-border/50 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{subscription.status}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{subscription.total}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Subscriptions</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
