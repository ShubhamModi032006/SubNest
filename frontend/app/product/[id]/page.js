"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { ShoppingCart } from "lucide-react";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantId, setVariantId] = useState("");
  const [planId, setPlanId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchApi(`/portal/products?id=${encodeURIComponent(params.id)}`);
        setProduct(data.product);
        setVariantId(data.product?.variants?.[0]?.id || "");
        setPlanId(data.product?.plans?.[0]?.id || "");
      } catch (err) {
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  const pricing = useMemo(() => {
    if (!product) return null;
    const variant = product.variants?.find((item) => item.id === variantId) || product.variants?.[0] || null;
    const plan = product.plans?.find((item) => item.id === planId) || product.plans?.[0] || null;
    const unitPrice = Number(product.basePrice || 0) + Number(variant?.extraPrice || 0) + Number(plan?.recurringPrice || 0);
    return { variant, plan, unitPrice, total: unitPrice * quantity };
  }, [product, variantId, planId, quantity]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, { variantId, planId, quantity });
    router.push("/cart");
  };

  return (
    <PortalShell title={product?.name || "Product details"} subtitle={product?.description || "Choose a variant and plan, then add it to your cart."}>
      {loading ? (
        <div className="rounded-[1.75rem] border border-border/50 bg-card/60 p-6 animate-pulse h-96" />
      ) : error ? (
        <div className="rounded-[1.75rem] border border-red-300/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>
      ) : product ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-border/50 bg-card/70 p-6">
            <div className={`rounded-[1.5rem] bg-gradient-to-br ${product.accent} p-6 text-white`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">{product.category}</p>
                  <h2 className="mt-2 text-3xl font-semibold">{product.name}</h2>
                </div>
                <div className="rounded-2xl border border-white/30 px-4 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">Base price</p>
                  <p className="text-2xl font-semibold">{money(product.basePrice)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Variant</p>
                <div className="grid gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setVariantId(variant.id)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${variantId === variant.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-background/60 hover:bg-white/5"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{variant.label}</span>
                        <span className="text-xs text-muted-foreground">+{money(variant.extraPrice)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Plan</p>
                <div className="grid gap-2">
                  {product.plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${planId === plan.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-background/60 hover:bg-white/5"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{plan.label}</span>
                        <span className="text-xs text-muted-foreground">+{money(plan.recurringPrice)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[120px_1fr]">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Qty</p>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))} />
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dynamic pricing</p>
                <p className="mt-2 text-3xl font-semibold">{money(pricing?.unitPrice)}</p>
                <p className="text-sm text-muted-foreground">Total for {quantity} item(s): {money(pricing?.total)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleAddToCart} className="gap-2 rounded-full px-6">
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Link href="/shop">
                <Button variant="secondary" className="rounded-full px-6">Back to Shop</Button>
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-border/50 bg-card/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Highlights</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {(product.tags || []).map((tag) => (
                <li key={tag} className="rounded-xl border border-border/50 bg-background/50 px-4 py-3">{tag}</li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}
    </PortalShell>
  );
}
