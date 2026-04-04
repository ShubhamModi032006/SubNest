"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useApprovalStore } from "@/store/approvalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { canCreateProduct } from "@/lib/rbac/permissions";

export default function CreateProductPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { createProduct, plans, taxes, fetchPlans, fetchTaxes } = useDataStore();
  const { createRequest } = useApprovalStore();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    name: "", type: "Service", salesPrice: "", costPrice: "", tax: ""
  });

  const [recurringPrices, setRecurringPrices] = useState([]);
  const [variants, setVariants] = useState([]);
  const canCreate = canCreateProduct(user?.role);
  const isInternalUser = String(user?.role || "").toLowerCase() === "internal";

  if (!canCreate) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        You do not have access to create products.
      </div>
    );
  }

  useEffect(() => {
    fetchPlans();
    fetchTaxes();
  }, [fetchPlans, fetchTaxes]);

  useEffect(() => {
    if (!formData.tax && taxes.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({ ...prev, tax: taxes[0].id }));
    }
  }, [taxes, formData.tax]);

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { setError("Product name is required"); setActiveTab("basic"); return; }
    if (Number(formData.salesPrice) < 0 || Number(formData.costPrice) < 0) {
      setError("Prices must be 0 or greater"); setActiveTab("basic"); return;
    }
    
    setSaving(true); setError(null);
    try {
      const payload = {
        ...formData,
        salesPrice: Number(formData.salesPrice) || 0,
        costPrice: Number(formData.costPrice) || 0,
        recurringPrices: recurringPrices.map((item) => {
          const selectedPlan = plans.find((plan) => plan.id === item.planId);
          return {
            ...item,
            planId: item.planId,
            planName: selectedPlan?.name || "",
          };
        }),
        variants
      };

      if (isInternalUser) {
        const approvalPayload = {
          operation: "CREATE_PRODUCT",
          product: {
            name: payload.name,
            type: String(payload.type || "").toLowerCase(),
            sales_price: payload.salesPrice,
            cost_price: payload.costPrice,
            tax_id: payload.tax || null,
            variants: (payload.variants || []).map((variant) => ({
              attribute: variant.attribute,
              value: variant.value,
              extra_price: Number(variant.extraPrice ?? 0),
            })),
            recurring_prices: (payload.recurringPrices || []).map((row) => ({
              plan_id: row.planId || null,
              price: Number(row.price ?? 0),
              min_quantity: Number(row.minQuantity ?? 1),
              start_date: row.startDate || null,
              end_date: row.endDate || null,
            })),
          },
        };

        await createRequest({
          action_type: "MODIFY_PRICING",
          entity_type: "product",
          entity_id: crypto.randomUUID(),
          reason: "Product creation request from internal workflow.",
          payload: approvalPayload,
        });

        router.push("/dashboard/approvals");
        return;
      }

      const result = await createProduct(payload);
      if (result?.requiresApproval) {
        router.push("/dashboard/approvals");
        return;
      }
      router.push("/dashboard/products");
    } catch (err) {
      setError(err?.message || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  // Mutators for nested arrays
  const addRecurring = () => setRecurringPrices(p => [...p, { id: Date.now().toString(), planId: plans[0]?.id || "", price: 0, minQuantity: 1, startDate: "", endDate: "" }]);
  const removeRecurring = (id) => setRecurringPrices(p => p.filter(r => r.id !== id));
  const updateRecurring = (id, field, val) => setRecurringPrices(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));

  const addVariant = () => setVariants(p => [...p, { id: Date.now().toString(), attribute: "", value: "", extraPrice: 0 }]);
  const removeVariant = (id) => setVariants(p => p.filter(v => v.id !== id));
  const updateVariant = (id, field, val) => setVariants(p => p.map(v => v.id === id ? { ...v, [field]: val } : v));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Product Entity</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex px-4 pt-4 mb-2 gap-2 border-b border-border/50 bg-muted/5 overflow-x-auto">
          {["basic", "recurring", "variants"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 rounded-t-md",
                activeTab === tab ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/10"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {error && <div className="mb-6 p-4 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">{error}</div>}
          
          <div className="relative min-h-75">
            {/* Basic Info Tab */}
            <div className={cn("transition-all duration-300", activeTab === "basic" ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 pointer-events-none")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Product Name <span className="text-destructive">*</span></Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <select name="type" value={formData.type} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                    <option value="Service">Service / Subscription</option>
                    <option value="Goods">Physical Goods</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Sales Price ($)</Label>
                  <Input name="salesPrice" type="number" min="0" step="0.01" value={formData.salesPrice} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price ($)</Label>
                  <Input name="costPrice" type="number" min="0" step="0.01" value={formData.costPrice} onChange={handleChange} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Tax Mapping</Label>
                  <select name="tax" value={formData.tax} onChange={handleChange} className="flex h-10 w-full lg:w-1/2 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                    {taxes.map((tax) => (
                      <option key={tax.id} value={tax.id}>
                        {tax.name} ({tax.type === "Percentage" ? `${tax.value}%` : `$${tax.value}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Recurring Prices Tab */}
            <div className={cn("transition-all duration-300", activeTab === "recurring" ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 pointer-events-none")}>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">Define multiple billing cycles or volume rules.</p>
                  <Button type="button" onClick={addRecurring} size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Row</Button>
                </div>
                
                {recurringPrices.length === 0 ? (
                   <div className="p-8 border border-dashed border-border/50 rounded-xl text-center text-muted-foreground">No recurring prices configured.</div>
                ) : (
                  <div className="space-y-3">
                    {recurringPrices.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border border-border/50 bg-muted/10 grid grid-cols-1 md:grid-cols-6 gap-4 items-end relative group">
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Plan</Label>
                          <select
                            value={r.planId}
                            onChange={(e) => updateRecurring(r.id, "planId", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price ($)</Label>
                          <Input type="number" min="0" step="0.01" value={r.price} onChange={(e) => updateRecurring(r.id, "price", e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Min Qty</Label>
                          <Input type="number" min="1" value={r.minQuantity} onChange={(e) => updateRecurring(r.id, "minQuantity", e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input type="date" value={r.startDate} onChange={(e) => updateRecurring(r.id, "startDate", e.target.value)} />
                        </div>
                        <div className="flex items-center pt-2">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRecurring(r.id)} className="text-destructive hover:bg-destructive/10 ml-auto">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Variants Tab */}
            <div className={cn("transition-all duration-300", activeTab === "variants" ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 pointer-events-none")}>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">Formulate unique attributes triggering price modulations.</p>
                  <Button type="button" onClick={addVariant} size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Variant</Button>
                </div>
                
                {variants.length === 0 ? (
                   <div className="p-8 border border-dashed border-border/50 rounded-xl text-center text-muted-foreground">No variations recorded. Use simple goods config.</div>
                ) : (
                  <div className="space-y-3">
                    {variants.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-border/50 bg-muted/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Attribute Type</Label>
                          <Input value={v.attribute} onChange={(e) => updateVariant(v.id, "attribute", e.target.value)} placeholder="e.g. Size, SLA..." required />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Identified Value</Label>
                          <Input value={v.value} onChange={(e) => updateVariant(v.id, "value", e.target.value)} placeholder="e.g. Large, 24/7 Priority" required />
                        </div>
                        <div className="flex items-center gap-2 w-full">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Extra Price ($)</Label>
                            <Input type="number" step="0.01" value={v.extraPrice} onChange={(e) => updateVariant(v.id, "extraPrice", e.target.value)} />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(v.id)} className="text-destructive hover:bg-destructive/10 mt-6 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 mt-6 border-t border-border/50">
            {/* Optional helper navigation button */}
            <div className="text-xs font-semibold text-muted-foreground uppercase">{activeTab} parameters configured</div>
            <Button type="submit" disabled={saving} className="gap-2 shadow-lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Assemble Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
