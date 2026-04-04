"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function MyInvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const [invoiceData, orderData] = await Promise.all([
          fetchApi("/my/invoices"),
          fetchApi("/my/orders"),
        ]);
        setInvoices(invoiceData.invoices || []);
        setOrders(orderData.orders || []);
      } catch (err) {
        setError(err.message || "Unable to load invoices");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) loadInvoices();
  }, [user]);

  const payNow = async (invoiceId) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const data = await fetchApi("/payments/create-session", {
      method: "POST",
      body: JSON.stringify({
        invoice_id: invoiceId,
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}&source=portal`,
        cancel_url: `${origin}/payment/cancel?invoice_id=${invoiceId}&source=portal`,
      }),
    });
    window.location.assign(data.session.url || data.session.checkoutUrl);
  };

  const orderIdByInvoice = new Map(orders.map((order) => [order.invoiceId, order.id]));

  return (
    <ProtectedRoute>
      <PortalShell title="My invoices" subtitle="Review invoice totals and pay or download from the portal.">
        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading invoices...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-red-200">{error}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No invoices found.</td></tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">{invoice.paymentStatus || invoice.status}</td>
                    <td className="px-4 py-3 font-semibold">{money(invoice.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {String(invoice.paymentStatus || invoice.status).toLowerCase() !== "paid" ? (
                          <Button size="sm" className="rounded-full" onClick={() => payNow(invoice.id)}>Pay Now</Button>
                        ) : null}
                        <Button variant="secondary" size="sm" className="rounded-full" onClick={() => window.print()}>Download</Button>
                        <Link href={`/my-orders/${orderIdByInvoice.get(invoice.id) || invoice.orderId || invoice.linkedSubscriptionId}`} className="text-primary hover:underline">View order</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PortalShell>
    </ProtectedRoute>
  );
}
