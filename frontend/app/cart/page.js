"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cartStore";
import { Minus, Plus, Trash2, BadgePercent } from "lucide-react";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const totalsCalculator = useCartStore((state) => state.totals);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const discountCode = useCartStore((state) => state.discountCode);
  const setDiscountCode = useCartStore((state) => state.setDiscountCode);
  const totals = useMemo(() => totalsCalculator(), [items, discountCode, totalsCalculator]);

  const [code, setCode] = useState(discountCode);

  const empty = items.length === 0;

  const handleApply = () => setDiscountCode(code);

  return (
    <PortalShell title="Cart" subtitle="Review products, quantities, plans, and discounts before checkout.">
      {empty ? (
        <div className="rounded-[1.75rem] border border-border/50 bg-card/70 p-10 text-center">
          <h2 className="text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">Browse the shop and add a product to continue.</p>
          <Link href="/shop" className="mt-6 inline-flex">
            <Button className="rounded-full px-6">Go to shop</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/50 bg-background/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{item.variantLabel} · {item.planLabel}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">Unit {money(item.unitPrice)}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-full border border-border/50 p-2">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-full border border-border/50 p-2">
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="ml-auto text-sm font-semibold">{money(item.total)}</span>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-5 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Discount</p>
              <div className="mt-3 flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME10" />
                <Button variant="secondary" onClick={handleApply} className="gap-2">
                  <BadgePercent className="h-4 w-4" /> Apply
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Manual discounts are supported when the code is eligible.</p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm">
              <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Tax</span><span>{money(totals.tax)}</span></div>
              <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Discount</span><span>-{money(totals.discountTotal)}</span></div>
              <div className="my-3 border-t border-border/50" />
              <div className="flex items-center justify-between text-base font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>

            <Link href="/checkout">
              <Button className="w-full rounded-full">Checkout</Button>
            </Link>
          </aside>
        </div>
      )}
    </PortalShell>
  );
}
