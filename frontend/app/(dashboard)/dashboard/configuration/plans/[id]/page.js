"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { PlanForm } from "@/components/configuration/PlanForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function PlanDetailsPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuthStore();
  const { plans, fetchPlans, updatePlan } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const plan = useMemo(() => plans.find((item) => item.id === id), [plans, id]);

  const handleUpdate = async (payload) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await updatePlan(id, payload);
      router.push("/dashboard/configuration/plans");
    } catch (err) {
      setError(err.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  if (!plan) {
    return <p className="text-muted-foreground">Loading plan...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuration/plans"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Plan Details</h1>
          <p className="text-muted-foreground">Update plan parameters and recurring behavior.</p>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
      <PlanForm initialData={plan} onSubmit={handleUpdate} isSaving={saving} isAdmin={isAdmin} submitLabel="Save Plan" />
    </div>
  );
}
