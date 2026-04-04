"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { fetchApi } from "@/lib/api";
import { showError, showSuccess } from "@/lib/toast";

function formatStripeAmount(amountInMinorUnit, currency) {
  const normalized = Number(amountInMinorUnit || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
  }).format(Number.isFinite(normalized) ? normalized : 0);
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const invoiceIdFromQuery = searchParams.get("invoice_id") || "";
  const source = searchParams.get("source") || "backend";

  const fetchInvoiceById = useDataStore((state) => state.fetchInvoiceById);
  const loadingPayment = useDataStore((state) => state.loadingPayment);

  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError("Missing Stripe session id in callback URL.");
        return;
      }

      try {
        if (source === "portal") {
          await fetchApi(`/payments/session/${sessionId}/complete`, { method: "POST" });
        }

        const data = await fetchApi(`/payments/session/${sessionId}`);
        setTransaction(data.session || data.payment || null);
        const targetInvoiceId = data?.session?.metadata?.invoice_id || invoiceIdFromQuery || data?.invoice?.id;
        if (targetInvoiceId) {
          await fetchInvoiceById(targetInvoiceId);
        }
        showSuccess("Payment success");
      } catch (err) {
        setError(err.message || "Unable to verify Stripe payment session.");
        showError(err.message || "Something went wrong");
      }
    };

    loadSession();
  }, [sessionId, invoiceIdFromQuery, fetchInvoiceById, source]);

  const invoiceId = transaction?.invoiceId || transaction?.metadata?.invoice_id || invoiceIdFromQuery;
  const amountLabel = useMemo(() => {
    const amountTotal = transaction?.amountTotal ?? transaction?.amount_total;
    const currency = transaction?.currency || "usd";
    return formatStripeAmount(amountTotal, currency);
  }, [transaction?.amountTotal, transaction?.amount_total, transaction?.currency]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center space-y-5 px-4 text-center">
      <div className="payment-success-burst" aria-hidden="true">
        <div className="payment-success-ring">
          <span className="payment-success-check">✓</span>
        </div>
      </div>

      <h1 className="text-3xl font-semibold">Payment Successful</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        Stripe confirmed your payment and your invoice payment state is being synchronized.
      </p>

      {loadingPayment ? <p className="text-sm text-muted-foreground">Validating session...</p> : null}

      {error ? (
        <p className="w-full rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : (
        <div className="w-full rounded-xl border border-border/50 bg-card/70 p-5 text-left text-sm">
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Session ID</span><span className="font-mono text-xs">{sessionId}</span></div>
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Invoice ID</span><span>{invoiceId || "-"}</span></div>
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Amount Paid</span><span className="font-semibold text-emerald-300">{amountLabel}</span></div>
          <div className="flex items-center justify-between py-1"><span className="text-muted-foreground">Payment Status</span><span className="capitalize">{transaction?.status || "paid"}</span></div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {invoiceId ? (
          <Link href={source === "portal" ? "/my-invoices" : `/dashboard/invoices/${invoiceId}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            {source === "portal" ? "Back to My Invoices" : "Back to Invoice"}
          </Link>
        ) : null}
        <Link href={source === "portal" ? "/my-invoices" : "/dashboard/invoices"} className="rounded-lg border border-border px-4 py-2 text-sm">
          {source === "portal" ? "View My Invoices" : "View All Invoices"}
        </Link>
      </div>
    </section>
  );
}
