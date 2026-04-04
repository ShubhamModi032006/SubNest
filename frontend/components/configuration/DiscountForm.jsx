"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { useDataStore } from "@/store/dataStore";
import { Loader2, Save } from "lucide-react";

export function DiscountForm({ initialData, onSubmit, isSaving, isAdmin, submitLabel }) {
  const { products, fetchProducts } = useDataStore();
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: String(initialData?.type || "percentage").toLowerCase(),
    value: initialData?.value ?? "",
    minimumPurchase: initialData?.minimumPurchase ?? "",
    minimumQuantity: initialData?.minimumQuantity ?? "",
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    usageLimit: initialData?.usageLimit ?? "",
    productIds: initialData?.productIds || [],
    applyToSubscriptions: Boolean(initialData?.applyToSubscriptions),
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: product.name })),
    [products]
  );

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Discount name is required.");
      return;
    }
    if (Number(formData.value) <= 0) {
      setError("Discount value must be greater than 0.");
      return;
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("End date must be after start date.");
      return;
    }

    const optionalNumber = (value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }

      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
    };

    await onSubmit({
      ...formData,
      value: Number(formData.value),
      type: String(formData.type || "percentage").toLowerCase(),
      minimumPurchase: optionalNumber(formData.minimumPurchase),
      minimumQuantity: optionalNumber(formData.minimumQuantity),
      usageLimit: optionalNumber(formData.usageLimit),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border/50 bg-card/70 p-5">
        <h2 className="mb-4 text-lg font-semibold">Discount Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Discount Name</Label>
            <Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} disabled={!isAdmin} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={formData.type}
              onChange={(e) => updateField("type", e.target.value)}
              disabled={!isAdmin}
              className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Value</Label>
            <Input type="number" min="0.01" step="0.01" value={formData.value} onChange={(e) => updateField("value", e.target.value)} disabled={!isAdmin} required />
          </div>
          <div className="space-y-2">
            <Label>Minimum Purchase</Label>
            <Input type="number" min="0" step="0.01" value={formData.minimumPurchase} onChange={(e) => updateField("minimumPurchase", e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label>Minimum Quantity</Label>
            <Input type="number" min="0" value={formData.minimumQuantity} onChange={(e) => updateField("minimumQuantity", e.target.value)} disabled={!isAdmin} />
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePicker value={formData.startDate} onChange={(value) => updateField("startDate", value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePicker value={formData.endDate} onChange={(value) => updateField("endDate", value)} disabled={!isAdmin} min={formData.startDate || undefined} />
          </div>
          <div className="space-y-2">
            <Label>Usage Limit</Label>
            <Input type="number" min="0" value={formData.usageLimit} onChange={(e) => updateField("usageLimit", e.target.value)} disabled={!isAdmin} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/50 bg-card/70 p-5">
        <h2 className="mb-4 text-lg font-semibold">Apply To</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Products</Label>
            <MultiSelectDropdown
              options={productOptions}
              selectedValues={formData.productIds}
              onChange={(values) => updateField("productIds", values)}
              disabled={!isAdmin}
              placeholder="Select products"
            />
          </div>
          <div className="space-y-2">
            <Label>Subscriptions</Label>
            <ToggleSwitch
              checked={formData.applyToSubscriptions}
              onChange={(value) => updateField("applyToSubscriptions", value)}
              disabled={!isAdmin}
              label="Apply this discount to subscriptions"
            />
          </div>
        </div>
      </section>

      {isAdmin ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitLabel}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Read-only mode: only Admin can modify discounts.
        </p>
      )}
    </form>
  );
}
