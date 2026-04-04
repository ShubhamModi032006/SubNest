"use client";

import { memo } from "react";

function SubscriptionGrowthChartComponent({ stats = [] }) {
  const rows = stats.length > 0 ? stats : [{ status: "active", total: 0 }];
  const max = Math.max(...rows.map((item) => Number(item.total || 0)), 1);

  return (
    <div className="rounded-2xl border border-border/50 bg-card/70 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Subscription growth</p>
      <div className="mt-5 space-y-3">
        {rows.map((row) => {
          const width = Math.max(6, (Number(row.total || 0) / max) * 100);
          return (
            <div key={row.status} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-[0.14em] text-muted-foreground">{row.status}</span>
                <span className="font-semibold">{row.total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40">
                <div className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-primary transition-all duration-300" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(SubscriptionGrowthChartComponent);
