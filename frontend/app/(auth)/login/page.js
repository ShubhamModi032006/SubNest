"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { canAccessDashboard } from "@/lib/rbac/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, setError, loading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [validationError, setValidationError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationError("");
    setError(null);
  };

  const validate = () => {
    if (!formData.email || !formData.password) {
      return "All fields are required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }

    setError(null);
    try {
      const data = await login(formData.email, formData.password);
      const role = String(data?.user?.role || "user").toLowerCase();
      router.push(canAccessDashboard(role) ? "/dashboard" : "/");
    } catch (err) {
      setError(err?.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-200/10 bg-slate-900/75 p-7 shadow-[0_30px_80px_-45px_rgba(14,165,233,0.65)] backdrop-blur-xl sm:p-9">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Sign in to continue managing products, plans, invoices, and approval flows.
        </p>
      </div>

      {(error || validationError) && (
        <div className="mb-6 flex gap-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-300" />
          <p className="text-sm font-medium text-rose-200">{error || validationError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-100">Email</label>
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              className="h-12 rounded-xl border-slate-700/80 bg-slate-900/60 pl-12 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-100">Password</label>
            <Link href="/reset-password" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
              Forgot password?
            </Link>
          </div>
          <div className="group relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="h-12 rounded-xl border-slate-700/80 bg-slate-900/60 pl-12 pr-12 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-base font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:from-cyan-400 hover:to-blue-400"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <Link href="/signup" className="block">
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-600 bg-slate-900/60 font-semibold text-slate-100 hover:border-cyan-300/70 hover:bg-slate-800"
        >
          Create a new account
        </Button>
      </Link>
    </div>
  );
}
