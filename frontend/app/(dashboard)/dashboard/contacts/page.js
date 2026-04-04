"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, Eye, Filter } from "lucide-react";

export default function ContactsPage() {
  const { contacts, fetchContacts, users, fetchUsers, loadingContacts, deleteContact } = useDataStore();
  const { user: authUser } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchContacts();
    fetchUsers();
  }, [fetchContacts, fetchUsers]);

  const isAdminOrInternal = authUser?.role === "admin" || authUser?.role === "internal";
  
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = userFilter ? c.user_id === userFilter : true;
    return matchesSearch && matchesUser;
  });

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      setDeletingId(id);
      await deleteContact(id);
      setDeletingId(null);
    }
  };

  const getUserName = (userId) => {
    return users.find(u => u.id === userId)?.name || "Unknown User";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Contacts Directory</h1>
          <p className="mt-2 text-muted-foreground">Manage centralized contacts and their associated user accounts.</p>
        </div>
        {isAdminOrInternal && (
          <Link href="/dashboard/contacts/new">
            <Button className="w-full sm:w-auto shadow-md gap-2">
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center sm:justify-between bg-muted/5">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none"
            >
              <option value="">All Assignees</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Name & Email</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Phone</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Linked User</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingContacts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td colSpan={4} className="px-6 py-4"><div className="h-6 bg-muted rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell font-mono text-xs">{c.phone || "—"}</td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-1 rounded border border-border/50 bg-background/50 text-xs font-medium">
                        {getUserName(c.user_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/contacts/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {isAdminOrInternal && (
                          <>
                            <Link href={`/dashboard/contacts/${c.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-emerald-500"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button 
                              variant="ghost" size="icon" 
                              onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
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
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No contacts found. {searchTerm || userFilter ? "Try adjusting filters." : ""}
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
