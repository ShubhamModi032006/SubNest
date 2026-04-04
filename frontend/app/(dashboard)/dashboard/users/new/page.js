"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateUserPage() {
  const router = useRouter();
  const { createUser } = useDataStore();
  const { user: authUser } = useAuthStore();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "user", phone: "", address: ""
  });

  const isAdmin = authUser?.role === "admin";
  if (!isAdmin) {
    return <div className="p-8 text-center text-destructive">Unauthorized. Only Admins can create users.</div>;
  }

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("Name, email and password are required"); return;
    }
    
    setSaving(true); setError(null);
    try {
      await createUser(formData);
      router.push("/dashboard/users");
    } catch (err) {
      setError(err.message || "Failed to create user");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New User</h1>
          <p className="text-sm text-muted-foreground">Add a new portal, internal, or admin account.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" required />
            </div>
            <div className="space-y-2">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <Label>Account Role</Label>
              <select name="role" value={formData.role} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                <option value="user">User / Portal</option>
                <option value="internal">Internal Team</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 ..." />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Physical Address</Label>
            <Input name="address" value={formData.address} onChange={handleChange} placeholder="123 Example Blvd, City, Country" />
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button type="submit" disabled={saving} className="gap-2 shadow-md">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
