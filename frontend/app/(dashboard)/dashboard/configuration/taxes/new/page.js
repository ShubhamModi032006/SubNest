"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { TaxForm } from "@/components/configuration/TaxForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function NewTaxPage() {
  const { user } = useAuthStore();
  const { createTax } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const handleCreate = async (payload) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await createTax(payload);
      router.push("/dashboard/configuration/taxes");
    } catch (err) {
      setError(err.message || "Failed to create tax");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuration/taxes"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Create Tax</h1>
          <p className="text-muted-foreground">Add a fixed or percentage tax rule.</p>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
      {!isAdmin ? <p className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">Only Admin can create taxes.</p> : null}
      <TaxForm onSubmit={handleCreate} isSaving={saving} isAdmin={isAdmin} submitLabel="Create Tax" />
    </div>
  );
}
