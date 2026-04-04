"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice_id") || "";
  const sessionId = searchParams.get("session_id") || "";
  const source = searchParams.get("source") || "backend";
  const retryHref = source === "portal"
    ? "/my-invoices"
    : (invoiceId ? `/dashboard/invoices/${invoiceId}/pay` : "/dashboard/invoices");

  useEffect(() => {
    if (source !== "portal" || !sessionId) return;
    fetchApi(`/payments/session/${sessionId}/fail`, { method: "POST" }).catch(() => null);
  }, [source, sessionId]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-2xl text-amber-300">
        !
      </div>
      <h1 className="text-3xl font-semibold">Payment Cancelled</h1>
      <p className="text-sm text-muted-foreground">
        Your Stripe checkout was cancelled. No charge was made. You can retry payment whenever you are ready.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href={retryHref} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          Retry Payment
        </Link>
        <Link href={source === "portal" ? "/my-invoices" : "/dashboard/invoices"} className="rounded-lg border border-border px-4 py-2 text-sm">
          {source === "portal" ? "Back to My Invoices" : "Back to Invoices"}
        </Link>
      </div>
    </section>
  );
}
