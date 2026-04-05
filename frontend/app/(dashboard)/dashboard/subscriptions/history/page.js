"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonTableRows } from "@/components/ui/skeleton";
import { Search, ArrowLeft } from "lucide-react";

const PAGE_SIZE = 10;

const toTitleCase = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return "-";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function SubscriptionHistoryPage() {
  const { user } = useAuthStore();
  const role = String(user?.role || "").toLowerCase();
  const canManage = role === "admin" || role === "internal";

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!canManage) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await fetchApi("/portal/purchases/history", { method: "GET" });
        const data = response?.data ?? response;
        setRecords(data?.history || []);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [canManage]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return records.filter((item) => {
      const orderNumber = String(item?.orderNumber || "").toLowerCase();
      const subscriptionNumber = String(item?.subscriptionNumber || "").toLowerCase();
      const buyer = String(item?.buyerName || "").toLowerCase();
      const email = String(item?.buyerEmail || "").toLowerCase();
      const planName = String(item?.planName || "").toLowerCase();
      return (
        orderNumber.includes(term) ||
        subscriptionNumber.includes(term) ||
        buyer.includes(term) ||
        email.includes(term) ||
        planName.includes(term)
      );
    });
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!canManage) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">You do not have access to subscription history.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal Purchase History</h1>
          <p className="mt-2 text-muted-foreground">Users who purchased subscriptions from the user panel.</p>
        </div>
        <Link href="/dashboard/subscriptions">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Subscriptions</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-border/50 p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder="Search by order, subscription, buyer, email, or plan"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Buyer</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Order Status</th>
                <th className="px-6 py-4">Purchased At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6}><SkeletonTableRows rows={6} cols={6} /></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No history records found.</td></tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id || item.orderNumber} className="hover:bg-muted/10">
                    <td className="px-6 py-4 font-medium text-primary">{item.orderNumber || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.buyerName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{item.buyerEmail || "-"}</div>
                    </td>
                    <td className="px-6 py-4">{item.subscriptionNumber || "-"}</td>
                    <td className="px-6 py-4">{item.planName || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{toTitleCase(item.orderStatus)}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(item.purchasedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 text-sm text-muted-foreground">
          <span>Page {safePage} of {totalPages}</span>
          <div className="space-x-2">
            <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
