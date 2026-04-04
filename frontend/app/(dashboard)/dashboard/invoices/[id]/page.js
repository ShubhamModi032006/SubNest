"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { InvoiceSummaryCard } from "@/components/invoices/InvoiceSummaryCard";
import { PrintableInvoiceLayout } from "@/components/invoices/PrintableInvoiceLayout";

const statusStep = ["draft", "confirmed", "sent", "cancelled"];

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id;

  const role = useDataStore((state) => state.role);
  const invoices = useDataStore((state) => state.invoices);
  const fetchInvoices = useDataStore((state) => state.fetchInvoices);
  const runInvoiceAction = useDataStore((state) => state.runInvoiceAction);

  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const invoice = useMemo(
    () => invoices.find((item) => item.id === invoiceId),
    [invoices, invoiceId]
  );

  const canManage = role === "admin" || role === "internal";

  const performAction = async (action) => {
    if (!invoice) return;

    const needsConfirm = action === "cancel";
    if (needsConfirm && !window.confirm("Cancel this invoice?")) {
      return;
    }

    setBusyAction(action);
    try {
      await runInvoiceAction(invoice.id, action);
      await fetchInvoices();
    } finally {
      setBusyAction("");
    }
  };

  if (!invoice) {
    return <p className="text-sm text-muted-foreground">Loading invoice...</p>;
  }

  const currentStep = statusStep.indexOf(invoice.status);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">Customer: {invoice.customerLabel || "-"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-3 py-2 text-sm">Print</button>
          <Link href="/dashboard/invoices" className="rounded-lg border border-border px-3 py-2 text-sm">Back</Link>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/50 p-4 md:grid-cols-4">
        {statusStep.map((step, index) => {
          const active = currentStep >= index;
          return (
            <div key={step} className={`rounded-lg border px-3 py-2 text-sm capitalize ${active ? "border-primary bg-primary/10" : "border-border/50"}`}>
              {index + 1}. {step}
            </div>
          );
        })}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "draft" ? (
            <button
              type="button"
              disabled={busyAction === "confirm"}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => performAction("confirm")}
            >
              {busyAction === "confirm" ? "Confirming..." : "Confirm"}
            </button>
          ) : null}

          {invoice.status === "confirmed" ? (
            <button
              type="button"
              disabled={busyAction === "send"}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => performAction("send")}
            >
              {busyAction === "send" ? "Sending..." : "Send"}
            </button>
          ) : null}

          {invoice.status !== "cancelled" ? (
            <button
              type="button"
              disabled={busyAction === "cancel"}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
              onClick={() => performAction("cancel")}
            >
              {busyAction === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <InvoiceTable lines={invoice.lines || []} />
          <PrintableInvoiceLayout invoice={invoice} />
        </div>
        <InvoiceSummaryCard invoice={invoice} />
      </div>
    </section>
  );
}
