"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import SubscriptionGrowthChart from "@/components/charts/SubscriptionGrowthChart";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonthKey = (dateValue) => {
  const date = new Date(dateValue || Date.now());
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const buildTrendSeries = (invoices = []) => {
  const buckets = new Map();

  invoices.forEach((invoice) => {
    const key = getMonthKey(invoice.invoiceDate || invoice.createdAt);
    if (!key) return;

    const amount = Number(invoice.grandTotal || invoice.total || 0);
    buckets.set(key, (buckets.get(key) || 0) + amount);
  });

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: monthLabels[date.getMonth()],
      value: Math.round(buckets.get(key) || 0),
    };
  });
};

const buildSubscriptionStats = (subscriptions = []) => {
  const counts = subscriptions.reduce((acc, subscription) => {
    const status = String(subscription.status || "unknown");
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([status, total]) => ({ status, total }))
    .sort((left, right) => Number(right.total) - Number(left.total));
};

function MetricCard({ label, value, tone = "text-primary" }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-lg">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [invoicesData, subscriptionsData] = await Promise.all([
          fetchApi("/invoices", { silentErrorToast: true }),
          fetchApi("/subscriptions", { silentErrorToast: true }),
        ]);
        setInvoices(invoicesData.invoices || []);
        setSubscriptions(subscriptionsData.subscriptions || []);
        setLoadError("");
      } catch (error) {
        setLoadError(error?.message || "Unable to load reporting data");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const metrics = useMemo(() => {
    const paidInvoices = invoices.filter((invoice) => {
      const paymentStatus = String(invoice.paymentStatus || invoice.status || "").toLowerCase();
      return paymentStatus.includes("paid") || paymentStatus === "confirmed";
    });

    const overdueInvoices = invoices.filter((invoice) => {
      const paymentStatus = String(invoice.paymentStatus || invoice.status || "").toLowerCase();
      return paymentStatus === "unpaid" || paymentStatus === "overdue";
    }).length;

    const revenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal || invoice.total || 0), 0);
    const activeSubscriptions = subscriptions.filter((subscription) => String(subscription.status || "").toLowerCase() === "active").length;
    const monthlyGrowth = paidInvoices.length > 1
      ? Math.round(((Number(paidInvoices[paidInvoices.length - 1]?.grandTotal || 0) - Number(paidInvoices[0]?.grandTotal || 0)) / Math.max(Number(paidInvoices[0]?.grandTotal || 1), 1)) * 100)
      : 0;

    return { revenue, activeSubscriptions, overdueInvoices, monthlyGrowth };
  }, [invoices, subscriptions]);

  const monthlySeries = useMemo(() => buildTrendSeries(invoices), [invoices]);
  const subscriptionStats = useMemo(() => buildSubscriptionStats(subscriptions), [subscriptions]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Admin reporting</p>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Operational metrics for revenue, subscriptions, and invoice health.</p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {loadError}
        </div>
      ) : null}

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
            <RevenueTrendChart data={monthlySeries} />
            <SubscriptionGrowthChart stats={subscriptionStats} />
          </div>
        </>
      )}
    </div>
  );
}