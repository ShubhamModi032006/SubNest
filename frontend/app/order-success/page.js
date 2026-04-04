"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const data = await fetchApi(`/my/orders/${orderId}`);
        setOrder(data.order);
      } catch (error) {
        setError(error.message || "Order not found");
      }
    };

    loadOrder();
  }, [orderId]);

  return (
    <PortalShell title="Order success" subtitle="Your order was created and linked to a new subscription and invoice.">
      <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-border/50 bg-card/70 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">✓</div>
        <h2 className="mt-4 text-3xl font-semibold">Success</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || `Order ${order?.orderNumber || orderId} has been placed successfully.`}</p>
          {order?.invoice ? <p className="mt-3 text-sm text-muted-foreground">Invoice #{order.invoice.invoiceNumber} is ready for review in your account.</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/my-orders"><Button className="rounded-full px-6">Go to Orders</Button></Link>
          <Link href="/shop"><Button variant="secondary" className="rounded-full px-6">Continue shopping</Button></Link>
        </div>
      </div>
    </PortalShell>
  );
}
