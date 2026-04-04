"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { SkeletonTableRows } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { canCreateInvoice, canTriggerInvoicePayment } from "@/lib/rbac/permissions";

const statusStyle = {
  draft: "bg-slate-200 text-slate-700",
  confirmed: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function InvoicesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const invoices = useDataStore((state) => state.invoices);
  const loadingInvoices = useDataStore((state) => state.loadingInvoices);
  const fetchInvoices = useDataStore((state) => state.fetchInvoices);

  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const visibleInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((invoice) => invoice.status === statusFilter);
  }, [invoices, statusFilter]);

  const allowCreateInvoice = canCreateInvoice(role);
  const allowTriggerPayment = canTriggerInvoicePayment(role);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Track invoice statuses and lifecycle actions linked to subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          {allowCreateInvoice ? (
            <Link href="/dashboard/invoices/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Invoice
              </Button>
            </Link>
          ) : null}
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Invoice No</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Payment Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loadingInvoices ? (
              <tr><td colSpan={9}><SkeletonTableRows rows={6} cols={9} /></td></tr>
            ) : visibleInvoices.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No invoices found.</td></tr>
            ) : (
              visibleInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{invoice.customerLabel || "-"}</td>
                  <td className="px-4 py-3">{invoice.invoiceDate || "-"}</td>
                  <td className="px-4 py-3">{invoice.dueDate || "-"}</td>
                  <td className="px-4 py-3 font-semibold">${Number(invoice.grandTotal || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${statusStyle[invoice.status] || statusStyle.draft}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${invoice.isPaid ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                      {invoice.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/20">
                      View
                    </Link>
                    {allowTriggerPayment && String(invoice?.status || "").toLowerCase() === "confirmed" && !invoice.isPaid ? (
                      <Link href={`/dashboard/invoices/${invoice.id}/pay`} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                        Pay
                      </Link>
                    ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
