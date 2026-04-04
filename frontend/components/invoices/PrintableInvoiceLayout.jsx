"use client";

import { InvoiceTable } from "@/components/invoices/InvoiceTable";

export function PrintableInvoiceLayout({ invoice }) {
  if (!invoice) return null;

  return (
    <section className="rounded-xl border border-border/50 bg-white p-6 text-black print:border-none print:shadow-none">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice</h2>
          <p className="text-sm text-slate-600">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right text-sm">
          <p>Date: {invoice.invoiceDate}</p>
          <p>Due: {invoice.dueDate}</p>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 p-3 text-sm">
        <p className="font-semibold">Customer</p>
        <p>{invoice.customerLabel || "-"}</p>
        <p className="text-slate-500">Linked Subscription: {invoice.linkedSubscriptionId || "-"}</p>
      </div>

      <InvoiceTable lines={invoice.lines || []} />

      <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>${Number(invoice.subtotal || 0).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>${Number(invoice.discountTotal || 0).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>${Number(invoice.taxTotal || 0).toFixed(2)}</span></div>
        <div className="border-t border-slate-300 pt-2 font-semibold flex justify-between">
          <span>Total</span><span>${Number(invoice.grandTotal || 0).toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
