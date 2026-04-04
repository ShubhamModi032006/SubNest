"use client";

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-primary" : "font-medium"}>${value.toFixed(2)}</span>
    </div>
  );
}

export function PricingSummaryCard({ orderLines }) {
  const subtotal = round2(orderLines.reduce((sum, line) => sum + Number(line.gross || 0), 0));
  const discountTotal = round2(orderLines.reduce((sum, line) => sum + Number(line.discountAmount || 0), 0));
  const taxTotal = round2(orderLines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0));
  const total = round2(orderLines.reduce((sum, line) => sum + Number(line.amount || 0), 0));

  return (
    <aside className="sticky top-6 rounded-xl border border-border/50 bg-card/80 p-4 shadow-lg">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pricing Summary</p>
      <div className="space-y-2">
        <SummaryRow label="Subtotal" value={subtotal} />
        <SummaryRow label="Discount" value={discountTotal} />
        <SummaryRow label="Tax" value={taxTotal} />
      </div>
      <div className="my-3 border-t border-border/50" />
      <SummaryRow label="Total" value={total} highlight />
    </aside>
  );
}
