"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { Search, Sparkles, BadgeDollarSign, ShoppingCart } from "lucide-react";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function ShopPage() {
  const router = useRouter();
  const addSubscription = useCartStore((state) => state.addSubscription);
  const [subscriptions, setSubscriptions] = useState([]);
  const [mySubscriptionIds, setMySubscriptionIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [catalogData, assignedData] = await Promise.all([
          fetchApi("/portal/subscriptions"),
          fetchApi("/my/subscriptions"),
        ]);

        const catalog = (catalogData?.data?.subscriptions || []).filter((item) => item?.isPublic ?? item?.is_public ?? true);
        const assigned = assignedData?.data?.subscriptions || [];

        setSubscriptions(catalog);
        setMySubscriptionIds(new Set(assigned.map((item) => item.id)));
      } catch (err) {
        setError(err.message || "Unable to load public subscriptions");
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const filtered = subscriptions.filter((item) => {
      const haystack = [item.subscriptionNumber, item.planName, item.paymentTerms]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const amount = Number(item.amountTotal || 0);
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesPrice = amount >= Number(minPrice || 0) && amount <= Number(maxPrice || 100000);
      return matchesSearch && matchesPrice;
    });

    filtered.sort((a, b) => {
      if (sortBy === "price-asc") return Number(a.amountTotal || 0) - Number(b.amountTotal || 0);
      if (sortBy === "price-desc") return Number(b.amountTotal || 0) - Number(a.amountTotal || 0);
      if (sortBy === "plan") return String(a.planName || "").localeCompare(String(b.planName || ""));
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return filtered;
  }, [subscriptions, search, minPrice, maxPrice, sortBy]);

  const addToCart = (subscription) => {
    if (!subscription || !subscription.id) return;
    setAddingId(subscription.id);
    setError("");
    setMessage("");
    try {
      addSubscription(subscription);
      setMessage("Subscription added to cart!");
      setTimeout(() => {
        router.push("/cart");
      }, 800);
    } catch (err) {
      setError(err.message || "Unable to add subscription to cart");
      setAddingId("");
    }
  };

  return (
    <PortalShell
      title="Subscription Shop"
      subtitle="Browse public subscriptions created by admin and internal teams, then purchase directly from here."
    >
      {message ? <p className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

      <div className="rounded-[1.75rem] border border-border/50 bg-card/70 p-4 shadow-lg backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_140px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by number, plan, or terms" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-border bg-input px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="plan">Plan Name</option>
          </select>
          <Input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" />
          <Input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" />
          <Link href="/my-subscriptions">
            <Button variant="secondary" className="w-full rounded-full">Open My Subscriptions</Button>
          </Link>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-[1.5rem] border border-border/50 bg-card/60" />)
        ) : filteredSubscriptions.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-border/50 bg-card/60 p-10 text-center text-muted-foreground">
            No public subscriptions match your filters.
          </div>
        ) : (
          filteredSubscriptions.map((subscription) => {
            const isSubscribed = mySubscriptionIds.has(subscription.id);
            return (
            <article key={subscription.id} className="overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/70 shadow-lg transition-transform hover:-translate-y-1">
              <div className="h-44 bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-800 p-5 text-white">
                <div className="flex h-full flex-col justify-between">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] opacity-95">
                    <Sparkles className="h-3 w-3" /> Public Subscription
                  </span>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">Total amount</p>
                    <p className="text-3xl font-semibold">{money(subscription.amountTotal)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-xl font-semibold">{subscription.subscriptionNumber || subscription.id}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Plan: {subscription.planName || "-"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Terms: {subscription.paymentTerms || "-"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Start: {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "-"}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <BadgeDollarSign className="h-3.5 w-3.5" /> {subscription.status || "Draft"}
                  </span>
                  <Button
                    className="rounded-full"
                    disabled={isSubscribed || addingId === subscription.id}
                    onClick={() => addToCart(subscription)}
                  >
                    {isSubscribed ? "Subscribed" : addingId === subscription.id ? (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          );})
        )}
      </div>
    </PortalShell>
  );
}
