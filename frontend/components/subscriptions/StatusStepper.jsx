"use client";

import { cn } from "@/lib/utils";

const stages = ["Draft", "Quotation", "Quotation Sent", "Confirmed", "Active", "Closed"];

export function StatusStepper({ status }) {
  const currentIndex = Math.max(0, stages.indexOf(status));

  return (
    <div className="rounded-xl border border-border/50 bg-card/70 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Flow</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {stages.map((stage, index) => {
          const active = index <= currentIndex;
          return (
            <div
              key={stage}
              className={cn(
                "rounded-md border px-2 py-2 text-center text-xs font-medium",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/50 bg-background/40 text-muted-foreground"
              )}
            >
              {stage}
            </div>
          );
        })}
      </div>
    </div>
  );
}
