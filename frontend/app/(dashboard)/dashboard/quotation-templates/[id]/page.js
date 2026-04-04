"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";

export default function QuotationTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id;

  const products = useDataStore((state) => state.products);
  const plans = useDataStore((state) => state.plans);
  const quotationTemplates = useDataStore((state) => state.quotationTemplates);
  const fetchQuotationTemplates = useDataStore((state) => state.fetchQuotationTemplates);
  const fetchPlans = useDataStore((state) => state.fetchPlans);
  const updateQuotationTemplate = useDataStore((state) => state.updateQuotationTemplate);

  const template = useMemo(
    () => quotationTemplates.find((item) => item.id === templateId),
    [quotationTemplates, templateId]
  );

  const [draft, setDraft] = useState(null);

  useEffect(() => {
    fetchQuotationTemplates();
    fetchPlans();
  }, [fetchQuotationTemplates, fetchPlans]);

  useEffect(() => {
    if (template) {
      setDraft({
        ...template,
        productLines: (template.productLines || []).map((line) => ({
          id: line.id || crypto.randomUUID(),
          productId: line.productId,
          quantity: line.quantity,
          discountValue: line.discount?.value || 0,
          taxRate: line.tax?.rate || 0,
        })),
      });
    }
  }, [template]);

  if (!draft) {
    return <p className="text-sm text-muted-foreground">Loading template...</p>;
  }

  const saveChanges = async () => {
    const payload = {
      name: draft.name,
      status: draft.status,
      description: draft.description,
      recurringPlanId: draft.recurringPlanId || "",
      recurringPlanLabel: plans.find((plan) => plan.id === draft.recurringPlanId)?.name || draft.recurringPlanLabel || "",
      productLines: (draft.productLines || []).map((line) => ({
        productId: line.productId,
        productName: products.find((p) => p.id === line.productId)?.name || "",
        quantity: Number(line.quantity || 1),
        description: `Discount ${Number(line.discountValue || 0)} | Tax ${Number(line.taxRate || 0)}%`,
      })),
    };

    await updateQuotationTemplate(templateId, payload);
    window.alert("Template updated.");
  };

  const addLine = () => {
    setDraft((prev) => ({
      ...prev,
      productLines: [...(prev.productLines || []), { id: crypto.randomUUID(), productId: "", quantity: 1, discountValue: 0, taxRate: 0 }],
    }));
  };

  const updateLine = (lineId, patch) => {
    setDraft((prev) => ({
      ...prev,
      productLines: (prev.productLines || []).map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  };

  const removeLine = (lineId) => {
    setDraft((prev) => ({
      ...prev,
      productLines: (prev.productLines || []).filter((line) => line.id !== lineId),
    }));
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Template Details</h1>
          <p className="text-sm text-muted-foreground">Edit template metadata and product pricing lines.</p>
        </div>
        <Link href="/dashboard/quotation-templates" className="rounded-lg border border-border px-3 py-2 text-sm">Back</Link>
      </div>

      <div className="grid gap-4 rounded-xl border border-border/50 p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Template Name</span>
          <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.status || "active"} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Recurring Plan</span>
          <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.recurringPlanId || ""} onChange={(e) => setDraft((prev) => ({ ...prev, recurringPlanId: e.target.value }))}>
            <option value="">Select recurring plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Order Lines</h2>
          <button type="button" onClick={addLine} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Add Line</button>
        </div>

        {(draft.productLines || []).map((line) => (
          <div key={line.id} className="grid gap-2 rounded-lg border border-border/40 p-3 md:grid-cols-5">
            <select
              className="rounded-md border border-border px-2 py-2 text-sm md:col-span-2"
              value={line.productId}
              onChange={(e) => updateLine(line.id, { productId: e.target.value })}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <input type="number" min={1} className="rounded-md border border-border px-2 py-2 text-sm" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} />
            <input type="number" min={0} className="rounded-md border border-border px-2 py-2 text-sm" value={line.discountValue} onChange={(e) => updateLine(line.id, { discountValue: e.target.value })} />
            <div className="flex gap-2">
              <input type="number" min={0} className="w-full rounded-md border border-border px-2 py-2 text-sm" value={line.taxRate} onChange={(e) => updateLine(line.id, { taxRate: e.target.value })} />
              <button type="button" className="rounded-md border border-red-300 px-2 py-2 text-xs text-red-700" onClick={() => removeLine(line.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={saveChanges} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save Changes</button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
      </div>
    </section>
  );
}
