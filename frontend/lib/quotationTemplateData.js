let quotationTemplates = [];

const genId = () => `qt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const normalizeLine = (line) => ({
  id: line.id || `ql_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  productId: line.productId || "",
  productName: line.productName || "",
  quantity: Math.max(1, Number(line.quantity || 1)),
  description: line.description || "",
});

const normalizeTemplate = (payload, existing = null) => ({
  id: existing?.id || genId(),
  name: payload.name?.trim() || "",
  status: payload.status || existing?.status || "active",
  description: payload.description || existing?.description || "",
  validityDays: Math.max(1, Number(payload.validityDays || 1)),
  recurringPlanId: payload.recurringPlanId || "",
  recurringPlanLabel: payload.recurringPlanLabel || "",
  productLines: (payload.productLines || payload.orderLines || []).map(normalizeLine),
  createdAt: existing?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const quotationTemplatesDb = {
  list: () => quotationTemplates,
  getById: (id) => quotationTemplates.find((item) => item.id === id),
  create: (payload) => {
    const item = normalizeTemplate(payload);
    quotationTemplates = [item, ...quotationTemplates];
    return item;
  },
  update: (id, payload) => {
    const existing = quotationTemplates.find((item) => item.id === id);
    if (!existing) return null;
    const updated = normalizeTemplate(payload, existing);
    quotationTemplates = quotationTemplates.map((item) => (item.id === id ? updated : item));
    return updated;
  },
  remove: (id) => {
    const exists = quotationTemplates.some((item) => item.id === id);
    quotationTemplates = quotationTemplates.filter((item) => item.id !== id);
    return exists;
  },
};
