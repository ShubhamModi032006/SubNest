"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, Eye, Box, ArchiveRestore } from "lucide-react";

export default function ProductsPage() {
  const { products, fetchProducts, loadingProducts, deleteProduct, archiveProduct } = useDataStore();
  const { user: authUser } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const isAdmin = authUser?.role === "admin";
  
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDelete = async (id) => {
    if (confirm("Permanently delete this product? Action cannot be undone.")) {
      setDeletingId(id);
      await deleteProduct(id);
      setDeletingId(null);
    }
  };

  const handleArchive = async (id) => {
    if (confirm("Are you sure you want to archive (soft disable) this product?")) {
      await archiveProduct(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Box className="h-8 w-8 text-primary" /> Products Management
          </h1>
          <p className="mt-2 text-muted-foreground">Manage service plans, goods, variations, and recurring price rules.</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/products/new">
            <Button className="w-full sm:w-auto shadow-md gap-2">
              <Plus className="h-4 w-4" /> Create Product
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center sm:justify-between bg-muted/5">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Sales Price</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Cost Price</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingProducts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={6} className="px-6 py-4"><div className="h-6 bg-muted rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className={`hover:bg-muted/10 transition-colors ${p.status === 'archived' ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {p.name}
                      {p.status === 'archived' && <span className="ml-2 text-[10px] uppercase text-destructive border-destructive border px-1 rounded">Archived</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-muted/50 text-xs font-medium">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">${p.salesPrice}</td>
                    <td className="px-6 py-4 hidden md:table-cell font-mono text-muted-foreground">${p.costPrice}</td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                        {p.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/products/${p.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Link href={`/dashboard/products/${p.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-emerald-500"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button 
                              variant="ghost" size="icon" title="Archive"
                              onClick={() => handleArchive(p.id)} disabled={p.status === 'archived'}
                              className="h-8 w-8 hover:text-amber-500 hover:bg-amber-500/10"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" title="Delete"
                              onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                              className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No products discovered. Click "Create Product" to begin building your repository.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
