"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalRequestModal({
  open,
  title,
  description,
  loading,
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl border border-border/60 bg-background p-5 shadow-2xl">
        <h3 className="text-lg font-semibold">{title || "Request admin approval"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {description || "This action is restricted for your role."}
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this action should be approved"
            className="min-h-30 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(reason)}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Sending..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
