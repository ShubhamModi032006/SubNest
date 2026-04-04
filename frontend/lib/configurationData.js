const billingPeriods = ["Daily", "Weekly", "Monthly", "Yearly"];

let plans = [
  {
    id: "plan_1",
    name: "Starter Monthly",
    billingPeriod: "Monthly",
    price: 29,
    minimumQuantity: 1,
    startDate: "",
    endDate: "",
    autoClose: false,
    closable: true,
    renewable: true,
    pausable: true,
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

let taxes = [
  {
    id: "tax_1",
    name: "Standard VAT",
    type: "Percentage",
    value: 20,
    createdAt: new Date().toISOString(),
  },
];

let discounts = [
  {
    id: "discount_1",
    name: "Welcome Offer",
    type: "Percentage",
    value: 10,
    minimumPurchase: 100,
    minimumQuantity: 1,
    startDate: "",
    endDate: "",
    usageLimit: 100,
    productIds: [],
    applyToSubscriptions: true,
    createdAt: new Date().toISOString(),
  },
];

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const hasInvalidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) > new Date(endDate);
};

const parsePositiveNumber = (value) => Number(value ?? 0);

const validatePlanInput = (payload) => {
  if (!payload.name?.trim()) return "Plan name is required.";
  if (!billingPeriods.includes(payload.billingPeriod)) return "Billing period is invalid.";
  if (parsePositiveNumber(payload.price) <= 0) return "Price must be greater than 0.";
  if (Number(payload.minimumQuantity ?? 0) <= 0) return "Minimum quantity must be greater than 0.";
  if (hasInvalidDateRange(payload.startDate, payload.endDate)) return "End date must be after start date.";
  return null;
};

const validateTaxInput = (payload) => {
  if (!payload.name?.trim()) return "Tax name is required.";
  if (!["Percentage", "Fixed"].includes(payload.type)) return "Tax type is invalid.";
  if (parsePositiveNumber(payload.value) <= 0) return "Tax value must be greater than 0.";
  return null;
};

const validateDiscountInput = (payload) => {
  if (!payload.name?.trim()) return "Discount name is required.";
  if (!["Percentage", "Fixed"].includes(payload.type)) return "Discount type is invalid.";
  if (parsePositiveNumber(payload.value) <= 0) return "Discount value must be greater than 0.";
  if (parsePositiveNumber(payload.minimumPurchase) < 0) return "Minimum purchase cannot be negative.";
  if (Number(payload.minimumQuantity ?? 0) < 0) return "Minimum quantity cannot be negative.";
  if (parsePositiveNumber(payload.usageLimit) < 0) return "Usage limit cannot be negative.";
  if (hasInvalidDateRange(payload.startDate, payload.endDate)) return "End date must be after start date.";
  return null;
};

const normalizePlan = (payload) => ({
  id: payload.id || generateId("plan"),
  name: payload.name.trim(),
  billingPeriod: payload.billingPeriod,
  price: parsePositiveNumber(payload.price),
  minimumQuantity: Number(payload.minimumQuantity || 1),
  startDate: payload.startDate || "",
  endDate: payload.endDate || "",
  autoClose: Boolean(payload.autoClose),
  closable: Boolean(payload.closable),
  renewable: Boolean(payload.renewable),
  pausable: Boolean(payload.pausable),
  status: payload.status || "active",
  createdAt: payload.createdAt || new Date().toISOString(),
});

const normalizeTax = (payload) => ({
  id: payload.id || generateId("tax"),
  name: payload.name.trim(),
  type: payload.type,
  value: parsePositiveNumber(payload.value),
  createdAt: payload.createdAt || new Date().toISOString(),
});

const normalizeDiscount = (payload) => ({
  id: payload.id || generateId("discount"),
  name: payload.name.trim(),
  type: payload.type,
  value: parsePositiveNumber(payload.value),
  minimumPurchase: parsePositiveNumber(payload.minimumPurchase),
  minimumQuantity: Number(payload.minimumQuantity || 0),
  startDate: payload.startDate || "",
  endDate: payload.endDate || "",
  usageLimit: Number(payload.usageLimit || 0),
  productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
  applyToSubscriptions: Boolean(payload.applyToSubscriptions),
  createdAt: payload.createdAt || new Date().toISOString(),
});

export const plansDb = {
  list: () => plans,
  getById: (id) => plans.find((plan) => plan.id === id),
  create: (payload) => {
    const item = normalizePlan(payload);
    plans = [...plans, item];
    return item;
  },
  update: (id, payload) => {
    const existing = plans.find((plan) => plan.id === id);
    if (!existing) return null;
    const updated = normalizePlan({ ...existing, ...payload, id });
    plans = plans.map((plan) => (plan.id === id ? updated : plan));
    return updated;
  },
  remove: (id) => {
    const exists = plans.some((plan) => plan.id === id);
    plans = plans.filter((plan) => plan.id !== id);
    return exists;
  },
};

export const taxesDb = {
  list: () => taxes,
  getById: (id) => taxes.find((tax) => tax.id === id),
  create: (payload) => {
    const item = normalizeTax(payload);
    taxes = [...taxes, item];
    return item;
  },
  update: (id, payload) => {
    const existing = taxes.find((tax) => tax.id === id);
    if (!existing) return null;
    const updated = normalizeTax({ ...existing, ...payload, id });
    taxes = taxes.map((tax) => (tax.id === id ? updated : tax));
    return updated;
  },
  remove: (id) => {
    const exists = taxes.some((tax) => tax.id === id);
    taxes = taxes.filter((tax) => tax.id !== id);
    return exists;
  },
};

export const discountsDb = {
  list: () => discounts,
  getById: (id) => discounts.find((discount) => discount.id === id),
  create: (payload) => {
    const item = normalizeDiscount(payload);
    discounts = [...discounts, item];
    return item;
  },
  update: (id, payload) => {
    const existing = discounts.find((discount) => discount.id === id);
    if (!existing) return null;
    const updated = normalizeDiscount({ ...existing, ...payload, id });
    discounts = discounts.map((discount) => (discount.id === id ? updated : discount));
    return updated;
  },
  remove: (id) => {
    const exists = discounts.some((discount) => discount.id === id);
    discounts = discounts.filter((discount) => discount.id !== id);
    return exists;
  },
};

export {
  billingPeriods,
  validatePlanInput,
  validateTaxInput,
  validateDiscountInput,
};
