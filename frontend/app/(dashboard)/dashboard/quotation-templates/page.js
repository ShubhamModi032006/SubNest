"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-200 text-slate-700",
};

export default function QuotationTemplatesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const quotationTemplates = useDataStore((state) => state.quotationTemplates);
  const loadingQuotationTemplates = useDataStore((state) => state.loadingQuotationTemplates);
  const fetchQuotationTemplates = useDataStore((state) => state.fetchQuotationTemplates);
  const deleteQuotationTemplate = useDataStore((state) => state.deleteQuotationTemplate);

  useEffect(() => {
    fetchQuotationTemplates();
  }, [fetchQuotationTemplates]);

  const canManage = String(role || "").toLowerCase() === "admin";

  if (!canManage) {
    return <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Quotation templates are restricted to admins.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quotation Templates</h1>
          <p className="text-sm text-muted-foreground">Create reusable quotation templates for subscription orders.</p>
        </div>
        {canManage ? (
          <Link href="/dashboard/quotation-templates/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            New Template
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loadingQuotationTemplates ? (
              <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>Loading templates...</td></tr>
            ) : quotationTemplates.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No templates found.</td></tr>
            ) : (
              quotationTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{template.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${statusColors[template.status] || statusColors.inactive}`}>
                      {template.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{template.productLines?.length || 0}</td>
                  <td className="px-4 py-3">{new Date(template.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/quotation-templates/${template.id}`} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/20">
                        View
                      </Link>
                      {canManage ? (
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm("Delete this template?")) {
                              deleteQuotationTemplate(template.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
