"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2 } from "lucide-react";

const PAGE_SIZE = 5;

const formatPlanPrice = (value) => {
  const numericPrice = Number(value);
  return Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : "0.00";
};

export default function PlansPage() {
  const { plans, loadingPlans, fetchPlans, deletePlan } = useDataStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return plans.filter((plan) => plan.name.toLowerCase().includes(term));
  }, [plans, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onDelete = async (id) => {
    if (!isAdmin) return;
    if (!confirm("Delete this plan?")) return;
    await deletePlan(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Plans</h1>
          <p className="mt-2 text-muted-foreground">Manage recurring billing plans and lifecycle options.</p>
        </div>
        {isAdmin ? (
          <Link href="/dashboard/configuration/plans/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Plan</Button>
          </Link>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-border/50 p-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans..." className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Billing Period</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingPlans ? (
                <tr><td className="px-6 py-10 text-center text-muted-foreground" colSpan={5}>Loading plans...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td className="px-6 py-10 text-center text-muted-foreground" colSpan={5}>No plans found.</td></tr>
              ) : (
                paginated.map((plan) => (
                  <tr key={plan.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4 font-medium">{plan.name}</td>
                    <td className="px-6 py-4">{plan.billingPeriod}</td>
                    <td className="px-6 py-4">${formatPlanPrice(plan.price)}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/dashboard/configuration/plans/${plan.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </Link>
                        {isAdmin ? (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(plan.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="space-x-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
