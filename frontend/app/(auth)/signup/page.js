"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, setError, loading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [validationError, setValidationError] = useState("");

  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /@$!%*?&/.test(formData.password),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setValidationError("");
    setError(null);
  };

  const validate = () => {
    const { name, email, password, confirmPassword } = formData;
    if (!name || !email || !password || !confirmPassword) {
      return "All fields are required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    
    if (!Object.values(passwordChecks).every(Boolean)) {
      return "Password must meet all requirements";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match";
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
      const data = await signup(formData.name, formData.email, formData.password, formData.role);
      const role = String(data?.user?.role || formData.role || "user").toLowerCase();
      router.push(role === "admin" || role === "internal" ? "/dashboard" : "/");
    } catch (err) {
      setError(err?.message || "An unexpected error occurred");
    }
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "from-muted";
    if (passwordStrength < 2) return "from-destructive";
    if (passwordStrength < 4) return "from-yellow-500";
    return "from-emerald-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength < 2) return "Weak";
    if (passwordStrength < 4) return "Fair";
    return "Strong";
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-200/10 bg-slate-900/75 p-7 shadow-[0_30px_80px_-45px_rgba(14,165,233,0.65)] backdrop-blur-xl sm:p-9">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-white">Create account</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Create your SubNest workspace and start managing subscriptions like a pro.
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
          <label className="block text-sm font-semibold text-slate-100">Full name</label>
          <div className="group relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              className="h-12 rounded-xl border-slate-700/80 bg-slate-900/60 pl-12 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
        </div>

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
          <label className="block text-sm font-semibold text-slate-100">Password</label>
          <div className="group relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
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

          {formData.password && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full bg-gradient-to-r ${getPasswordStrengthColor()} to-transparent transition-all duration-300`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                {passwordStrength > 0 && (
                  <span className="text-xs font-semibold text-slate-300">{getPasswordStrengthText()}</span>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${passwordChecks.length ? "text-emerald-400" : "text-slate-500"}`} />
                  8+ chars
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${passwordChecks.lowercase ? "text-emerald-400" : "text-slate-500"}`} />
                  Lowercase
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${passwordChecks.uppercase ? "text-emerald-400" : "text-slate-500"}`} />
                  Uppercase
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${passwordChecks.number ? "text-emerald-400" : "text-slate-500"}`} />
                  Number
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${passwordChecks.special ? "text-emerald-400" : "text-slate-500"}`} />
                  Special char
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-100">Confirm password</label>
          <div className="group relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="h-12 rounded-xl border-slate-700/80 bg-slate-900/60 pl-12 pr-12 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-100"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
            <p className="text-xs font-medium text-emerald-300">Passwords match</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-100">Account type</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 text-slate-100 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="user">User</option>
            <option value="internal">Internal User</option>
          </select>
          <p className="text-xs text-slate-400">
            Admin access is restricted and handled separately.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-base font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:from-cyan-400 hover:to-blue-400"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-7 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <Link href="/login" className="block">
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-600 bg-slate-900/60 font-semibold text-slate-100 hover:border-cyan-300/70 hover:bg-slate-800"
        >
          Sign in instead
        </Button>
      </Link>
    </div>
  );
}
