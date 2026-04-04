import { create } from 'zustand';

export const useDataStore = create((set, get) => ({
  users: [],
  contacts: [],
  products: [],
  subscriptions: [],
  plans: [],
  taxes: [],
  discounts: [],
  loadingUsers: false,
  loadingContacts: false,
  loadingProducts: false,
  loadingSubscriptions: false,
  loadingPlans: false,
  loadingTaxes: false,
  loadingDiscounts: false,
  subscriptionDraft: {
    customerId: "",
    customerType: "user",
    customerLabel: "",
    quotationTemplate: "",
    recurringPlanId: "",
    recurringPlanLabel: "",
    startDate: "",
    expirationDate: "",
    paymentTerms: "Due on receipt",
    nextInvoiceDate: "",
    salesperson: "",
    paymentMethod: "",
    notes: "",
    status: "Draft",
    orderLines: [],
  },
  error: null,

  fetchUsers: async (force = false) => {
    if (get().users.length > 0 && !force) return;
    set({ loadingUsers: true, error: null });
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      set({ users: data.users || [], loadingUsers: false });
    } catch (err) {
      set({ error: err.message, loadingUsers: false });
    }
  },

  deleteUser: async (id) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      set(state => ({ users: state.users.filter(u => u.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createUser: async (userData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      set(state => ({ users: [...state.users, data.user] }));
      return data.user;
    } catch(err) {
      throw err;
    }
  },
  
  updateUser: async (id, userData) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      set(state => ({ users: state.users.map(u => u.id === id ? data.user : u) }));
      return data.user;
    } catch(err) {
      throw err;
    }
  },

  fetchContacts: async (force = false) => {
    if (get().contacts.length > 0 && !force) return;
    set({ loadingContacts: true, error: null });
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      set({ contacts: data.contacts || [], loadingContacts: false });
    } catch (err) {
      set({ error: err.message, loadingContacts: false });
    }
  },

  deleteContact: async (id) => {
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      set(state => ({ contacts: state.contacts.filter(c => c.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createContact: async (contactData) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      const data = await res.json();
      set(state => ({ contacts: [...state.contacts, data.contact] }));
      return data.contact;
    } catch(err) {
      throw err;
    }
  },
  
  updateContact: async (id, contactData) => {
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      const data = await res.json();
      set(state => ({ contacts: state.contacts.map(c => c.id === id ? data.contact : c) }));
      return data.contact;
    } catch(err) {
      throw err;
    }
  },

  fetchProducts: async (force = false) => {
    if (get().products.length > 0 && !force) return;
    set({ loadingProducts: true, error: null });
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      set({ products: data.products || [], loadingProducts: false });
    } catch (err) {
      set({ error: err.message, loadingProducts: false });
    }
  },

  fetchSubscriptions: async (force = false) => {
    if (get().subscriptions.length > 0 && !force) return;
    set({ loadingSubscriptions: true, error: null });
    try {
      const res = await fetch('/api/subscriptions');
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      const data = await res.json();
      set({ subscriptions: data.subscriptions || [], loadingSubscriptions: false });
    } catch (err) {
      set({ error: err.message, loadingSubscriptions: false });
    }
  },

  createSubscription: async (payload) => {
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create subscription');
    set((state) => ({ subscriptions: [data.subscription, ...state.subscriptions] }));
    return data.subscription;
  },

  updateSubscription: async (id, payload) => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update subscription');
    set((state) => ({
      subscriptions: state.subscriptions.map((item) =>
        item.id === id ? data.subscription : item
      ),
    }));
    return data.subscription;
  },

  runSubscriptionAction: async (id, action) => {
    const res = await fetch(`/api/subscriptions/${id}/${action}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Failed to ${action} subscription`);
    set((state) => ({
      subscriptions: state.subscriptions.map((item) =>
        item.id === id ? data.subscription : item
      ),
    }));
    return data.subscription;
  },

  setSubscriptionDraft: (patch) => {
    set((state) => ({
      subscriptionDraft: { ...state.subscriptionDraft, ...patch },
    }));
  },

  setSubscriptionOrderLines: (orderLines) => {
    set((state) => ({
      subscriptionDraft: { ...state.subscriptionDraft, orderLines },
    }));
  },

  resetSubscriptionDraft: () => {
    set({
      subscriptionDraft: {
        customerId: "",
        customerType: "user",
        customerLabel: "",
        quotationTemplate: "",
        recurringPlanId: "",
        recurringPlanLabel: "",
        startDate: "",
        expirationDate: "",
        paymentTerms: "Due on receipt",
        nextInvoiceDate: "",
        salesperson: "",
        paymentMethod: "",
        notes: "",
        status: "Draft",
        orderLines: [],
      },
    });
  },

  deleteProduct: async (id) => {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      set(state => ({ products: state.products.filter(p => p.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  archiveProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}/archive`, { method: 'PATCH' });
      const data = await res.json();
      set(state => ({ products: state.products.map(p => p.id === id ? data.product : p) }));
      return data.product;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createProduct: async (productData) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      set(state => ({ products: [...state.products, data.product] }));
      return data.product;
    } catch(err) {
      throw err;
    }
  },
  
  updateProduct: async (id, productData) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      set(state => ({ products: state.products.map(p => p.id === id ? data.product : p) }));
      return data.product;
    } catch(err) {
      throw err;
    }
  },

  fetchPlans: async (force = false) => {
    if (get().plans.length > 0 && !force) return;
    set({ loadingPlans: true, error: null });
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      set({ plans: data.plans || [], loadingPlans: false });
    } catch (err) {
      set({ error: err.message, loadingPlans: false });
    }
  },

  createPlan: async (payload) => {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create plan');
    set((state) => ({ plans: [...state.plans, data.plan] }));
    return data.plan;
  },

  updatePlan: async (id, payload) => {
    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update plan');
    set((state) => ({ plans: state.plans.map((plan) => (plan.id === id ? data.plan : plan)) }));
    return data.plan;
  },

  deletePlan: async (id) => {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to delete plan');
    }
    set((state) => ({ plans: state.plans.filter((plan) => plan.id !== id) }));
    return true;
  },

  fetchTaxes: async (force = false) => {
    if (get().taxes.length > 0 && !force) return;
    set({ loadingTaxes: true, error: null });
    try {
      const res = await fetch('/api/taxes');
      if (!res.ok) throw new Error('Failed to fetch taxes');
      const data = await res.json();
      set({ taxes: data.taxes || [], loadingTaxes: false });
    } catch (err) {
      set({ error: err.message, loadingTaxes: false });
    }
  },

  createTax: async (payload) => {
    const res = await fetch('/api/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create tax');
    set((state) => ({ taxes: [...state.taxes, data.tax] }));
    return data.tax;
  },

  updateTax: async (id, payload) => {
    const res = await fetch(`/api/taxes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update tax');
    set((state) => ({ taxes: state.taxes.map((tax) => (tax.id === id ? data.tax : tax)) }));
    return data.tax;
  },

  deleteTax: async (id) => {
    const res = await fetch(`/api/taxes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to delete tax');
    }
    set((state) => ({ taxes: state.taxes.filter((tax) => tax.id !== id) }));
    return true;
  },

  fetchDiscounts: async (force = false) => {
    if (get().discounts.length > 0 && !force) return;
    set({ loadingDiscounts: true, error: null });
    try {
      const res = await fetch('/api/discounts');
      if (!res.ok) throw new Error('Failed to fetch discounts');
      const data = await res.json();
      set({ discounts: data.discounts || [], loadingDiscounts: false });
    } catch (err) {
      set({ error: err.message, loadingDiscounts: false });
    }
  },

  createDiscount: async (payload) => {
    const res = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create discount');
    set((state) => ({ discounts: [...state.discounts, data.discount] }));
    return data.discount;
  },

  updateDiscount: async (id, payload) => {
    const res = await fetch(`/api/discounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update discount');
    set((state) => ({ discounts: state.discounts.map((discount) => (discount.id === id ? data.discount : discount)) }));
    return data.discount;
  },

  deleteDiscount: async (id) => {
    const res = await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to delete discount');
    }
    set((state) => ({ discounts: state.discounts.filter((discount) => discount.id !== id) }));
    return true;
  },
}));
