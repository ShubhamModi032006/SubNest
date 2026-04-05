"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonTableRows } from "@/components/ui/skeleton";
import { Search, Plus, History } from "lucide-react";

const PAGE_SIZE = 8;
const statuses = ["All", "Draft", "Quotation", "Quotation Sent", "Confirmed", "Active", "Closed"];

export default function SubscriptionsPage() {
  const { subscriptions, loadingSubscriptions, fetchSubscriptions } = useDataStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const role = user?.role?.toLowerCase();
  const canManage = role === "admin" || role === "internal";

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter((item) => {
      const term = search.toLowerCase();
      const matchesSearch =
        item.subscriptionNumber?.toLowerCase().includes(term) ||
        item.customerLabel?.toLowerCase().includes(term) ||
        item.recurringPlanLabel?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!canManage) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">You do not have access to subscriptions.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="mt-2 text-muted-foreground">Track subscription lifecycle, quotation and order management.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/subscriptions/history">
            <Button variant="outline" className="gap-2"><History className="h-4 w-4" /> History</Button>
          </Link>
          <Link href="/dashboard/subscriptions/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Subscription</Button>
          </Link>
        </div>
      </div>

      {role === "internal" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Actions like closing or cancelling confirmed/active subscriptions require admin approval. Use the Approvals page to track request status.
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <div className="grid gap-3 border-b border-border/50 p-5 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search by number, customer, or plan" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Subscription Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Next Invoice Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingSubscriptions ? (
                  <tr><td colSpan={5}><SkeletonTableRows rows={6} cols={5} /></td></tr>
                ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No subscriptions found.</td></tr>
              ) : (
                paginated.map((item) => (
                  <tr
                    key={item.id || item.subscriptionNumber}
                    className={item.id ? "cursor-pointer hover:bg-muted/10" : "cursor-not-allowed opacity-70"}
                    onClick={() => {
                      if (!item.id) return;
                      window.location.href = `/dashboard/subscriptions/${item.id}`;
                    }}
                  >
                    <td className="px-6 py-4 font-medium text-primary">{item.subscriptionNumber}</td>
                    <td className="px-6 py-4">{item.customerLabel || "-"}</td>
                    <td className="px-6 py-4">{item.recurringPlanLabel || "-"}</td>
                    <td className="px-6 py-4">{item.nextInvoiceDate || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{item.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 text-sm text-muted-foreground">
          <span>Page {safePage} of {totalPages}</span>
          <div className="space-x-2">
            <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
