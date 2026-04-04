"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";
import { ArrowRight, Sparkles, ShieldCheck, ShoppingBag } from "lucide-react";

export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const data = await fetchApi("/portal/products");
        setFeatured((data.products || []).filter((product) => product.featured).slice(0, 3));
      } catch {
        setFeatured([]);
      }
    };

    loadFeaturedProducts();
  }, []);

  return (
    <PortalShell
      title="Built for customers, ready for growth"
      subtitle="Browse products, build subscriptions, manage invoices, and pay securely from the customer portal."
    >
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-border/50 bg-card/70 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Customer-first commerce
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything the customer needs in one polished flow.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Search products, configure variants and plans, complete checkout, and keep track of orders, invoices, and payment state from a dedicated portal.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop">
              <Button size="lg" className="gap-2 rounded-full px-6">
                Shop now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/my-account">
              <Button variant="secondary" size="lg" className="gap-2 rounded-full px-6">
                My account <ShieldCheck className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.75rem] border border-border/50 bg-gradient-to-br from-primary/15 to-cyan-500/10 p-6">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Shop</p>
            <p className="mt-2 text-lg font-semibold">Product discovery with filters and pricing clarity.</p>
          </div>
          <div className="rounded-[1.75rem] border border-border/50 bg-card/70 p-6">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Secure</p>
            <p className="mt-2 text-lg font-semibold">Orders, invoices, and payments stay tied to your account.</p>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Featured</p>
            <h3 className="text-2xl font-semibold">Starter catalogue</h3>
          </div>
          <Link href="/shop" className="text-sm font-medium text-primary hover:underline">
            View all products
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((product) => (
            <article key={product.id} className="rounded-[1.5rem] border border-border/50 bg-card/70 p-5 shadow-lg">
              <div className={`h-36 rounded-2xl bg-gradient-to-br ${product.accent} p-4 text-white`}>
                <div className="flex h-full items-end justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] opacity-90">{product.category}</span>
                  <span className="rounded-full border border-white/30 px-3 py-1 text-sm font-semibold">${product.basePrice}</span>
                </div>
              </div>
              <h4 className="mt-4 text-lg font-semibold">{product.name}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
              <Link href={`/product/${product.id}`} className="mt-4 inline-flex text-sm font-medium text-primary">
                Explore product
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}

