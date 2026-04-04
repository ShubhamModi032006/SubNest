"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToToasts } from "@/lib/toast";

const ToastContext = createContext({ toasts: [] });

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap = {
  success: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  error: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  warning: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  info: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [toast, ...prev].slice(0, 5));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((entry) => entry.id !== toast.id));
      }, toast.duration)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [toasts]);

  const removeToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const value = useMemo(() => ({ toasts }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type] || Info;
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto animate-in slide-in-from-top-2 fade-in rounded-xl border p-3 shadow-2xl backdrop-blur-xl",
                styleMap[toast.type] || styleMap.info
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="flex-1 text-sm font-medium">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-md p-1 transition hover:bg-white/10"
                  aria-label="Close toast"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToastState = () => useContext(ToastContext);
