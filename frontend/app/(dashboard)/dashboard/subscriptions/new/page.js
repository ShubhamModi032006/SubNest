"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionEditor } from "@/components/subscriptions/SubscriptionEditor";

export default function NewSubscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/subscriptions"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">New Subscription</h1>
          <p className="text-muted-foreground">Create draft, send quotation, and confirm lifecycle states.</p>
        </div>
      </div>
      <SubscriptionEditor mode="create" />
    </div>
  );
}
