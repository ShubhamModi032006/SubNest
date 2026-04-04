let invoices = [];

const genId = () => `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const genNumber = () => `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

const toNum = (v) => Number(v || 0);

const normalizeLine = (line) => {
  const quantity = Math.max(1, Number(line.quantity || 1));
  const unitPrice = toNum(line.unitPrice ?? line.basePrice);
  const discountAmount = toNum(line.discountAmount);
  const taxAmount = toNum(line.taxAmount);
  const total = toNum(line.amount ?? line.total ?? unitPrice * quantity - discountAmount + taxAmount);

  return {
    id: line.id || `il_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    productId: line.productId || "",
    productName: line.productName || "",
    quantity,
    unitPrice,
    discountAmount,
    taxAmount,
    total,
  };
};

const totalsFromLines = (lines) => {
  return lines.reduce(
    (acc, line) => {
      acc.subtotal += line.unitPrice * line.quantity;
      acc.discountTotal += line.discountAmount;
      acc.taxTotal += line.taxAmount;
      acc.grandTotal += line.total;
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 }
  );
};

const normalizeInvoice = (payload, existing = null) => {
  const lines = (payload.lines || []).map(normalizeLine);
  const totals = totalsFromLines(lines);

  return {
    id: existing?.id || genId(),
    invoiceNumber: existing?.invoiceNumber || genNumber(),
    status: payload.status || existing?.status || "draft",
    customerLabel: payload.customerLabel || "",
    customerId: payload.customerId || "",
    invoiceDate: payload.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate || payload.invoiceDate || new Date().toISOString().slice(0, 10),
    linkedSubscriptionId: payload.linkedSubscriptionId || "",
    paymentStatus: payload.paymentStatus || existing?.paymentStatus || "Unpaid",
    paymentDate: payload.paymentDate || existing?.paymentDate || null,
    lines,
    ...totals,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const setById = (id, value) => {
  invoices = invoices.map((item) => (item.id === id ? value : item));
  return value;
};

export const invoicesDb = {
  list: () => invoices,
  getById: (id) => invoices.find((item) => item.id === id),
  create: (payload) => {
    const item = normalizeInvoice(payload);
    invoices = [item, ...invoices];
    return item;
  },
  update: (id, payload) => {
    const existing = invoices.find((item) => item.id === id);
    if (!existing) return null;
    const updated = normalizeInvoice({ ...existing, ...payload }, existing);
    return setById(id, updated);
  },
  confirm: (id) => {
    const item = invoices.find((x) => x.id === id);
    if (!item) return null;
    return setById(id, { ...item, status: "confirmed", updatedAt: new Date().toISOString() });
  },
  send: (id) => {
    const item = invoices.find((x) => x.id === id);
    if (!item) return null;
    return setById(id, { ...item, status: "sent", updatedAt: new Date().toISOString() });
  },
  cancel: (id) => {
    const item = invoices.find((x) => x.id === id);
    if (!item) return null;
    return setById(id, { ...item, status: "cancelled", updatedAt: new Date().toISOString() });
  },
};
