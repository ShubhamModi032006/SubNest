"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/portal/PortalShell";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function MyOrdersPage() {
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchApi("/my/orders");
        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message || "Unable to load orders");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) loadOrders();
  }, [user]);

  return (
    <ProtectedRoute>
      <PortalShell title="My orders" subtitle="A complete list of your placed orders, totals, and current status.">
        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-red-200">{error}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{order.orderNumber || order.id}</td>
                    <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3 font-semibold">{money(order.totalAmount)}</td>
                    <td className="px-4 py-3"><Link href={`/my-orders/${order.id}`} className="text-primary hover:underline">View</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PortalShell>
    </ProtectedRoute>
  );
}
