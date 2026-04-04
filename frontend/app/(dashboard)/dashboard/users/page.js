"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { users, fetchUsers, loadingUsers, deleteUser } = useDataStore();
  const { user: authUser } = useAuthStore();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const isAdmin = authUser?.role === "admin";
  
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      setDeletingId(id);
      await deleteUser(id);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Users Management</h1>
          <p className="mt-2 text-muted-foreground">
            Manage system users, their access roles, and permissions.
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/users/new">
            <Button className="w-full sm:w-auto shadow-md gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold hidden lg:table-cell">Created Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingUsers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-3/4"></div></td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 bg-muted rounded w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-1/2"></div></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-1/2"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border",
                        u.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" :
                        u.role === 'internal' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/users/${u.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Link href={`/dashboard/users/${u.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-500">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(u.id)}
                              disabled={deletingId === u.id}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found matching your search.
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
