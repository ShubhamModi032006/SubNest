"use client";

import { memo } from "react";

function RevenueTrendChartComponent({ data = [] }) {
  const points = data.length > 0 ? data : [
    { label: "Jan", value: 0 },
    { label: "Feb", value: 0 },
    { label: "Mar", value: 0 },
    { label: "Apr", value: 0 },
    { label: "May", value: 0 },
    { label: "Jun", value: 0 },
  ];

  const max = Math.max(...points.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Revenue trend</p>
      <div className="mt-5 flex h-56 items-end gap-2">
        {points.map((point) => {
          const height = Math.max(8, (Number(point.value || 0) / max) * 100);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-xl bg-gradient-to-t from-primary to-cyan-400 transition-all duration-300" style={{ height: `${height}%` }} />
              <span className="text-[11px] text-muted-foreground">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RevenueTrendChartComponent);
