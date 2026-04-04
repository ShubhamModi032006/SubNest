import { create } from "zustand";
import { fetchApi } from "@/lib/api";

const cartItemKey = (item) => [item.productId, item.variantId || "none", item.planId || "none"].join("::");

const computeProductPricing = (product, { variantId, planId, quantity = 1 } = {}) => {
  const variant = product?.variants?.find((entry) => entry.id === variantId) || product?.variants?.[0] || null;
  const plan = product?.plans?.find((entry) => entry.id === planId) || product?.plans?.[0] || null;
  const unitPrice = Number(product?.basePrice || 0) + Number(variant?.extraPrice || 0) + Number(plan?.recurringPrice || 0);
  const qty = Math.max(1, Number(quantity || 1));
  const subtotal = unitPrice * qty;

  return {
    variant,
    plan,
    quantity: qty,
    unitPrice,
    subtotal,
    total: subtotal,
  };
};

export const useCartStore = create((set, get) => ({
  items: [],
  discountCode: "",
  pricing: {
    subtotal: 0,
    tax: 0,
    discountTotal: 0,
    total: 0,
    quantity: 0,
    discount: null,
  },
  pricingLoading: false,
  pricingError: null,
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
      total: pricing.total,
    };

    set((state) => {
      const existing = state.items.find((entry) => entry.id === item.id);
      if (existing) {
        return {
          items: state.items.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  quantity: entry.quantity + item.quantity,
                  subtotal: entry.unitPrice * (entry.quantity + item.quantity),
                  total: entry.unitPrice * (entry.quantity + item.quantity),
                }
              : entry
          ),
        };
      }

      return { items: [item, ...state.items] };
    });
  },
  addSubscription: (subscription, selection = {}) => {
    const unitPrice = Number(subscription.amountTotal || subscription.amount || 0);
    const qty = Math.max(1, Number(selection.quantity || 1));
    const subtotal = unitPrice * qty;
    
    const item = {
      id: `sub::${subscription.id}::${qty}`,
      subscriptionId: subscription.id,
      itemType: "subscription",
      subscriptionNumber: subscription.subscriptionNumber || subscription.id,
      planName: subscription.planName || "Subscription",
      description: subscription.description || "",
      quantity: qty,
      unitPrice,
      subtotal,
      total: subtotal,
      status: subscription.status || "draft",
      isPublic: subscription.isPublic || subscription.is_public || false,
    };

    set((state) => {
      const existing = state.items.find((entry) => entry.subscriptionId === subscription.id);
      if (existing) {
        return {
          items: state.items.map((entry) =>
            entry.subscriptionId === subscription.id
              ? {
                  ...entry,
                  quantity: entry.quantity + item.quantity,
                  subtotal: entry.unitPrice * (entry.quantity + item.quantity),
                  total: entry.unitPrice * (entry.quantity + item.quantity),
                }
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
          return { ...item, quantity: nextQuantity, subtotal, total: subtotal };
        })
        .filter(Boolean),
    }));
  },
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearCart: () =>
    set({
      items: [],
      discountCode: "",
      pricing: {
        subtotal: 0,
        tax: 0,
        discountTotal: 0,
        total: 0,
        quantity: 0,
        discount: null,
      },
      pricingError: null,
    }),
  setCustomer: (patch) => set((state) => ({ customer: { ...state.customer, ...patch } })),
  setDiscountCode: (discountCode) => set({ discountCode }),
  refreshPricing: async () => {
    const state = get();
    if (!Array.isArray(state.items) || state.items.length === 0) {
      const emptyPricing = {
        subtotal: 0,
        tax: 0,
        discountTotal: 0,
        total: 0,
        quantity: 0,
        discount: null,
      };
      set({ pricing: emptyPricing, pricingError: null, pricingLoading: false });
      return emptyPricing;
    }

    set({ pricingLoading: true, pricingError: null });
    try {
      const response = await fetchApi("/orders/preview", {
        method: "POST",
        body: JSON.stringify({
          items: state.items,
          discountCode: state.discountCode,
        }),
      });
      const pricing = response?.pricing || {
        subtotal: 0,
        tax: 0,
        discountTotal: 0,
        total: 0,
        quantity: 0,
        discount: null,
      };
      set({ pricing, pricingLoading: false, pricingError: null });
      return pricing;
    } catch (error) {
      set({ pricingLoading: false, pricingError: error.message || "Failed to calculate pricing." });
      throw error;
    }
  },
  totals: () => {
    const state = get();
    if (state.items.length > 0 && state.pricing && Number(state.pricing.total || 0) > 0) {
      return state.pricing;
    }
    const subtotal = state.items.reduce((sum, item) => sum + item.subtotal, 0);
    const quantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
    const tax = 0;
    const discountTotal = 0;
    const total = Math.max(0, subtotal);
    return { subtotal, tax, quantity, discountTotal, total, discount: null };
  },
}));
