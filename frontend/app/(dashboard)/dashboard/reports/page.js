"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import SubscriptionGrowthChart from "@/components/charts/SubscriptionGrowthChart";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const getPayload = (response) => response?.data ?? response ?? {};

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
        const [invoicesResponse, subscriptionsResponse] = await Promise.all([
          fetchApi("/invoices", { silentErrorToast: true }),
          fetchApi("/subscriptions", { silentErrorToast: true }),
        ]);
        const invoicesPayload = getPayload(invoicesResponse);
        const subscriptionsPayload = getPayload(subscriptionsResponse);
        setInvoices(invoicesPayload.invoices || []);
        setSubscriptions(subscriptionsPayload.subscriptions || []);
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
      const paymentStatus = String(invoice.paymentStatus || invoice.payment_status || invoice.status || "").toLowerCase();
      return paymentStatus.includes("paid") || paymentStatus === "confirmed";
    });

    const pendingInvoices = invoices.filter((invoice) => {
      const paymentStatus = String(invoice.paymentStatus || invoice.payment_status || invoice.status || "").toLowerCase();
      return paymentStatus === "unpaid" || paymentStatus === "draft" || paymentStatus === "sent" || paymentStatus === "confirmed";
    }).length;

    const overdueInvoices = invoices.filter((invoice) => {
      const paymentStatus = String(invoice.paymentStatus || invoice.payment_status || invoice.status || "").toLowerCase();
      if (!(paymentStatus === "unpaid" || paymentStatus === "overdue" || paymentStatus === "draft" || paymentStatus === "confirmed")) {
        return false;
      }

      const dueDateRaw = invoice.dueDate || invoice.due_date;
      if (!dueDateRaw) return false;
      const dueDate = new Date(dueDateRaw);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate.getTime() < Date.now();
    }).length;

    const revenue = invoices
      .filter((invoice) => String(invoice.status || "").toLowerCase() !== "cancelled")
      .reduce((sum, invoice) => sum + Number(invoice.grandTotal || invoice.grand_total || invoice.total || invoice.total_amount || 0), 0);
    const activeSubscriptions = subscriptions.filter((subscription) => {
      const status = String(subscription.status || "").toLowerCase();
      return ["active", "confirmed", "quotation", "quotation sent"].includes(status);
    }).length;

    return { revenue, activeSubscriptions, overdueInvoices, pendingInvoices };
  }, [invoices, subscriptions]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((left, right) => {
        const leftDate = new Date(left?.invoiceDate || left?.invoice_date || left?.date || left?.createdAt || left?.created_at || 0).getTime();
        const rightDate = new Date(right?.invoiceDate || right?.invoice_date || right?.date || right?.createdAt || right?.created_at || 0).getTime();
        return rightDate - leftDate;
      })
      .slice(0, 8);
  }, [invoices]);

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
            <MetricCard label="Pending invoices" value={metrics.pendingInvoices} tone="text-amber-300" />
            <MetricCard label="Overdue invoices" value={metrics.overdueInvoices} tone="text-rose-300" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-border/50 bg-card/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live invoice activity</p>
                <a href="/dashboard/invoices" className="text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:underline">Open invoices</a>
              </div>

              <div className="mt-4 space-y-3">
                {recentInvoices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    No invoice activity available yet.
                  </div>
                ) : (
                  recentInvoices.map((invoice) => {
                    const status = String(invoice?.status || "draft").toLowerCase();
                    const paid = String(invoice?.payment_status || invoice?.paymentStatus || "").toLowerCase() === "paid" || status === "paid";
                    const dueRaw = invoice?.dueDate || invoice?.due_date;
                    const dueDate = dueRaw ? new Date(dueRaw) : null;
                    const overdue = dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now() && !paid;
                    const amount = Number(invoice?.grandTotal ?? invoice?.grand_total ?? invoice?.total_amount ?? 0);

                    return (
                      <article key={invoice?.id || invoice?.invoiceNumber || invoice?.invoice_number} className="rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{invoice?.invoiceNumber || invoice?.invoice_number || "Invoice"}</p>
                            <p className="text-xs text-muted-foreground">{invoice?.customerLabel || invoice?.customer || "Customer"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{money(amount)}</p>
                            <p className={`text-xs ${overdue ? "text-rose-300" : paid ? "text-emerald-300" : "text-amber-300"}`}>
                              {overdue ? "Overdue" : paid ? "Paid" : "Pending"}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
            <SubscriptionGrowthChart stats={subscriptionStats} />
          </div>
        </>
      )}
    </div>
  );
}