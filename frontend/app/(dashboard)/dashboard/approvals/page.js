"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useApprovalStore } from "@/store/approvalStore";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/rbac/permissions";

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function ApprovalsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const admin = isAdmin(role);

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

  const onApprove = async (id) => {
    await approveRequest(id);
  };

  const onReject = async (id) => {
    await rejectRequest(id);
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Review restricted actions and track request status updates.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchRequests()}>
          Refresh
        </Button>
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
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No approval requests found.
                </td>
              </tr>
            ) : (
              requests.map((item) => {
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
                    <td className="px-4 py-3 font-medium">{item.action_type}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{item.entity_type}</div>
                      <div className="font-mono text-xs">{item.entity_id}</div>
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
