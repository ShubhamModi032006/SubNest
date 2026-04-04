"use client";

export function InvoiceSummaryCard({ invoice }) {
  const subtotal = Number(invoice?.subtotal || 0);
  const discountTotal = Number(invoice?.discountTotal || 0);
  const taxTotal = Number(invoice?.taxTotal || 0);
  const grandTotal = Number(invoice?.grandTotal || 0);
  const isPaid = Boolean(invoice?.isPaid);
  const paymentDate = invoice?.paymentDate ? new Date(invoice.paymentDate).toLocaleString() : "-";

  return (
    <aside className="sticky top-6 rounded-xl border border-border/50 bg-card/80 p-4 shadow-lg">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Discount Total</span><span>${discountTotal.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax Total</span><span>${taxTotal.toFixed(2)}</span></div>
      </div>
      <div className="my-3 border-t border-border/50" />
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Payment Status</span>
          <span className={isPaid ? "text-emerald-300" : "text-amber-300"}>{isPaid ? "Paid" : "Unpaid"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Payment Date</span>
          <span>{paymentDate}</span>
        </div>
      </div>
      <div className="my-3 border-t border-border/50" />
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Grand Total</span>
        <span className="text-primary">${grandTotal.toFixed(2)}</span>
      </div>
    </aside>
  );
}
