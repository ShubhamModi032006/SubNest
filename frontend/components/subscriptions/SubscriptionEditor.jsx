"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicOrderTable } from "@/components/subscriptions/DynamicOrderTable";
import { PricingSummaryCard } from "@/components/subscriptions/PricingSummaryCard";
import { StatusStepper } from "@/components/subscriptions/StatusStepper";

const initialForm = {
  customerId: "",
  customerType: "user",
  customerLabel: "",
  quotationTemplate: "",
  recurringPlanId: "",
  recurringPlanLabel: "",
  startDate: "",
  expirationDate: "",
  paymentTerms: "Due on receipt",
  nextInvoiceDate: "",
  salesperson: "",
  paymentMethod: "",
  notes: "",
  status: "Draft",
};

const statuses = ["Draft", "Quotation", "Quotation Sent", "Confirmed", "Active", "Closed"];

const canSend = (status) => ["Draft", "Quotation"].includes(status);
const canConfirm = (status) => status === "Quotation Sent";
const canClose = (status) => ["Confirmed", "Active"].includes(status);
const canRenew = (status) => status === "Closed";
const canUpsell = (status) => ["Confirmed", "Active"].includes(status);

export function SubscriptionEditor({ mode = "create", initialSubscription }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    users,
    contacts,
    products,
    plans,
    taxes,
    discounts,
    fetchUsers,
    fetchContacts,
    fetchProducts,
    fetchPlans,
    fetchTaxes,
    fetchDiscounts,
    createSubscription,
    updateSubscription,
    runSubscriptionAction,
    setSubscriptionDraft,
    resetSubscriptionDraft,
    subscriptionDraft,
  } = useDataStore();

  const [activeTab, setActiveTab] = useState("order");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderLines, setOrderLines] = useState(initialSubscription?.orderLines || []);

  const role = user?.role?.toLowerCase();
  const canManage = role === "admin" || role === "internal";
  const isAdmin = role === "admin";

  const [form, setForm] = useState(() => ({
    ...initialForm,
    ...subscriptionDraft,
    ...(initialSubscription || {}),
  }));

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.recurringPlanId),
    [plans, form.recurringPlanId]
  );

  const customerOptions = useMemo(() => {
    const userOptions = users.map((item) => ({ value: `user:${item.id}`, label: `${item.name} (User)` }));
    const contactOptions = contacts.map((item) => ({ value: `contact:${item.id}`, label: `${item.name} (Contact)` }));
    return [...userOptions, ...contactOptions];
  }, [users, contacts]);

  const selectedStatus = form.status || "Draft";

  useEffect(() => {
    fetchUsers();
    fetchContacts();
    fetchProducts();
    fetchPlans();
    fetchTaxes();
    fetchDiscounts();
  }, [fetchUsers, fetchContacts, fetchProducts, fetchPlans, fetchTaxes, fetchDiscounts]);

  useEffect(() => {
    if (mode === "create" && !form.recurringPlanId && plans.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, recurringPlanId: plans[0].id, recurringPlanLabel: plans[0].name }));
    }
  }, [mode, plans, form.recurringPlanId]);

  useEffect(() => {
    if (mode === "create") {
      setSubscriptionDraft({ ...form, orderLines });
    }
  }, [mode, form, orderLines, setSubscriptionDraft]);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onCustomerChange = (value) => {
    const [customerType, customerId] = value.split(":");
    const label = customerOptions.find((item) => item.value === value)?.label || "";
    setForm((prev) => ({ ...prev, customerType, customerId, customerLabel: label }));
  };

  const validate = () => {
    if (!form.customerId) return "Customer is required.";
    if (!form.recurringPlanId) return "Recurring plan is required.";
    if (!form.startDate) return "Start date is required.";
    if (form.expirationDate && new Date(form.expirationDate) < new Date(form.startDate)) {
      return "Expiration date must be after start date.";
    }
    if (orderLines.length === 0) return "At least one order line is required.";
    return "";
  };

  const payload = {
    ...form,
    recurringPlanLabel: selectedPlan?.name || "",
    orderLines,
  };

  const persist = async (nextStatus = form.status || "Draft") => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return null;
    }

    setSaving(true);
    setError("");
    try {
      const withStatus = { ...payload, status: nextStatus };
      if (mode === "create") {
        const created = await createSubscription(withStatus);
        resetSubscriptionDraft();
        return created;
      }
      const updated = await updateSubscription(initialSubscription.id, withStatus);
      return updated;
    } catch (err) {
      setError(err.message || "Failed to save subscription");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const saved = await persist("Draft");
    if (saved && mode === "create") {
      router.push(`/dashboard/subscriptions/${saved.id}`);
    }
  };

  const sendQuotation = async () => {
    let currentId = initialSubscription?.id;
    if (!currentId) {
      const created = await persist(form.status || "Draft");
      if (!created) return;
      currentId = created.id;
    }
    const updated = await runSubscriptionAction(currentId, "send");
    router.push(`/dashboard/subscriptions/${updated.id}`);
  };

  const confirmSubscription = async () => {
    if (!initialSubscription?.id) return;
    if (!window.confirm("Confirm this subscription?")) return;
    const updated = await runSubscriptionAction(initialSubscription.id, "confirm");
    setForm((prev) => ({ ...prev, status: updated.status }));
  };

  const closeSubscription = async () => {
    if (!initialSubscription?.id) return;
    if (!window.confirm("Close this subscription?")) return;
    const updated = await runSubscriptionAction(initialSubscription.id, "close");
    setForm((prev) => ({ ...prev, status: updated.status }));
  };

  const renewSubscription = async () => {
    if (!initialSubscription?.id) return;
    const updated = await runSubscriptionAction(initialSubscription.id, "renew");
    setForm((prev) => ({ ...prev, status: updated.status }));
  };

  const upsellSubscription = async () => {
    if (!initialSubscription?.id) return;
    const updated = await runSubscriptionAction(initialSubscription.id, "upsell");
    setForm((prev) => ({ ...prev, status: updated.status }));
  };

  const cancelSubscription = async () => {
    if (!initialSubscription?.id) return;
    if (!window.confirm("Cancel and close this subscription?")) return;
    const updated = await runSubscriptionAction(initialSubscription.id, "close");
    setForm((prev) => ({ ...prev, status: updated.status }));
  };

  if (!canManage) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">You do not have access to subscriptions.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "create" ? "Create Subscription" : `Subscription ${initialSubscription.subscriptionNumber}`}
            </h1>
            <p className="text-sm text-muted-foreground">Manage full lifecycle from draft to closure and renewal.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{selectedStatus}</span>
        </div>

        <StatusStepper status={selectedStatus} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={saveDraft} disabled={saving || !canManage}>Save (Draft)</Button>
          <Button variant="secondary" onClick={sendQuotation} disabled={saving || !canSend(selectedStatus)}>Send (Quotation)</Button>
          <Button variant="secondary" onClick={confirmSubscription} disabled={saving || !initialSubscription?.id || !canConfirm(selectedStatus)}>Confirm</Button>
          <Button variant="outline" disabled>Create Invoice</Button>
          <Button variant="outline" onClick={cancelSubscription} disabled={saving || !initialSubscription?.id || selectedStatus === "Closed"}>Cancel</Button>
          <Button variant="outline" onClick={closeSubscription} disabled={saving || !initialSubscription?.id || !canClose(selectedStatus)}>Close</Button>
          <Button variant="outline" onClick={renewSubscription} disabled={saving || !initialSubscription?.id || !canRenew(selectedStatus)}>Renew</Button>
          <Button variant="outline" onClick={upsellSubscription} disabled={saving || !initialSubscription?.id || !canUpsell(selectedStatus)}>Upsell</Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border/50 bg-card/70 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer</Label>
                <select
                  value={`${form.customerType}:${form.customerId}`}
                  onChange={(e) => onCustomerChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                  disabled={!canManage}
                >
                  <option value=":">Select customer</option>
                  {customerOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quotation Template (optional)</Label>
                <Input value={form.quotationTemplate || ""} onChange={(e) => updateForm("quotationTemplate", e.target.value)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label>Recurring Plan</Label>
                <select
                  value={form.recurringPlanId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const plan = plans.find((item) => item.id === value);
                    updateForm("recurringPlanId", value);
                    updateForm("recurringPlanLabel", plan?.name || "");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                  disabled={!canManage}
                >
                  <option value="">Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input value={form.paymentTerms || ""} onChange={(e) => updateForm("paymentTerms", e.target.value)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate || ""} onChange={(e) => updateForm("startDate", e.target.value)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input type="date" value={form.expirationDate || ""} onChange={(e) => updateForm("expirationDate", e.target.value)} disabled={!canManage} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/50 bg-card/70 p-5">
            <div className="mb-4 flex gap-2">
              <Button type="button" size="sm" variant={activeTab === "order" ? "default" : "outline"} onClick={() => setActiveTab("order")}>Order Lines</Button>
              <Button type="button" size="sm" variant={activeTab === "other" ? "default" : "outline"} onClick={() => setActiveTab("other")}>Other Info</Button>
            </div>

            {activeTab === "order" ? (
              <DynamicOrderTable
                orderLines={orderLines}
                onChange={setOrderLines}
                products={products}
                taxes={taxes}
                discounts={discounts}
                selectedPlan={selectedPlan}
                readOnly={!canManage}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Salesperson</Label>
                  <Input value={form.salesperson || ""} onChange={(e) => updateForm("salesperson", e.target.value)} disabled={!canManage} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Input value={form.paymentMethod || ""} onChange={(e) => updateForm("paymentMethod", e.target.value)} disabled={!canManage} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => updateForm("notes", e.target.value)}
                    disabled={!canManage}
                    className="min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </section>

          {mode === "edit" ? (
            <section className="rounded-xl border border-border/50 bg-card/70 p-5">
              <h3 className="mb-3 text-lg font-semibold">Status Timeline</h3>
              <div className="space-y-2">
                {(initialSubscription.timeline || []).map((event, index) => (
                  <div key={`${event.at}_${index}`} className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                    <span className="font-medium">{event.status}</span>
                    <span className="ml-2 text-muted-foreground">{new Date(event.at).toLocaleString()}</span>
                    <p className="text-muted-foreground">{event.note}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <PricingSummaryCard orderLines={orderLines} />
      </div>

      {!isAdmin ? (
        <p className="rounded-md bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Internal role can create/manage subscriptions, but destructive controls are restricted.
        </p>
      ) : null}

      {statuses.includes(selectedStatus) ? null : (
        <p className="text-sm text-muted-foreground">Unknown status: {selectedStatus}</p>
      )}
    </div>
  );
}
