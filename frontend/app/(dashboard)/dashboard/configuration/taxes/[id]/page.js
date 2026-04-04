"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { TaxForm } from "@/components/configuration/TaxForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function TaxDetailsPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuthStore();
  const { taxes, fetchTaxes, updateTax } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const tax = useMemo(() => taxes.find((item) => item.id === id), [taxes, id]);

  const handleUpdate = async (payload) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await updateTax(id, payload);
      router.push("/dashboard/configuration/taxes");
    } catch (err) {
      setError(err.message || "Failed to update tax");
    } finally {
      setSaving(false);
    }
  };

  if (!tax) {
    return <p className="text-muted-foreground">Loading tax...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuration/taxes"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Tax Details</h1>
          <p className="text-muted-foreground">Review and update tax configuration.</p>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
      <TaxForm initialData={tax} onSubmit={handleUpdate} isSaving={saving} isAdmin={isAdmin} submitLabel="Save Tax" />
    </div>
  );
}
