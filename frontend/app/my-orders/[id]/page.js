"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function MyOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const data = await fetchApi(`/my/orders/${params.id}`);
      setOrder(data.order || null);
      setSubscription(data.subscription || null);
      setInvoice(data.invoice || null);
      setLoading(false);
    };
    loadOrder();
  }, [params.id]);

  const renewSubscription = async () => {
    if (!subscription?.id) return;
    await fetchApi(`/subscriptions/${subscription.id}/renew`, { method: "POST" });
    setSubscription((prev) => prev ? { ...prev, status: "Active" } : prev);
  };

  return (
    <ProtectedRoute>
      <PortalShell title={`Order ${order?.orderNumber || params.id}`} subtitle="Products, subscription details, and invoice summary in one place.">
        {loading ? (
          <div className="h-96 animate-pulse rounded-[1.75rem] border border-border/50 bg-card/60" />
        ) : order ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Order summary</p>
                  <h2 className="text-2xl font-semibold">{order.orderNumber}</h2>
                </div>
                <span className="rounded-full border border-border/50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{order.status}</span>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.variantLabel} · {item.planLabel} · Qty {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{money(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm">
                <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Subscription</span><span>{subscription?.subscriptionNumber || subscription?.subscription_number || "-"}</span></div>
                <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Subscription status</span><span>{subscription?.status || "-"}</span></div>
                <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Invoice</span><span>{invoice?.invoiceNumber || invoice?.invoice_number || "-"}</span></div>
                <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Invoice status</span><span>{invoice?.status || "-"}</span></div>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={renewSubscription} variant="secondary" className="rounded-full">Renew subscription</Button>
                <Button onClick={() => window.print()} className="rounded-full">Download invoice</Button>
                <Link href="/my-orders" className="text-sm font-medium text-primary hover:underline">Back to orders</Link>
              </div>
            </aside>
          </div>
        ) : null}
      </PortalShell>
    </ProtectedRoute>
  );
}
