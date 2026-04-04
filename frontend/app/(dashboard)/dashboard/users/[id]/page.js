"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, Mail, Phone, MapPin, Shield } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id;
  
  const { users, fetchUsers, contacts, fetchContacts } = useDataStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchContacts()]).then(() => setLoading(false));
  }, [fetchUsers, fetchContacts]);

  if (loading) return <div className="p-8 text-center">Loading user details...</div>;

  const user = users.find(u => u.id === id);
  if (!user) return <div className="p-8 text-destructive">User not found</div>;

  const linkedContacts = contacts.filter(c => c.user_id === id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/users">
            <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
          </div>
        </div>
        <Link href={`/dashboard/users/${id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" /> Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="md:col-span-1 rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6">
          <div className="flex flex-col items-center text-center pb-6 border-b border-border/50">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold mb-4 ring-4 ring-primary/5">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <span className={cn(
              "mt-2 px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-full border",
              user.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" :
              user.role === 'internal' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
              "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}>
              {user.role} ROLE
            </span>
          </div>
          
          <div className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Phone</p>
                <p className="text-sm font-medium">{user.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Address</p>
                <p className="text-sm font-medium text-balance">{user.address || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Contacts Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Joined Date</p>
                <p className="text-foreground font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</p>
                <p className="text-emerald-500 font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Active
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/10">
              <h3 className="text-lg font-bold">Linked Contacts ({linkedContacts.length})</h3>
              <Link href={`/dashboard/contacts/new?user_id=${id}`}>
                <Button variant="outline" size="sm">Add Contact</Button>
              </Link>
            </div>
            <div className="p-0">
              {linkedContacts.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {linkedContacts.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.email} • {c.phone}</p>
                      </div>
                      <Link href={`/dashboard/contacts/${c.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No contacts linked to this user yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
