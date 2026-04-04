"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id;
  
  const { products, fetchProducts } = useDataStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(() => setLoading(false));
  }, [fetchProducts]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Retrieving product schematics...</div>;

  const product = products.find(p => p.id === id);
  if (!product) return <div className="p-8 text-destructive flex items-center justify-center gap-2"><AlertTriangle className="h-5 w-5"/> Record not identified</div>;

  const recurring = product.recurringPrices || [];
  const variants = product.variants || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{product.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">ID: {product.id} • {product.status}</p>
          </div>
        </div>
        <Link href={`/dashboard/products/${id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" /> Manage Item
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-1 rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6 h-fit">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide text-primary">Core Profile</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Type</span>
              <span className="font-semibold text-foreground">{product.type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Sales Potential</span>
              <span className="font-mono text-emerald-500 font-bold">${product.salesPrice}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Calculated Cost</span>
              <span className="font-mono text-destructive font-bold">${product.costPrice}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground font-medium">Tax Band</span>
              <span className="font-semibold">{product.tax}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground font-medium">Generated On</span>
              <span className="font-medium">{new Date(product.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Extensions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recurring Price Table */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/10 font-bold tracking-tight">Recurring Service Plans</div>
            {recurring.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-background/20 text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3">Plan Bracket</th>
                    <th className="px-5 py-3">Vol Limit</th>
                    <th className="px-5 py-3">Start Date</th>
                    <th className="px-5 py-3 text-right">Fixed Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recurring.map(r => (
                    <tr key={r.id} className="hover:bg-muted/5">
                      <td className="px-5 py-3 font-semibold">{r.plan}</td>
                      <td className="px-5 py-3 font-mono text-xs">{r.minQuantity}+</td>
                      <td className="px-5 py-3">{r.startDate || 'Immediate'}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-500">${r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <div className="p-8 text-center text-muted-foreground">Standardized item. No active recurring rules detected.</div>
            )}
          </div>

          {/* Variants Blocks */}
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/10 font-bold tracking-tight">Commodity Variants</div>
            {variants.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-background/20 text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3">Attribute Axis</th>
                    <th className="px-5 py-3">Specific Value</th>
                    <th className="px-5 py-3 text-right">Pricing Offset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {variants.map(v => (
                    <tr key={v.id} className="hover:bg-muted/5">
                      <td className="px-5 py-3 text-xs uppercase font-bold tracking-wider">{v.attribute}</td>
                      <td className="px-5 py-3 font-medium">{v.value}</td>
                      <td className="px-5 py-3 text-right font-mono text-blue-500 font-bold">+{v.extraPrice ? `$${v.extraPrice}` : 'Included'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
               <div className="p-8 text-center text-muted-foreground">No variant dimensions exist. Sold as standard commodity.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
