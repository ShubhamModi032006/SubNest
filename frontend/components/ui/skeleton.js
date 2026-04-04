import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/30", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-24" />
      <Skeleton className="mt-4 h-3 w-40" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton key={`${rowIndex}_${colIndex}`} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-card/70 p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-1/2" />
    </div>
  );
}
