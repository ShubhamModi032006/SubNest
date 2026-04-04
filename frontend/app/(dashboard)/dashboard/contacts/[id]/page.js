"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit, Mail, Phone, MapPin, User, Building } from "lucide-react";
import Link from "next/link";

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id;
  
  const { contacts, fetchContacts, users, fetchUsers } = useDataStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchContacts(), fetchUsers()]).then(() => setLoading(false));
  }, [fetchContacts, fetchUsers]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading contact details...</div>;

  const contact = contacts.find(c => c.id === id);
  if (!contact) return <div className="p-8 text-destructive">Contact not found</div>;

  const linkedUser = contact.user_id ? users.find(u => u.id === contact.user_id) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contacts">
            <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{contact.name}</h1>
            <p className="text-sm text-muted-foreground">Contact ID: {contact.id}</p>
          </div>
        </div>
        <Link href={`/dashboard/contacts/${id}/edit`}>
          <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
            <Edit className="h-4 w-4" /> Edit Record
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Contact Info */}
        <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Contact Profile</h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold ring-2 ring-primary/20">
                {contact.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{contact.name}</h2>
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              </div>
            </div>
            
            <div className="grid gap-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center shrink-0"><Mail className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Email</p>
                  <p className="text-sm font-medium">{contact.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center shrink-0"><Phone className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Phone</p>
                  <p className="text-sm font-medium">{contact.phone || "No phone recorded"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted/30 flex items-center justify-center shrink-0"><MapPin className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Physical Address</p>
                  <p className="text-sm font-medium">{contact.address || "No address defined"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Association Matrix */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Building className="h-24 w-24" /></div>
            <h3 className="text-lg font-bold mb-4 relative">Account Ownership</h3>
            
            {linkedUser ? (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 relative">
                <p className="text-sm text-muted-foreground font-medium mb-1">Assigned User:</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">{linkedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{linkedUser.email} &bull; <span className="uppercase text-xs font-bold text-primary">{linkedUser.role}</span></p>
                  </div>
                  <Link href={`/dashboard/users/${linkedUser.id}`}>
                    <Button variant="outline" size="sm" className="bg-background">View User</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
                <p className="text-muted-foreground font-medium mb-2">Unassigned Contact</p>
                <p className="text-xs text-muted-foreground text-balance">This contact is currently drifting globally. Assign them to a user to isolate security scope.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
