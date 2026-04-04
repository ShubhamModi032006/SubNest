"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalsCalculator = useCartStore((state) => state.totals);
  const clearCart = useCartStore((state) => state.clearCart);
  const customer = useCartStore((state) => state.customer);
  const setCustomer = useCartStore((state) => state.setCustomer);
  const discountCode = useCartStore((state) => state.discountCode);
  const refreshPricing = useCartStore((state) => state.refreshPricing);
  const pricingLoading = useCartStore((state) => state.pricingLoading);
  const pricingError = useCartStore((state) => state.pricingError);
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const totals = useMemo(() => totalsCalculator(), [items, discountCode, totalsCalculator]);

  const formCustomer = useMemo(
    () => ({
      name: customer.name || user?.name || "",
      email: customer.email || user?.email || "",
      address: customer.address || user?.address || "",
    }),
    [customer, user]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const livePricing = await refreshPricing();
      
      // Create invoice/order from cart
      const orderData = await fetchApi("/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: {
            name: formCustomer.name,
            email: formCustomer.email,
            address: formCustomer.address,
          },
          items,
          discountCode,
          discountAmount: livePricing.discountTotal,
          subtotal: livePricing.subtotal,
          tax: livePricing.tax,
          total: livePricing.total,
        }),
      });

      const invoiceId = orderData?.data?.invoice?.id;
      if (!invoiceId) {
        throw new Error("Failed to create invoice");
      }

      // Create Stripe payment session
      const paymentSession = await fetchApi("/payment/create-session", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          success_url: `${window.location.origin}/order-success`,
          cancel_url: `${window.location.origin}/checkout`,
        }),
      });

      const sessionUrl = paymentSession?.data?.session?.url;
      if (sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = sessionUrl;
      } else {
        throw new Error("Failed to create Stripe payment session");
      }
    } catch (err) {
      setError(err.message || "Checkout failed");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) return;
    refreshPricing().catch(() => null);
  }, [items, discountCode, refreshPricing]);

  return (
    <PortalShell title="Checkout" subtitle="Review your customer details and proceed to secure Stripe payment to complete the purchase.">
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={formCustomer.name} onChange={(e) => setCustomer({ name: e.target.value })} className="mt-2" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formCustomer.email} onChange={(e) => setCustomer({ email: e.target.value })} className="mt-2" required />
              </div>
            </div>
            <div className="mt-4">
              <Label>Address</Label>
              <Input value={formCustomer.address} onChange={(e) => setCustomer({ address: e.target.value })} className="mt-2" required />
            </div>
          </div>

          {error ? <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          {pricingError ? <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{pricingError}</p> : null}

          <Button type="submit" disabled={submitting || pricingLoading || items.length === 0} className="rounded-full px-6 w-full">
            {submitting ? "Processing Payment..." : "Proceed to Stripe"}
          </Button>
        </section>

        <aside className="space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="space-y-3 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/40 p-3">
                <div>
                  <p className="font-medium">
                    {item.itemType === "subscription" ? item.subscriptionNumber : item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.itemType === "subscription" 
                      ? `${item.planName || "Subscription"} - Qty ${item.quantity}`
                      : `${item.variantLabel} · ${item.planLabel} · Qty ${item.quantity}`
                    }
                  </p>
                </div>
                <p className="font-semibold">{money(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm">
            <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Tax</span><span>{money(totals.tax)}</span></div>
            <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Discount</span><span>-{money(totals.discountTotal)}</span></div>
            <div className="my-3 border-t border-border/50" />
            <div className="flex items-center justify-between text-base font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
          </div>
          <Link href="/cart" className="text-sm font-medium text-primary hover:underline">Back to cart</Link>
        </aside>
      </form>
    </PortalShell>
  );
}
