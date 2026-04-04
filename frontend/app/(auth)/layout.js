import { Sparkles, CheckCircle2, Shield, Zap } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 bottom-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-12">
        {/* Brand Panel - Left */}
        <section className="hidden lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-cyan-400 to-emerald-400 text-lg font-black text-white shadow-lg shadow-primary/40">
                S
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">SubNest</p>
                <p className="text-xs text-muted-foreground">Subscription Ops</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-5xl font-black leading-tight tracking-tight">
                  <span className="block mb-2">Your subscription</span>
                  <span className="text-transparent bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 bg-clip-text">
                    hub awaits
                  </span>
                </h1>
                <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-md">
                  Manage products, plans, invoices, and approvals in one secure workspace.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Role-based access</p>
                    <p className="text-xs text-muted-foreground">Granular permission control</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Zap className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Stripe ready</p>
                    <p className="text-xs text-muted-foreground">Integrated checkout</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Approval trails</p>
                    <p className="text-xs text-muted-foreground">Audit-friendly workflows</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.1em]">Trusted by teams scaling</p>
            <div className="text-sm font-medium text-foreground">
              99.9% uptime • 10k+ transactions/day • SOC 2 ready
            </div>
          </div>
        </section>

        {/* Form Panel - Right */}
        <section className="flex items-center justify-center">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}
