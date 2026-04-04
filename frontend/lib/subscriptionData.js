const lifecycleStages = [
  "Draft",
  "Quotation",
  "Quotation Sent",
  "Confirmed",
  "Active",
  "Closed",
];

let subscriptions = [];

const generateId = () => `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const generateNumber = () => `SUB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

const toNumber = (value) => Number(value || 0);

const computeLine = (line) => {
  const quantity = Math.max(1, Number(line.quantity || 1));
  const basePrice = toNumber(line.basePrice);
  const variantExtraPrice = toNumber(line.variantExtraPrice);
  const planPrice = toNumber(line.planPrice);
  const unitPrice = basePrice + variantExtraPrice + planPrice;
  const gross = unitPrice * quantity;

  const discountType = line.discountType || "Fixed";
  const discountValue = toNumber(line.discountValue);
  const discountAmount = discountType === "Percentage"
    ? (gross * discountValue) / 100
    : discountValue;

  const taxableBase = Math.max(0, gross - discountAmount);
  const taxType = line.taxType || "Percentage";
  const taxValue = toNumber(line.taxValue);
  const taxAmount = taxType === "Percentage"
    ? (taxableBase * taxValue) / 100
    : taxValue;

  const amount = Math.max(0, taxableBase + taxAmount);

  return {
    ...line,
    quantity,
    basePrice,
    variantExtraPrice,
    planPrice,
    unitPrice,
    gross,
    discountType,
    discountValue,
    discountAmount,
    taxType,
    taxValue,
    taxAmount,
    amount,
  };
};

const computeTotals = (orderLines) => {
  const totals = orderLines.reduce(
    (acc, line) => {
      acc.subtotal += toNumber(line.gross);
      acc.discountTotal += toNumber(line.discountAmount);
      acc.taxTotal += toNumber(line.taxAmount);
      acc.total += toNumber(line.amount);
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 }
  );

  return totals;
};

const normalizePayload = (payload, existing = null) => {
  const orderLines = (payload.orderLines || []).map(computeLine);
  const totals = computeTotals(orderLines);
  const status = payload.status || existing?.status || "Draft";

  return {
    id: existing?.id || generateId(),
    subscriptionNumber: existing?.subscriptionNumber || generateNumber(),
    status,
    customerId: payload.customerId || "",
    customerType: payload.customerType || "user",
    customerLabel: payload.customerLabel || "",
    quotationTemplate: payload.quotationTemplate || "",
    recurringPlanId: payload.recurringPlanId || "",
    recurringPlanLabel: payload.recurringPlanLabel || "",
    startDate: payload.startDate || "",
    expirationDate: payload.expirationDate || "",
    paymentTerms: payload.paymentTerms || "",
    nextInvoiceDate: payload.nextInvoiceDate || payload.startDate || "",
    salesperson: payload.salesperson || "",
    paymentMethod: payload.paymentMethod || "",
    notes: payload.notes || "",
    orderLines,
    pricing: totals,
    timeline: existing?.timeline || [
      { status: "Draft", at: new Date().toISOString(), note: "Subscription created" },
    ],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const appendTimeline = (subscription, status, note) => {
  return {
    ...subscription,
    status,
    updatedAt: new Date().toISOString(),
    timeline: [
      ...(subscription.timeline || []),
      { status, at: new Date().toISOString(), note },
    ],
  };
};

const findById = (id) => subscriptions.find((item) => item.id === id);

const setById = (id, nextValue) => {
  subscriptions = subscriptions.map((item) => (item.id === id ? nextValue : item));
  return nextValue;
};

const updateStatus = (id, status, note) => {
  const current = findById(id);
  if (!current) return null;
  return setById(id, appendTimeline(current, status, note));
};

export const subscriptionsDb = {
  list: () => subscriptions,
  getById: (id) => findById(id),
  create: (payload) => {
    const item = normalizePayload(payload);
    subscriptions = [item, ...subscriptions];
    return item;
  },
  update: (id, payload) => {
    const existing = findById(id);
    if (!existing) return null;
    const item = normalizePayload(payload, existing);
    return setById(id, item);
  },
  send: (id) => updateStatus(id, "Quotation Sent", "Quotation sent to customer"),
  confirm: (id) => updateStatus(id, "Confirmed", "Subscription confirmed"),
  close: (id) => updateStatus(id, "Closed", "Subscription closed"),
  renew: (id) => updateStatus(id, "Active", "Subscription renewed"),
  upsell: (id) => updateStatus(id, "Active", "Upsell process triggered"),
};

export { lifecycleStages, computeLine, computeTotals };
