"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { DiscountForm } from "@/components/configuration/DiscountForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function DiscountDetailsPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuthStore();
  const { discounts, fetchDiscounts, updateDiscount } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const discount = useMemo(() => discounts.find((item) => item.id === id), [discounts, id]);

  const handleUpdate = async (payload) => {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    try {
      await updateDiscount(id, payload);
      router.push("/dashboard/configuration/discounts");
    } catch (err) {
      setError(err.message || "Failed to update discount");
    } finally {
      setSaving(false);
    }
  };

  if (!discount) {
    return <p className="text-muted-foreground">Loading discount...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuration/discounts"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Discount Details</h1>
          <p className="text-muted-foreground">Update discount values, limits, and targets.</p>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p> : null}
      <DiscountForm initialData={discount} onSubmit={handleUpdate} isSaving={saving} isAdmin={isAdmin} submitLabel="Save Discount" />
    </div>
  );
}
