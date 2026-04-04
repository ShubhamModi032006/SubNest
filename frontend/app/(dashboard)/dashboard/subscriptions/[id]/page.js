"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionEditor } from "@/components/subscriptions/SubscriptionEditor";

export default function SubscriptionDetailsPage() {
  const params = useParams();
  const id = params.id;
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/subscriptions/${id}`);
      const data = await res.json();
      if (mounted) {
        setSubscription(data.subscription || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading subscription...</p>;
  }

  if (!subscription) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Subscription not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/subscriptions"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Subscription Detail</h1>
          <p className="text-muted-foreground">View full info, order lines, pricing and timeline.</p>
        </div>
      </div>

      <SubscriptionEditor mode="edit" initialSubscription={subscription} />
    </div>
  );
}
