"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

const toNum = (v) => Number(v || 0);

const findProductTax = (product, taxes) => {
  if (!product) return null;
  return taxes.find((tax) => tax.id === product.tax || tax.name === product.tax) || null;
};

const findAutoDiscount = (productId, quantity, gross, discounts) => {
  return discounts.find((discount) => {
    const productEligible = discount.applyToSubscriptions || (discount.productIds || []).includes(productId);
    const quantityEligible = Number(discount.minimumQuantity || 0) <= Number(quantity || 0);
    const purchaseEligible = Number(discount.minimumPurchase || 0) <= Number(gross || 0);
    return productEligible && quantityEligible && purchaseEligible;
  });
};

const computeLine = (line, context) => {
  const product = context.products.find((item) => item.id === line.productId);
  const variant = (product?.variants || []).find((item) => item.id === line.variantId);
  const tax = findProductTax(product, context.taxes);

  const basePrice = toNum(product?.salesPrice);
  const variantExtraPrice = toNum(variant?.extraPrice);
  const planPrice = toNum(context.plan?.price);
  const quantity = Math.max(1, toNum(line.quantity || 1));
  const unitPrice = basePrice + variantExtraPrice + planPrice;
  const gross = unitPrice * quantity;

  const auto = findAutoDiscount(line.productId, quantity, gross, context.discounts);
  const discountType = line.discountType || auto?.type || "Fixed";
  const discountValue = toNum(
    line.discountValue !== undefined && line.discountValue !== ""
      ? line.discountValue
      : auto?.value || 0
  );

  const discountAmount = discountType === "Percentage" ? (gross * discountValue) / 100 : discountValue;
  const taxableBase = Math.max(0, gross - discountAmount);
  const taxType = tax?.type || "Percentage";
  const taxValue = toNum(tax?.value || 0);
  const taxAmount = taxType === "Percentage" ? (taxableBase * taxValue) / 100 : taxValue;
  const amount = Math.max(0, taxableBase + taxAmount);

  return {
    ...line,
    productId: line.productId,
    productName: product?.name || "",
    variantId: line.variantId || "",
    variantName: variant ? `${variant.attribute}: ${variant.value}` : "",
    quantity,
    basePrice,
    variantExtraPrice,
    planPrice,
    unitPrice,
    gross,
    discountType,
    discountValue,
    discountAmount,
    taxId: tax?.id || "",
    taxName: tax?.name || "",
    taxType,
    taxValue,
    taxAmount,
    amount,
  };
};

export function DynamicOrderTable({
  orderLines,
  onChange,
  products,
  taxes,
  discounts,
  selectedPlan,
  readOnly,
}) {
  const context = useMemo(
    () => ({ products, taxes, discounts, plan: selectedPlan }),
    [products, taxes, discounts, selectedPlan]
  );

  const updateLine = (id, patch) => {
    const next = orderLines.map((line) =>
      line.id === id ? computeLine({ ...line, ...patch }, context) : line
    );
    onChange(next);
  };

  const addLine = () => {
    const firstProduct = products[0];
    const base = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: firstProduct?.id || "",
      variantId: "",
      quantity: 1,
      discountType: "Fixed",
      discountValue: "",
    };
    onChange([...orderLines, computeLine(base, context)]);
  };

  const removeLine = (id) => {
    onChange(orderLines.filter((line) => line.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Order Lines</h3>
        {!readOnly ? (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Variant</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Unit Price</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Tax</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orderLines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No order lines added.
                </td>
              </tr>
            ) : (
              orderLines.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                const variants = product?.variants || [];
                return (
                  <tr key={line.id} className="hover:bg-muted/10">
                    <td className="px-3 py-3">
                      <select
                        value={line.productId}
                        onChange={(e) => updateLine(line.id, { productId: e.target.value, variantId: "" })}
                        disabled={readOnly}
                        className="h-9 w-full rounded-md border border-input bg-background/50 px-2"
                      >
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={line.variantId || ""}
                        onChange={(e) => updateLine(line.id, { variantId: e.target.value })}
                        disabled={readOnly || variants.length === 0}
                        className="h-9 w-full rounded-md border border-input bg-background/50 px-2"
                      >
                        <option value="">Default</option>
                        {variants.map((item) => (
                          <option key={item.id} value={item.id}>{item.attribute}: {item.value}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        disabled={readOnly}
                        onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">${toNum(line.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={line.discountType || "Fixed"}
                          disabled={readOnly}
                          onChange={(e) => updateLine(line.id, { discountType: e.target.value })}
                          className="h-9 rounded-md border border-input bg-background/50 px-2"
                        >
                          <option value="Fixed">Fixed</option>
                          <option value="Percentage">%</option>
                        </select>
                        <Input
                          type="number"
                          min="0"
                          value={line.discountValue}
                          disabled={readOnly}
                          onChange={(e) => updateLine(line.id, { discountValue: e.target.value })}
                          className="w-20"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">{line.taxName || "-"}</td>
                    <td className="px-3 py-3 font-medium">${toNum(line.amount).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">
                      {!readOnly ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
