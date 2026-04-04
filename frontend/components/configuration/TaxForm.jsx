"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

export function TaxForm({ initialData, onSubmit, isSaving, isAdmin, submitLabel }) {
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || "Percentage",
    value: initialData?.value ?? "",
  });

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Tax name is required.");
      return;
    }
    if (Number(formData.value) <= 0) {
      setError("Tax value must be greater than 0.");
      return;
    }

    await onSubmit({ ...formData, value: Number(formData.value) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border/50 bg-card/70 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Tax Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={!isAdmin}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={formData.type}
              onChange={(e) => updateField("type", e.target.value)}
              disabled={!isAdmin}
              className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            >
              <option value="Percentage">Percentage</option>
              <option value="Fixed">Fixed</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.value}
              onChange={(e) => updateField("value", e.target.value)}
              disabled={!isAdmin}
              required
            />
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitLabel}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Read-only mode: only Admin can modify taxes.
        </p>
      )}
    </form>
  );
}
