"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PortalShell } from "@/components/portal/PortalShell";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function MySubscriptionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addSubscription = useCartStore((state) => state.addSubscription);
  const [subscriptions, setSubscriptions] = useState([]);
  const [catalogSubscriptions, setCatalogSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const [assignedData, catalogData] = await Promise.all([
          fetchApi("/my/subscriptions"),
          fetchApi("/portal/subscriptions"),
        ]);
            setSubscriptions(assignedData?.data?.subscriptions || []);
            setCatalogSubscriptions((catalogData?.data?.subscriptions || []).filter((subscription) => subscription.isPublic ?? subscription.is_public ?? true));
      } catch (err) {
        setError(err.message || "Unable to load subscriptions");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadSubscriptions();
    }
  }, [user]);

  const refreshLists = async () => {
    const [assignedData, catalogData] = await Promise.all([
      fetchApi("/my/subscriptions"),
      fetchApi("/portal/subscriptions"),
    ]);
    setSubscriptions(assignedData?.data?.subscriptions || []);
    setCatalogSubscriptions((catalogData?.data?.subscriptions || []).filter((subscription) => subscription.isPublic ?? subscription.is_public ?? true));
  };

  const addToCart = (subscription) => {
    if (!subscription || !subscription.id) return;
    setAddingId(subscription.id);
    setError("");
    setMessage("");
    try {
      addSubscription(subscription);
      setMessage("Subscription added to cart!");
      setTimeout(() => {
        router.push("/cart");
      }, 800);
    } catch (err) {
      setError(err.message || "Unable to add subscription to cart");
      setAddingId("");
    }
  };

  return (
    <ProtectedRoute>
      <PortalShell title="My subscriptions" subtitle="Browse available offerings and track subscriptions assigned to your account.">
        {message ? <p className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
        <div className="mb-6 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70">
          <div className="border-b border-border/50 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Available subscriptions</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading subscriptions...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-red-200">{error}</td></tr>
              ) : catalogSubscriptions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No public subscriptions available.</td></tr>
              ) : (
                catalogSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{subscription.subscriptionNumber || subscription.id}</td>
                    <td className="px-4 py-3">{subscription.planName || "-"}</td>
                    <td className="px-4 py-3">{subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">{subscription.paymentTerms || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{money(subscription.amountTotal)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={addingId === subscription.id}
                        onClick={() => addToCart(subscription)}
                      >
                        {addingId === subscription.id ? (
                          <>
                            <ShoppingCart className="mr-2 h-3.5 w-3.5" /> Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-3.5 w-3.5" /> Add to Cart
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70">
          <div className="border-b border-border/50 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">My assigned subscriptions</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading subscriptions...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-red-200">{error}</td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No subscriptions found.</td></tr>
              ) : (
                subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium">{subscription.subscriptionNumber || subscription.id}</td>
                    <td className="px-4 py-3">{subscription.planName || "-"}</td>
                    <td className="px-4 py-3 capitalize">{subscription.status || "-"}</td>
                    <td className="px-4 py-3">{subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">{subscription.paymentTerms || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{money(subscription.amountTotal)}</td>
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
