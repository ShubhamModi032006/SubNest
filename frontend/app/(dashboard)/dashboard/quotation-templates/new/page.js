"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";

export default function NewQuotationTemplatePage() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const products = useDataStore((state) => state.products);
  const plans = useDataStore((state) => state.plans);
  const fetchProducts = useDataStore((state) => state.fetchProducts);
  const fetchPlans = useDataStore((state) => state.fetchPlans);
  const createQuotationTemplate = useDataStore((state) => state.createQuotationTemplate);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [recurringPlanId, setRecurringPlanId] = useState("");
  const [lines, setLines] = useState([]);
  const isAdmin = String(role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Quotation templates are restricted to admins.</p>;
  }

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: `${p.name} ($${Number(p.price || 0).toFixed(2)})`, price: Number(p.price || 0) })),
    [products]
  );

  useEffect(() => {
    fetchProducts();
    fetchPlans();
  }, [fetchProducts, fetchPlans]);

  const addLine = () => {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), productId: "", quantity: 1, discountValue: 0, taxRate: 0 }]);
  };

  const updateLine = (lineId, patch) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const removeLine = (lineId) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const onSave = async () => {
    if (!name.trim()) {
      window.alert("Template name is required.");
      return;
    }
    if (!recurringPlanId) {
      window.alert("Recurring plan is required.");
      return;
    }

    const selectedPlan = plans.find((plan) => plan.id === recurringPlanId);

    const payload = {
      name,
      status,
      description,
      recurringPlanId,
      recurringPlanLabel: selectedPlan?.name || "",
      productLines: lines
        .filter((line) => line.productId)
        .map((line) => ({
          productId: line.productId,
          productName: products.find((p) => p.id === line.productId)?.name || "",
          quantity: Number(line.quantity || 1),
          description: `Discount ${Number(line.discountValue || 0)} | Tax ${Number(line.taxRate || 0)}%`,
        })),
    };

    const created = await createQuotationTemplate(payload);
    router.push(`/dashboard/quotation-templates/${created.id}`);
  };

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">New Quotation Template</h1>
        <p className="text-sm text-muted-foreground">Save product and pricing defaults for faster subscription order setup.</p>
      </header>

      <div className="grid gap-4 rounded-xl border border-border/50 p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Template Name</span>
          <input className="w-full rounded-lg border border-border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select className="w-full rounded-lg border border-border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Recurring Plan</span>
          <select className="w-full rounded-lg border border-border px-3 py-2" value={recurringPlanId} onChange={(e) => setRecurringPlanId(e.target.value)}>
            <option value="">Select recurring plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium">Description</span>
          <textarea className="w-full rounded-lg border border-border px-3 py-2" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Order Lines</h2>
          <button type="button" onClick={addLine} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/20">Add Line</button>
        </div>

        {lines.length === 0 ? <p className="text-sm text-muted-foreground">No lines yet.</p> : null}

        {lines.map((line) => (
          <div key={line.id} className="grid gap-2 rounded-lg border border-border/40 p-3 md:grid-cols-5">
            <select
              className="rounded-md border border-border px-2 py-2 text-sm md:col-span-2"
              value={line.productId}
              onChange={(e) => updateLine(line.id, { productId: e.target.value })}
            >
              <option value="">Select product</option>
              {productOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="rounded-md border border-border px-2 py-2 text-sm"
              value={line.quantity}
              onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
              placeholder="Qty"
            />
            <input
              type="number"
              min={0}
              className="rounded-md border border-border px-2 py-2 text-sm"
              value={line.discountValue}
              onChange={(e) => updateLine(line.id, { discountValue: e.target.value })}
              placeholder="Discount"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border px-2 py-2 text-sm"
                value={line.taxRate}
                onChange={(e) => updateLine(line.id, { taxRate: e.target.value })}
                placeholder="Tax %"
              />
              <button type="button" onClick={() => removeLine(line.id)} className="rounded-md border border-red-300 px-2 py-2 text-xs text-red-700">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save Template</button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
      </div>
    </section>
  );
}
