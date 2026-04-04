"use client";

import { memo } from "react";
import { CheckCircle2, Clock3, FileEdit, ShieldCheck } from "lucide-react";

const iconByType = {
  created: Clock3,
  updated: FileEdit,
  paid: CheckCircle2,
  approved: ShieldCheck,
};

const colorByType = {
  created: "text-cyan-300",
  updated: "text-amber-300",
  paid: "text-emerald-300",
  approved: "text-violet-300",
};

function ActivityTimelineComponent({ title = "Activity Timeline", events = [] }) {
  return (
    <section className="rounded-xl border border-border/50 bg-card/70 p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <ol className="mt-4 space-y-4">
        {events.length === 0 ? (
          <li className="text-sm text-muted-foreground">No timeline events yet.</li>
        ) : (
          events.map((event, index) => {
            const Icon = iconByType[event.type] || Clock3;
            const colorClass = colorByType[event.type] || "text-cyan-300";
            return (
              <li key={`${event.type}_${index}`} className="relative pl-8">
                <span className="absolute left-0 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/50 bg-background/70">
                  <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
                </span>
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-xs text-muted-foreground">{event.timeLabel}</p>
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}

export const ActivityTimeline = memo(ActivityTimelineComponent);
