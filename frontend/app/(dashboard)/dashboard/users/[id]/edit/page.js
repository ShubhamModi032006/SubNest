"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const { users, fetchUsers, updateUser } = useDataStore();
  const user = useAuthStore((state) => state.user);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "", email: "", role: "user", phone: "", address: ""
  });
  const isAdmin = user?.role?.toLowerCase() === "admin";

  if (!isAdmin) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Users are read-only for internal role. Admin access is required.
      </div>
    );
  }

  useEffect(() => {
    fetchUsers().then(() => setLoading(false));
  }, [fetchUsers]);

  useEffect(() => {
    if (!loading && users.length > 0) {
      const u = users.find(x => x.id === id);
      if (u) {
        setFormData({ name: u.name, email: u.email, role: u.role, phone: u.phone || "", address: u.address || "" });
      }
    }
  }, [loading, users, id]);

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateUser(id, formData);
    router.push(`/dashboard/users/${id}`);
  };

  if (loading) return <div className="p-8 text-center animate-pulse"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/users/${id}`}>
          <Button variant="outline" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit User</h1>
          <p className="text-sm text-muted-foreground">Update profile details for the user account.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
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
              <Input name="phone" value={formData.phone} onChange={handleChange} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Physical Address</Label>
            <Input name="address" value={formData.address} onChange={handleChange} />
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button type="submit" disabled={saving} className="gap-2 shadow-md">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
