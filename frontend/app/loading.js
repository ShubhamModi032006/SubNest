export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="h-10 w-56 rounded-xl bg-white/10" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-border/40 bg-card/60" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-96 rounded-3xl border border-border/40 bg-card/60" />
          <div className="h-96 rounded-3xl border border-border/40 bg-card/60" />
        </div>
      </div>
    </div>
  );
}
