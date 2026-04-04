"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useApprovalStore } from "@/store/approvalStore";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/rbac/permissions";

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

const resolveActionLabel = (item) => {
  const operation = String(item?.payload?.operation || "").toUpperCase();

  if (item.action_type === "MODIFY_PRICING" && item.entity_type === "product" && operation === "CREATE_PRODUCT") {
    return "CREATE_PRODUCT";
  }

  return item.action_type;
};

const resolveEntitySummary = (item) => {
  if (item.action_type === "MODIFY_PRICING" && item.entity_type === "product" && String(item?.payload?.operation || "").toUpperCase() === "CREATE_PRODUCT") {
    const product = item?.payload?.product || {};
    const name = product?.name || "Pending product";
    const type = String(product?.type || "").toLowerCase() === "goods" ? "Goods" : "Service";
    return `${name} (${type})`;
  }

  if (item.action_type === "DELETE_PRODUCT") {
    return item?.payload?.product_name || item.entity_id;
  }

  return item.entity_id;
};

export default function ApprovalsPage() {
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const admin = isAdmin(role);
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    requests,
    loadingRequests,
    notification,
    fetchRequests,
    approveRequest,
    rejectRequest,
    clearNotification,
  } = useApprovalStore();

  useEffect(() => {
    fetchRequests().catch(() => {});
  }, [fetchRequests]);

  const summary = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        const status = String(item.status || "").toLowerCase();
        if (status === "pending") acc.pending += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "rejected") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((item) => String(item.status || "").toLowerCase() === statusFilter);
  }, [requests, statusFilter]);

  const onApprove = async (id) => {
    if (!admin) {
      return;
    }

    try {
      await approveRequest(id);
    } catch (_) {
      // Notification is handled in approvalStore.
    }
  };

  const onReject = async (id) => {
    if (!admin) {
      return;
    }

    try {
      await rejectRequest(id);
    } catch (_) {
      // Notification is handled in approvalStore.
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {admin
              ? "Review pending requests and approve or reject restricted operations."
              : "Track your submitted requests and wait for admin decisions."}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchRequests()}>
          Refresh
        </Button>
      </div>

      {searchParams.get("created") === "1" ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Approval request submitted successfully. It is now pending admin review.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm">
          <p className="text-xs uppercase text-muted-foreground">Pending</p>
          <p className="text-xl font-semibold text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm">
          <p className="text-xs uppercase text-muted-foreground">Approved</p>
          <p className="text-xl font-semibold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm">
          <p className="text-xs uppercase text-muted-foreground">Rejected</p>
          <p className="text-xl font-semibold text-rose-700">{summary.rejected}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
        <Button size="sm" variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")}>Pending</Button>
        <Button size="sm" variant={statusFilter === "approved" ? "default" : "outline"} onClick={() => setStatusFilter("approved")}>Approved</Button>
        <Button size="sm" variant={statusFilter === "rejected" ? "default" : "outline"} onClick={() => setStatusFilter("rejected")}>Rejected</Button>
      </div>

      {notification ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            notification.type === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={clearNotification}
              className="text-xs font-semibold uppercase"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loadingRequests ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Loading approvals...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No approval requests found.
                </td>
              </tr>
            ) : (
              visibleRequests.map((item) => {
                const pending = item.status === "pending";
                return (
                  <tr key={item.id} className="align-top hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                          statusStyles[item.status] || "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{resolveActionLabel(item)}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{item.entity_type}</div>
                      <div className="font-mono text-xs">{resolveEntitySummary(item)}</div>
                    </td>
                    <td className="px-4 py-3">{item.requester_name || item.user_id}</td>
                    <td className="px-4 py-3">{item.reason || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>Created: {new Date(item.created_at).toLocaleString()}</div>
                      <div>
                        Reviewed: {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : "Pending"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {admin && pending ? (
                        <div className="inline-flex gap-2">
                          <Button size="sm" onClick={() => onApprove(item.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onReject(item.id)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
