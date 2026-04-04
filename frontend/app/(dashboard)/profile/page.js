"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api";
import { User, Mail, MapPin, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { user, token, setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      address: user?.address || "",
    });
  }, [user]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

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
      setMessage(err?.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">My profile</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Update your account details, contact info, and profile metadata from one clean dashboard screen.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center border-b border-border/50 pb-6">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-black text-primary ring-4 ring-primary/5">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <h2 className="text-2xl font-bold text-foreground">{user?.name || "Profile"}</h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user?.role || "user"} role
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user?.email || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Address</p>
                <p className="text-sm font-medium text-foreground">{user?.address || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Account</p>
                <p className="text-sm font-medium text-foreground">Dashboard profile access</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/50 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Edit profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">Changes will be saved to your account immediately.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-2"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                className="mt-2"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <Label>Address</Label>
              <Input
                className="mt-2"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {message ? (
              <p className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground">
                {message}
              </p>
            ) : null}

            <Button type="submit" disabled={saving} className="rounded-full px-6">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
