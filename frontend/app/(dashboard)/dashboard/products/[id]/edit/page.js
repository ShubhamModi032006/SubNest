"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { canEditProduct } from "@/lib/rbac/permissions";

export default function EditProductPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  const { products, plans, taxes, fetchProducts, fetchPlans, fetchTaxes, updateProduct } = useDataStore();
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    name: "", type: "Service", salesPrice: "", costPrice: "", tax: ""
  });

  const [recurringPrices, setRecurringPrices] = useState([]);
  const [variants, setVariants] = useState([]);
  const canEdit = canEditProduct(user?.role);

  if (!canEdit) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        You do not have access to edit products.
      </div>
    );
  }

  useEffect(() => {
    Promise.all([fetchProducts(), fetchPlans(), fetchTaxes()]).then(() => setLoading(false));
  }, [fetchProducts, fetchPlans, fetchTaxes]);

  useEffect(() => {
    if (!loading && products.length > 0) {
      const p = products.find(x => x.id === id);
      if (p) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({ 
          name: p.name, type: p.type, 
          salesPrice: p.salesPrice, costPrice: p.costPrice, tax: p.tax || taxes[0]?.id || "" 
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecurringPrices((p.recurringPrices || []).map((item) => ({
          ...item,
          planId: item.planId || plans.find((plan) => plan.name === item.planName)?.id || "",
        })));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVariants(p.variants || []);
      }
    }
  }, [loading, products, id, taxes, plans]);

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
      await updateProduct(id, payload);
      router.push(`/dashboard/products/${id}`);
    } catch (err) {
      setError(err?.message || "Failed to modify product.");
    } finally {
      setSaving(false);
    }
  };

  const addRecurring = () => setRecurringPrices(p => [...p, { id: Date.now().toString(), planId: plans[0]?.id || "", price: 0, minQuantity: 1, startDate: "", endDate: "" }]);
  const removeRecurring = (rId) => setRecurringPrices(p => p.filter(r => r.id !== rId));
  const updateRecurring = (rId, field, val) => setRecurringPrices(p => p.map(r => r.id === rId ? { ...r, [field]: val } : r));

  const addVariant = () => setVariants(p => [...p, { id: Date.now().toString(), attribute: "", value: "", extraPrice: 0 }]);
  const removeVariant = (vId) => setVariants(p => p.filter(v => v.id !== vId));
  const updateVariant = (vId, field, val) => setVariants(p => p.map(v => v.id === vId ? { ...v, [field]: val } : v));

  if (loading) return <div className="p-8 text-center animate-pulse"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/products/${id}`}>
          <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Product Properties</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="flex px-4 pt-4 mb-2 gap-2 border-b border-border/50 bg-muted/5 overflow-x-auto">
          {["basic", "recurring", "variants"].map((tab) => (
            <button
              key={tab} type="button" onClick={() => setActiveTab(tab)}
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
                  <Label>Product Name</Label>
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
                  <p className="text-sm text-muted-foreground">Modify multiple billing cycles or volume rules.</p>
                  <Button type="button" onClick={addRecurring} size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Row</Button>
                </div>
                {recurringPrices.length === 0 ? <div className="p-8 border border-dashed border-border/50 rounded-xl text-center text-muted-foreground">No recurring prices configured.</div> : (
                  <div className="space-y-3">
                    {recurringPrices.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border border-border/50 bg-muted/10 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2 space-y-1">
                          <Label className="text-xs">Plan</Label>
                          <select
                            value={r.planId}
                            onChange={(e) => updateRecurring(r.id, "planId", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Price ($)</Label><Input type="number" min="0" step="0.01" value={r.price} onChange={(e) => updateRecurring(r.id, "price", e.target.value)} required /></div>
                        <div className="space-y-1"><Label className="text-xs">Min Qty</Label><Input type="number" min="1" value={r.minQuantity} onChange={(e) => updateRecurring(r.id, "minQuantity", e.target.value)} required /></div>
                        <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={r.startDate} onChange={(e) => updateRecurring(r.id, "startDate", e.target.value)} /></div>
                        <div className="flex justify-end pt-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeRecurring(r.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></div>
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
                  <p className="text-sm text-muted-foreground">Control dimensions like Brand, SLA tiers.</p>
                  <Button type="button" onClick={addVariant} size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Variant</Button>
                </div>
                {variants.length === 0 ? <div className="p-8 border border-dashed border-border/50 rounded-xl text-center text-muted-foreground">No variations recorded.</div> : (
                  <div className="space-y-3">
                    {variants.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-border/50 bg-muted/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1"><Label className="text-xs">Attribute Type</Label><Input value={v.attribute} onChange={(e) => updateVariant(v.id, "attribute", e.target.value)} required /></div>
                        <div className="md:col-span-2 space-y-1"><Label className="text-xs">Value</Label><Input value={v.value} onChange={(e) => updateVariant(v.id, "value", e.target.value)} required /></div>
                        <div className="flex items-center gap-2"><div className="space-y-1 flex-1"><Label className="text-xs">Extra Price ($)</Label><Input type="number" step="0.01" value={v.extraPrice} onChange={(e) => updateVariant(v.id, "extraPrice", e.target.value)} /></div><Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(v.id)} className="text-destructive hover:bg-destructive/10 mt-6"><Trash2 className="h-4 w-4" /></Button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center pt-8 mt-6 border-t border-border/50">
            <Button type="submit" disabled={saving} className="gap-2 shadow-lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
