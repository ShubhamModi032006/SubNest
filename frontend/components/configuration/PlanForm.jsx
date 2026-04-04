"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Save } from "lucide-react";

const billingPeriods = ["Daily", "Weekly", "Monthly", "Yearly"];

export function PlanForm({ initialData, onSubmit, isSaving, isAdmin, submitLabel }) {
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    billingPeriod: initialData?.billingPeriod || "Monthly",
    price: initialData?.price ?? "",
    minimumQuantity: initialData?.minimumQuantity ?? 1,
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    autoClose: Boolean(initialData?.autoClose),
    closable: initialData?.closable ?? true,
    renewable: initialData?.renewable ?? true,
    pausable: initialData?.pausable ?? true,
    status: initialData?.status || "active",
  });

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Plan name is required.");
      return;
    }
    if (Number(formData.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    if (Number(formData.minimumQuantity) <= 0) {
      setError("Minimum quantity must be greater than 0.");
      return;
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("End date must be after start date.");
      return;
    }

    await onSubmit({
      ...formData,
      price: Number(formData.price),
      minimumQuantity: Number(formData.minimumQuantity),
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
        <h2 className="mb-4 text-lg font-semibold">Plan Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={!isAdmin}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Billing Period</Label>
            <select
              value={formData.billingPeriod}
              onChange={(e) => updateField("billingPeriod", e.target.value)}
              disabled={!isAdmin}
              className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            >
              {billingPeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.price}
              onChange={(e) => updateField("price", e.target.value)}
              disabled={!isAdmin}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Quantity</Label>
            <Input
              type="number"
              min="1"
              value={formData.minimumQuantity}
              onChange={(e) => updateField("minimumQuantity", e.target.value)}
              disabled={!isAdmin}
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/50 bg-card/70 p-5">
        <h2 className="mb-4 text-lg font-semibold">Validity Window</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePicker
              value={formData.startDate}
              onChange={(value) => updateField("startDate", value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePicker
              value={formData.endDate}
              onChange={(value) => updateField("endDate", value)}
              disabled={!isAdmin}
              min={formData.startDate || undefined}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/50 bg-card/70 p-5">
        <h2 className="mb-4 text-lg font-semibold">Plan Options</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleSwitch checked={formData.autoClose} onChange={(v) => updateField("autoClose", v)} label="Auto Close" disabled={!isAdmin} />
          <ToggleSwitch checked={formData.closable} onChange={(v) => updateField("closable", v)} label="Closable" disabled={!isAdmin} />
          <ToggleSwitch checked={formData.renewable} onChange={(v) => updateField("renewable", v)} label="Renewable" disabled={!isAdmin} />
          <ToggleSwitch checked={formData.pausable} onChange={(v) => updateField("pausable", v)} label="Pausable" disabled={!isAdmin} />
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
          Read-only mode: only Admin can modify plans.
        </p>
      )}
    </form>
  );
}
