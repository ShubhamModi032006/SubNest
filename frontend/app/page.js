import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-[0.05]"></div>
      <div className="relative z-10 space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
          Modern Authentication
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          A premium SaaS dashboard template featuring a robust authentication system built with Next.js App Router, Tailwind CSS, and Zustand.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="px-8 shadow-lg shadow-primary/20">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary" size="lg" className="px-8">
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
