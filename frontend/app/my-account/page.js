"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api";

export default function MyAccountPage() {
  const { user, token, setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({ name: user?.name || "", email: user?.email || "", address: user?.address || "" });
  }, [user]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const data = await fetchApi(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setAuth({ ...user, ...data.user }, token);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <PortalShell title="My account" subtitle="Keep your profile details up to date.">
        <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-4 rounded-[1.75rem] border border-border/50 bg-card/70 p-4 sm:p-6">
          <div>
            <Label>Name</Label>
            <Input className="mt-2" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-2" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <Label>Address</Label>
            <Input className="mt-2" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          {message ? <p className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm">{message}</p> : null}
          <Button type="submit" disabled={saving} className="rounded-full px-6">{saving ? "Saving..." : "Save changes"}</Button>
        </form>
      </PortalShell>
    </ProtectedRoute>
  );
}
