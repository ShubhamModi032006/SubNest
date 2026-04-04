"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function DiscountsPage() {
  const { discounts, loadingDiscounts, fetchDiscounts, deleteDiscount } = useDataStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const onDelete = async (id) => {
    if (!isAdmin) return;
    if (!confirm("Delete this discount?")) return;
    await deleteDiscount(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="mt-2 text-muted-foreground">Define fixed and percentage discounts for products and subscriptions.</p>
        </div>
        {isAdmin ? (
          <Link href="/dashboard/configuration/discounts/new"><Button className="gap-2"><Plus className="h-4 w-4" /> Create Discount</Button></Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Discount Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Min Purchase</th>
              <th className="px-6 py-4">Validity</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loadingDiscounts ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading discounts...</td></tr>
            ) : discounts.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No discounts available.</td></tr>
            ) : (
              discounts.map((discount) => (
                <tr key={discount.id} className="hover:bg-muted/10">
                  <td className="px-6 py-4 font-medium">{discount.name}</td>
                  <td className="px-6 py-4">{discount.type}</td>
                  <td className="px-6 py-4">${Number(discount.minimumPurchase || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {discount.startDate || "Any"} - {discount.endDate || "Open"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/dashboard/configuration/discounts/${discount.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      {isAdmin ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(discount.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
