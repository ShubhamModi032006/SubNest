"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { canCreateInvoice } from "@/lib/rbac/permissions";

export default function NewInvoicePage() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const {
    subscriptions,
    invoices,
    loadingSubscriptions,
    fetchSubscriptions,
    fetchInvoices,
    createInvoiceFromSubscription,
  } = useDataStore();

  const [subscriptionId, setSubscriptionId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const allowed = canCreateInvoice(role);

  useEffect(() => {
    fetchSubscriptions();
    fetchInvoices();
  }, [fetchSubscriptions, fetchInvoices]);

  const sourceSubscriptions = useMemo(() => {
    const blockedSubscriptionIds = new Set(
      invoices
        .filter((invoice) => String(invoice?.status || "").toLowerCase() !== "cancelled")
        .map((invoice) => String(invoice?.linkedSubscriptionId || ""))
        .filter(Boolean)
    );

    return subscriptions.filter((item) => {
      const status = String(item?.status || "").toLowerCase();
      if (status === "closed") return false;
      return !blockedSubscriptionIds.has(String(item.id));
    });
  }, [subscriptions, invoices]);

  useEffect(() => {
    if (!subscriptionId && sourceSubscriptions.length > 0) {
      setSubscriptionId(sourceSubscriptions[0].id);
    }
  }, [subscriptionId, sourceSubscriptions]);

  const onCreate = async () => {
    if (!subscriptionId) {
      setError("Please select a subscription");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const invoice = await createInvoiceFromSubscription(subscriptionId);
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  if (!allowed) {
    return (
      <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        You do not have access to create invoices.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoices">
          <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Invoice</h1>
          <p className="text-sm text-muted-foreground">Generate a new invoice from an existing subscription.</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-xl border border-border/50 p-5">
        {error ? <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <label className="mb-2 block text-sm font-medium">Subscription</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={subscriptionId}
          onChange={(e) => setSubscriptionId(e.target.value)}
          disabled={loadingSubscriptions || creating || sourceSubscriptions.length === 0}
        >
          {sourceSubscriptions.length === 0 ? (
            <option value="">No eligible subscription found</option>
          ) : (
            sourceSubscriptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subscriptionNumber} - {item.customerLabel || "Customer"} ({item.status})
              </option>
            ))
          )}
        </select>

        <div className="mt-5 flex justify-end gap-2">
          <Link href="/dashboard/invoices">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={onCreate} disabled={creating || !subscriptionId || sourceSubscriptions.length === 0}>
            {creating ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </section>
  );
}
