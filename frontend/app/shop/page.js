"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";
import { Search } from "lucide-react";

const categories = ["all", "Services", "Software", "Consulting", "Goods"];

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchApi("/portal/products");
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message || "Unable to load products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !search || [product.name, product.description, ...(product.tags || [])].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      const matchesPrice = product.basePrice >= Number(minPrice || 0) && product.basePrice <= Number(maxPrice || 1000);
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [products, search, category, minPrice, maxPrice]);

  return (
    <PortalShell
      title="Shop"
      subtitle="Search products, narrow by category, and compare price ranges before building a cart."
    >
      <div className="rounded-[1.75rem] border border-border/50 bg-card/70 p-4 shadow-lg backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_140px_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-border bg-input px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>)}
          </select>
          <Input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" />
          <Input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" />
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-[1.5rem] border border-border/50 bg-card/60" />)
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-border/50 bg-card/60 p-10 text-center text-muted-foreground">
            No products match your filters.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/70 shadow-lg transition-transform hover:-translate-y-1">
              <div className={`h-44 bg-gradient-to-br ${product.accent} p-5 text-white`}>
                <div className="flex h-full flex-col justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] opacity-90">{product.category}</span>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">Starting at</p>
                    <p className="text-3xl font-semibold">${product.basePrice}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-xl font-semibold">{product.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(product.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/product/${product.id}`}>
                  <Button className="w-full rounded-full">View product</Button>
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </PortalShell>
  );
}
