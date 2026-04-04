"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { PlanForm } from "@/components/configuration/PlanForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function NewPlanPage() {
  const { user } = useAuthStore();
  const { createPlan } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const handleCreate = async (payload) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await createPlan(payload);
      router.push("/dashboard/configuration/plans");
    } catch (err) {
      setError(err.message || "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuration/plans"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Create Plan</h1>
          <p className="text-muted-foreground">Define recurring pricing references and options.</p>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
      {!isAdmin ? <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">Only Admin can create plans.</p> : null}
      <PlanForm onSubmit={handleCreate} isSaving={saving} isAdmin={isAdmin} submitLabel="Create Plan" />
    </div>
  );
}
