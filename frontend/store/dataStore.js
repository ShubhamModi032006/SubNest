import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

const getPayload = (response) => response?.data ?? response;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toUiSubscriptionStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  const map = {
    draft: 'Draft',
    quotation: 'Quotation',
    confirmed: 'Confirmed',
    active: 'Active',
    closed: 'Closed',
  };
  return map[normalized] || status || 'Draft';
};

const normalizeProduct = (product) => ({
  ...product,
  salesPrice: Number(product?.salesPrice ?? product?.sales_price ?? 0),
  costPrice: Number(product?.costPrice ?? product?.cost_price ?? 0),
  tax: product?.tax ?? product?.tax_id ?? '',
  status: product?.status || (product?.is_archived ? 'archived' : 'active'),
  recurringPrices: (product?.recurringPrices || product?.recurring_prices || []).map((row) => ({
    ...row,
    planId: row?.planId ?? row?.plan_id ?? '',
    minQuantity: row?.minQuantity ?? row?.min_quantity ?? 1,
    startDate: row?.startDate ?? row?.start_date ?? '',
    endDate: row?.endDate ?? row?.end_date ?? '',
  })),
  variants: (product?.variants || []).map((variant) => ({
    ...variant,
    extraPrice: Number(variant?.extraPrice ?? variant?.extra_price ?? 0),
  })),
});

const toProductPayload = (productData) => ({
  name: productData?.name,
  type: String(productData?.type || '').toLowerCase(),
  sales_price: Number(productData?.salesPrice ?? 0),
  cost_price: Number(productData?.costPrice ?? 0),
  tax_id: productData?.tax || null,
  variants: (productData?.variants || []).map((variant) => ({
    attribute: variant?.attribute,
    value: variant?.value,
    extra_price: Number(variant?.extraPrice ?? 0),
  })),
  recurring_prices: (productData?.recurringPrices || []).map((row) => ({
    plan_id: row?.planId || null,
    price: Number(row?.price ?? 0),
    min_quantity: Number(row?.minQuantity ?? 1),
    start_date: row?.startDate || new Date().toISOString().slice(0, 10),
    end_date: row?.endDate || null,
  })),
});

const normalizeSubscription = (subscription) => ({
  ...subscription,
  subscriptionNumber: subscription?.subscriptionNumber ?? subscription?.subscription_number,
  customerId: subscription?.customerId ?? subscription?.customer_id ?? subscription?.customer?.id ?? '',
  customerType: subscription?.customerType ?? subscription?.customer_type ?? subscription?.customer?.type ?? 'user',
  customerLabel: subscription?.customerLabel ?? subscription?.customer?.name ?? '-',
  recurringPlanId: subscription?.recurringPlanId ?? subscription?.plan?.id ?? '',
  recurringPlanLabel: subscription?.recurringPlanLabel ?? subscription?.plan?.name ?? '',
  startDate: subscription?.startDate ?? subscription?.start_date ?? '',
  expirationDate: subscription?.expirationDate ?? subscription?.expiration_date ?? '',
  paymentTerms: subscription?.paymentTerms ?? subscription?.payment_terms ?? '',
  status: toUiSubscriptionStatus(subscription?.status),
  orderLines: (subscription?.orderLines || subscription?.items || []).map((item) => ({
    id: item?.id,
    productId: item?.productId ?? item?.product_id,
    productName: item?.productName ?? item?.product_name,
    variantId: item?.variantId ?? item?.variant_id ?? '',
    quantity: Number(item?.quantity ?? 1),
    unitPrice: Number(item?.unitPrice ?? item?.unit_price ?? 0),
    discountValue: Number(item?.discountValue ?? item?.discount ?? 0),
    taxValue: Number(item?.taxValue ?? item?.tax ?? 0),
    lineTotal: Number(item?.lineTotal ?? item?.amount ?? 0),
  })),
});

const toSubscriptionPayload = (payload) => ({
  customer_id: payload?.customerId,
  customer_type: payload?.customerType,
  plan_id: payload?.recurringPlanId,
  quotation_template_id: payload?.quotationTemplate || null,
  start_date: payload?.startDate,
  expiration_date: payload?.expirationDate || null,
  payment_terms: payload?.paymentTerms || null,
  items: (payload?.orderLines || []).map((line) => ({
    product_id: line?.productId,
    variant_id: line?.variantId || null,
    quantity: Number(line?.quantity ?? 1),
  })),
});

const normalizeInvoice = (invoice) => ({
  ...invoice,
  invoiceNumber: invoice?.invoiceNumber ?? invoice?.invoice_number,
  customerLabel: invoice?.customerLabel ?? invoice?.customer?.name ?? invoice?.customer ?? '-',
  invoiceDate: invoice?.invoiceDate ?? invoice?.invoice_date ?? invoice?.date ?? '',
  dueDate: invoice?.dueDate ?? invoice?.due_date ?? '',
  grandTotal: Number(invoice?.grandTotal ?? invoice?.grand_total ?? invoice?.total_amount ?? 0),
  discountTotal: Number(invoice?.discountTotal ?? invoice?.discount_total ?? 0),
  taxTotal: Number(invoice?.taxTotal ?? invoice?.tax_total ?? 0),
  subtotal: Number(invoice?.subtotal ?? 0),
  linkedSubscriptionId: invoice?.linkedSubscriptionId ?? invoice?.subscription_id ?? '-',
  lines: (invoice?.lines || invoice?.items || []).map((line) => ({
    id: line?.id,
    productName: line?.productName ?? line?.product_name ?? line?.description ?? '-',
    quantity: Number(line?.quantity ?? 0),
    unitPrice: Number(line?.unitPrice ?? line?.unit_price ?? 0),
    discountAmount: Number(line?.discountAmount ?? line?.discount ?? 0),
    taxAmount: Number(line?.taxAmount ?? line?.tax ?? 0),
    total: Number(line?.total ?? 0),
  })),
});

export const useDataStore = create((set, get) => ({
  users: [],
  contacts: [],
  products: [],
  subscriptions: [],
  plans: [],
  taxes: [],
  discounts: [],
  quotationTemplates: [],
  invoices: [],
  loadingUsers: false,
  loadingContacts: false,
  loadingProducts: false,
  loadingSubscriptions: false,
  loadingPlans: false,
  loadingTaxes: false,
  loadingDiscounts: false,
  loadingQuotationTemplates: false,
  loadingInvoices: false,
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
    const cachedProducts = get().products;
    const hasOnlyUuidIds = cachedProducts.every((product) => UUID_REGEX.test(String(product?.id || "")));
    if (cachedProducts.length > 0 && !force && hasOnlyUuidIds) return;
    set({ loadingProducts: true, error: null });
    try {
      const response = await fetchApi('/products', { method: 'GET' });
      const data = getPayload(response);
      set({ products: (data.products || []).map(normalizeProduct), loadingProducts: false });
    } catch (err) {
      set({ error: err.message, loadingProducts: false });
    }
  },

  fetchSubscriptions: async (force = false) => {
    const cachedSubscriptions = get().subscriptions;
    const hasOnlyUuidIds = cachedSubscriptions.every((item) => UUID_REGEX.test(String(item?.id || '')));
    if (cachedSubscriptions.length > 0 && !force && hasOnlyUuidIds) return;
    set({ loadingSubscriptions: true, error: null });
    try {
      const response = await fetchApi('/subscriptions', { method: 'GET' });
      const data = getPayload(response);
      set({ subscriptions: (data.subscriptions || []).map(normalizeSubscription), loadingSubscriptions: false });
    } catch (err) {
      set({ error: err.message, loadingSubscriptions: false });
    }
  },

  createSubscription: async (payload) => {
    const response = await fetchApi('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(toSubscriptionPayload(payload)),
    });
    const data = getPayload(response);
    const normalized = normalizeSubscription(data.subscription);
    set((state) => ({ subscriptions: [normalized, ...state.subscriptions] }));
    return normalized;
  },

  updateSubscription: async (id, payload) => {
    const response = await fetchApi(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toSubscriptionPayload(payload)),
    });
    const data = getPayload(response);
    const normalized = normalizeSubscription(data.subscription);
    set((state) => ({
      subscriptions: state.subscriptions.map((item) =>
        item.id === id ? normalized : item
      ),
    }));
    return normalized;
  },

  fetchSubscriptionById: async (id) => {
    const response = await fetchApi(`/subscriptions/${id}`, { method: 'GET' });
    const data = getPayload(response);
    const normalized = normalizeSubscription(data.subscription);
    set((state) => ({
      subscriptions: state.subscriptions.some((item) => item.id === id)
        ? state.subscriptions.map((item) => (item.id === id ? normalized : item))
        : [normalized, ...state.subscriptions],
    }));
    return normalized;
  },

  runSubscriptionAction: async (id, action) => {
    await fetchApi(`/subscriptions/${id}/${action}`, { method: 'POST' });
    const refreshed = await get().fetchSubscriptionById(id);
    set((state) => ({
      subscriptions: state.subscriptions.map((item) =>
        item.id === id ? refreshed : item
      ),
    }));
    return refreshed;
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
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      set(state => ({ products: state.products.filter(p => p.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  archiveProduct: async (id) => {
    try {
      const response = await fetchApi(`/products/${id}/archive`, { method: 'PATCH' });
      const data = getPayload(response);
      const normalized = normalizeProduct(data.product);
      set(state => ({ products: state.products.map(p => p.id === id ? normalized : p) }));
      return normalized;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createProduct: async (productData) => {
    try {
      const response = await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify(toProductPayload(productData))
      });
      const data = getPayload(response);
      const normalized = normalizeProduct(data.product);
      set(state => ({ products: [...state.products, normalized] }));
      return normalized;
    } catch(err) {
      throw err;
    }
  },
  
  updateProduct: async (id, productData) => {
    try {
      const response = await fetchApi(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(toProductPayload(productData))
      });
      const data = getPayload(response);
      const normalized = normalizeProduct(data.product);
      set(state => ({ products: state.products.map(p => p.id === id ? normalized : p) }));
      return normalized;
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

  fetchQuotationTemplates: async (force = false) => {
    if (get().quotationTemplates.length > 0 && !force) return;
    set({ loadingQuotationTemplates: true, error: null });
    try {
      const res = await fetch('/api/quotation-templates');
      if (!res.ok) throw new Error('Failed to fetch quotation templates');
      const data = await res.json();
      set({ quotationTemplates: data.templates || [], loadingQuotationTemplates: false });
    } catch (err) {
      set({ error: err.message, loadingQuotationTemplates: false });
    }
  },

  createQuotationTemplate: async (payload) => {
    const res = await fetch('/api/quotation-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create quotation template');
    set((state) => ({ quotationTemplates: [data.template, ...state.quotationTemplates] }));
    return data.template;
  },

  updateQuotationTemplate: async (id, payload) => {
    const res = await fetch(`/api/quotation-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update quotation template');
    set((state) => ({
      quotationTemplates: state.quotationTemplates.map((item) =>
        item.id === id ? data.template : item
      ),
    }));
    return data.template;
  },

  deleteQuotationTemplate: async (id) => {
    const res = await fetch(`/api/quotation-templates/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to delete quotation template');
    }
    set((state) => ({
      quotationTemplates: state.quotationTemplates.filter((item) => item.id !== id),
    }));
    return true;
  },

  fetchInvoices: async (force = false) => {
    const cachedInvoices = get().invoices;
    const hasOnlyUuidIds = cachedInvoices.every((item) => UUID_REGEX.test(String(item?.id || '')));
    if (cachedInvoices.length > 0 && !force && hasOnlyUuidIds) return;
    set({ loadingInvoices: true, error: null });
    try {
      const response = await fetchApi('/invoices', { method: 'GET' });
      const data = getPayload(response);
      set({ invoices: (data.invoices || []).map(normalizeInvoice), loadingInvoices: false });
    } catch (err) {
      set({ error: err.message, loadingInvoices: false });
    }
  },

  fetchInvoiceById: async (id) => {
    const response = await fetchApi(`/invoices/${id}`, { method: 'GET' });
    const data = getPayload(response);
    const normalized = normalizeInvoice(data.invoice);
    set((state) => {
      const exists = state.invoices.some((inv) => inv.id === id);
      return {
        invoices: exists
          ? state.invoices.map((inv) => (inv.id === id ? normalized : inv))
          : [normalized, ...state.invoices],
      };
    });
    return normalized;
  },

  runInvoiceAction: async (id, action) => {
    await fetchApi(`/invoices/${id}/${action}`, { method: 'POST' });
    const refreshed = await get().fetchInvoiceById(id);
    set((state) => ({
      invoices: state.invoices.map((item) => (item.id === id ? refreshed : item)),
    }));
    return refreshed;
  },

  createInvoiceFromSubscription: async (subscriptionId) => {
    const response = await fetchApi(`/subscriptions/${subscriptionId}/create-invoice`, {
      method: 'POST',
    });
    const data = getPayload(response);
    const invoiceId = data.invoice_id || data.invoice?.id;
    if (!invoiceId) throw new Error('Failed to create invoice from subscription');
    const invoice = await get().fetchInvoiceById(invoiceId);
    set((state) => ({
      invoices: state.invoices.some((item) => item.id === invoice.id)
        ? state.invoices.map((item) => (item.id === invoice.id ? invoice : item))
        : [invoice, ...state.invoices],
    }));
    return invoice;
  },
}));
