"use client";

export function InvoiceTable({ lines }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Unit Price</th>
            <th className="px-4 py-3">Discount</th>
            <th className="px-4 py-3">Tax</th>
            <th className="px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {(lines || []).length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No invoice lines.</td>
            </tr>
          ) : (
            lines.map((line) => (
              <tr key={line.id} className="hover:bg-muted/10">
                <td className="px-4 py-3 font-medium">{line.productName || "-"}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3">${Number(line.unitPrice || 0).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(line.discountAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">${Number(line.taxAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold">${Number(line.total || 0).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
