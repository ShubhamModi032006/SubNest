"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useApprovalStore } from "@/store/approvalStore";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { InvoiceSummaryCard } from "@/components/invoices/InvoiceSummaryCard";
import { PrintableInvoiceLayout } from "@/components/invoices/PrintableInvoiceLayout";
import { ApprovalRequestModal } from "@/components/approvals/ApprovalRequestModal";
import { canCancelInvoice, canTriggerInvoicePayment } from "@/lib/rbac/permissions";

const statusStep = ["draft", "confirmed", "sent", "cancelled"];

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id;

  const role = useAuthStore((state) => state.user?.role);
  const invoices = useDataStore((state) => state.invoices);
  const fetchInvoices = useDataStore((state) => state.fetchInvoices);
  const runInvoiceAction = useDataStore((state) => state.runInvoiceAction);
  const createPaymentSession = useDataStore((state) => state.createPaymentSession);
  const loadingPayment = useDataStore((state) => state.loadingPayment);
  const { createRequest, creatingRequest, notification, clearNotification } = useApprovalStore();

  const [busyAction, setBusyAction] = useState("");
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [paymentToast, setPaymentToast] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const invoice = useMemo(
    () => invoices.find((item) => item.id === invoiceId),
    [invoices, invoiceId]
  );

  const canManage = role === "admin" || role === "internal";
  const canCancel = canCancelInvoice(role, invoice?.status);
  const needsApprovalForCancel = !canCancel && invoice?.status !== "cancelled";
  const canTriggerPayment = canTriggerInvoicePayment(role);
  const isConfirmedInvoice = String(invoice?.status || "").toLowerCase() === "confirmed";
  const allowPayNow =
    canTriggerPayment &&
    isConfirmedInvoice &&
    !invoice?.isPaid;

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

  const requestCancelApproval = async (reason) => {
    await createRequest({
      action_type: "CANCEL_INVOICE",
      entity_type: "invoice",
      entity_id: invoice.id,
      reason,
      payload: {
        invoice_number: invoice.invoiceNumber,
        status: invoice.status,
      },
    });
    setApprovalModalOpen(false);
  };

  const currentStep = statusStep.indexOf(invoice.status);

  const handlePayNow = async () => {
    if (!invoice?.id || !allowPayNow) return;

    setPaymentError("");
    setPaymentToast("Redirecting to payment...");
    try {
      const session = await createPaymentSession(invoice.id);
      if (!session?.checkoutUrl) {
        throw new Error("Unable to initialize Stripe checkout session");
      }
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      setPaymentError(err.message || "Failed to start payment");
      setPaymentToast("");
    }
  };

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

      {notification ? (
        <div className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
          <div className="flex items-center justify-between gap-3">
            <span>{notification.message}</span>
            <button type="button" onClick={clearNotification} className="text-xs font-semibold uppercase">Dismiss</button>
          </div>
        </div>
      ) : null}

      {paymentToast ? (
        <div className="rounded-lg border border-blue-300/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
          {paymentToast}
        </div>
      ) : null}

      {paymentError ? (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {paymentError}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border/50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Status</p>
          <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${invoice.isPaid ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {invoice.isPaid ? "Paid" : "Unpaid"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Date</p>
          <p className="mt-1 text-sm">{invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleString() : "-"}</p>
        </div>
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
            <>
              {canTriggerPayment && isConfirmedInvoice && !invoice.isPaid ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingPayment}
                    title="Pay invoice via Stripe"
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    onClick={handlePayNow}
                  >
                    {loadingPayment ? (
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />Redirecting...</span>
                    ) : "Pay Now"}
                  </button>
                  <Link href={`/dashboard/invoices/${invoice.id}/pay`} className="rounded-lg border border-border px-3 py-2 text-sm">
                    Review Payment
                  </Link>
                </div>
              ) : null}

              <button
                type="button"
                disabled={busyAction === "cancel" || needsApprovalForCancel}
                title={needsApprovalForCancel ? "Requires admin approval" : "Cancel invoice"}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
                onClick={() => performAction("cancel")}
              >
                {busyAction === "cancel" ? "Cancelling..." : "Cancel"}
              </button>
              {needsApprovalForCancel ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                    onClick={() => setApprovalModalOpen(true)}
                  >
                    Request Approval
                  </button>
                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    Restricted
                  </span>
                </>
              ) : null}
            </>
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

      <ApprovalRequestModal
        open={approvalModalOpen}
        title="Request invoice cancellation approval"
        description="Cancelling a confirmed invoice has financial impact and requires admin approval."
        loading={creatingRequest}
        onClose={() => setApprovalModalOpen(false)}
        onSubmit={requestCancelApproval}
      />
    </section>
  );
}
