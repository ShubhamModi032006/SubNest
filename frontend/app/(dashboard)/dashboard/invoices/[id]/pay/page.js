"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { canTriggerInvoicePayment } from "@/lib/rbac/permissions";

export default function InvoicePayPage() {
  const params = useParams();
  const invoiceId = params?.id;

  const role = useAuthStore((state) => state.user?.role);
  const invoices = useDataStore((state) => state.invoices);
  const fetchInvoices = useDataStore((state) => state.fetchInvoices);
  const createPaymentSession = useDataStore((state) => state.createPaymentSession);
  const loadingPayment = useDataStore((state) => state.loadingPayment);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const invoice = useMemo(
    () => invoices.find((item) => String(item.id) === String(invoiceId)),
    [invoices, invoiceId]
  );

  const allowedRole = canTriggerInvoicePayment(role);
  const isConfirmed = String(invoice?.status || "").toLowerCase() === "confirmed";
  const canPay = Boolean(allowedRole && invoice && isConfirmed && !invoice.isPaid);

  const onConfirmPayment = async () => {
    if (!canPay) return;

    setError("");
    setToast("Redirecting to payment...");
    try {
      const session = await createPaymentSession(invoice.id);
      if (!session?.checkoutUrl) {
        throw new Error("Unable to initialize Stripe checkout session");
      }
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      setError(err.message || "Failed to redirect to Stripe");
      setToast("");
    }
  };

  if (!invoice) {
    return <p className="text-sm text-muted-foreground">Loading invoice...</p>;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Review Payment</h1>
          <p className="text-sm text-muted-foreground">Invoice {invoice.invoiceNumber}</p>
        </div>
        <Link href={`/dashboard/invoices/${invoice.id}`} className="rounded-lg border border-border px-3 py-2 text-sm">
          Back
        </Link>
      </div>

      {toast ? (
        <div className="rounded-lg border border-blue-300/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border/50 bg-card/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Summary</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Invoice Number</p>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{invoice.customerLabel || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium">{invoice.dueDate || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="text-base font-semibold text-primary">${Number(invoice.grandTotal || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Status</p>
            <p className={invoice.isPaid ? "font-medium text-emerald-300" : "font-medium text-amber-300"}>
              {invoice.isPaid ? "Paid" : "Unpaid"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Invoice Status</p>
            <p className="font-medium capitalize">{invoice.status}</p>
          </div>
        </div>
      </div>

      {!allowedRole ? (
        <p className="rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          You do not have permission to trigger invoice payment.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/dashboard/invoices/${invoice.id}`} className="rounded-lg border border-border px-4 py-2 text-sm">
          Cancel
        </Link>
        <button
          type="button"
          onClick={onConfirmPayment}
          disabled={!canPay || loadingPayment}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          title={!canPay ? "Only confirmed and unpaid invoices can be paid" : "Proceed to Stripe Checkout"}
        >
          {loadingPayment ? (
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />Redirecting...</span>
          ) : invoice.isPaid ? "Already Paid" : "Confirm & Pay"}
        </button>
      </div>
    </section>
  );
}
