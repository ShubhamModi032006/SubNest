"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateContactPage() {
  const router = useRouter();
  const { createContact, users, fetchUsers } = useDataStore();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", address: "", user_id: ""
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError("Name and email are required"); return;
    }
    
    setSaving(true); setError(null);
    try {
      await createContact({ ...formData, user_id: formData.user_id || undefined });
      router.push("/dashboard/contacts");
    } catch (err) {
      setError(err.message || "Failed to create contact");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contacts">
          <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add New Contact</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Linked User (Owner)</Label>
              <select name="user_id" value={formData.user_id} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                <option value="">No linked user</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Physical Address</Label>
            <Input name="address" value={formData.address} onChange={handleChange} />
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button type="submit" disabled={saving} className="gap-2 shadow-md">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Create Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
