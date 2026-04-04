import { create } from "zustand";
import { discountsDb, taxesDb } from "@/lib/configurationData";

const cartItemKey = (item) => [item.productId, item.variantId || "none", item.planId || "none"].join("::");

const computeProductPricing = (product, { variantId, planId, quantity = 1 } = {}) => {
  const variant = product?.variants?.find((entry) => entry.id === variantId) || product?.variants?.[0] || null;
  const plan = product?.plans?.find((entry) => entry.id === planId) || product?.plans?.[0] || null;
  const unitPrice = Number(product?.basePrice || 0) + Number(variant?.extraPrice || 0) + Number(plan?.recurringPrice || 0);
  const qty = Math.max(1, Number(quantity || 1));
  const subtotal = unitPrice * qty;
  const tax = taxesDb.list()[0];
  const taxRate = tax?.type === "Percentage" ? Number(tax.value || 0) : 0;
  const taxAmount = (subtotal * taxRate) / 100;

  return {
    variant,
    plan,
    quantity: qty,
    unitPrice,
    subtotal,
    taxRate,
    tax: taxAmount,
    total: subtotal + taxAmount,
  };
};

const buildDiscount = (code, subtotal, quantity) => {
  const normalized = String(code || "").trim().toLowerCase();
  const discount = discountsDb.list().find((item) => item.name.toLowerCase().includes("welcome"));
  if (!normalized || (normalized !== "welcome10" && normalized !== discount?.name.toLowerCase().replace(/\s+/g, ""))) {
    return null;
  }
  if (discount && subtotal < Number(discount.minimumPurchase || 0)) return null;
  if (discount && quantity < Number(discount.minimumQuantity || 0)) return null;
  const amount = discount?.type === "Fixed" ? Number(discount.value || 0) : (subtotal * Number(discount?.value || 0)) / 100;
  return {
    code: normalized,
    name: discount?.name || "Welcome Offer",
    amount,
  };
};

export const useCartStore = create((set, get) => ({
  items: [],
  discountCode: "",
  customer: {
    name: "",
    email: "",
    address: "",
  },
  addItem: (product, selection = {}) => {
    const pricing = computeProductPricing(product, selection);
    const item = {
      id: cartItemKey({ productId: product.id, ...selection }),
      productId: product.id,
      productName: product.name,
      category: product.category,
      variantId: pricing.variant?.id || "",
      variantLabel: pricing.variant?.label || "Standard",
      planId: pricing.plan?.id || "",
      planLabel: pricing.plan?.label || "One-time",
      quantity: Number(selection.quantity || 1),
      basePrice: Number(product.basePrice || 0),
      variantExtraPrice: Number(pricing.variant?.extraPrice || 0),
      planPrice: Number(pricing.plan?.recurringPrice || 0),
      unitPrice: pricing.unitPrice,
      subtotal: pricing.subtotal,
      taxRate: pricing.taxRate,
      tax: pricing.tax,
      total: pricing.total,
    };

    set((state) => {
      const existing = state.items.find((entry) => entry.id === item.id);
      if (existing) {
        return {
          items: state.items.map((entry) =>
            entry.id === item.id
              ? { ...entry, quantity: entry.quantity + item.quantity, subtotal: entry.unitPrice * (entry.quantity + item.quantity), total: (entry.unitPrice * (entry.quantity + item.quantity)) * (1 + entry.taxRate / 100) }
              : entry
          ),
        };
      }

      return { items: [item, ...state.items] };
    });
  },
  updateQuantity: (id, quantity) => {
    set((state) => ({
      items: state.items
        .map((item) => {
          if (item.id !== id) return item;
          const nextQuantity = Math.max(1, Number(quantity || 1));
          const subtotal = item.unitPrice * nextQuantity;
          return { ...item, quantity: nextQuantity, subtotal, tax: (subtotal * item.taxRate) / 100, total: subtotal + (subtotal * item.taxRate) / 100 };
        })
        .filter(Boolean),
    }));
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearCart: () => set({ items: [], discountCode: "" }),
  setCustomer: (patch) => set((state) => ({ customer: { ...state.customer, ...patch } })),
  setDiscountCode: (discountCode) => set({ discountCode }),
  totals: () => {
    const state = get();
    const subtotal = state.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = state.items.reduce((sum, item) => sum + item.tax, 0);
    const quantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const discount = buildDiscount(state.discountCode, subtotal, quantity);
    const discountTotal = discount?.amount || 0;
    const total = Math.max(0, subtotal + tax - discountTotal);
    return { subtotal, tax, quantity, discountTotal, total, discount };
  },
}));
