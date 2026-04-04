import { create } from 'zustand';
import { fetchApi } from '@/lib/api';
import { showError, showInfo, showSuccess, showWarning } from '@/lib/toast';

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

const normalizeUser = (user) => ({
  ...user,
  createdAt: user?.createdAt ?? user?.created_at ?? '',
});

const normalizeContact = (contact) => ({
  ...contact,
  userId: contact?.userId ?? contact?.user_id ?? '',
  createdAt: contact?.createdAt ?? contact?.created_at ?? '',
});

const normalizePlan = (plan) => ({
  ...plan,
  billingPeriod: plan?.billingPeriod ?? plan?.billing_period ?? '',
  price: Number(plan?.price ?? 0),
  minQuantity: Number(plan?.minQuantity ?? plan?.min_quantity ?? 1),
  startDate: plan?.startDate ?? plan?.start_date ?? '',
  endDate: plan?.endDate ?? plan?.end_date ?? '',
  createdAt: plan?.createdAt ?? plan?.created_at ?? '',
});

const normalizeTax = (tax) => {
  const rawType = String(tax?.type || '').toLowerCase();
  const uiType = rawType === 'percentage' ? 'Percentage' : rawType === 'fixed' ? 'Fixed' : (tax?.type || 'Percentage');
  return {
    ...tax,
    type: uiType,
    createdAt: tax?.createdAt ?? tax?.created_at ?? '',
  };
};

const normalizeDiscount = (discount) => ({
  ...discount,
  type: String(discount?.type || '').toLowerCase(),
  minPurchase: Number(discount?.minPurchase ?? discount?.min_purchase ?? 0),
  minQuantity: Number(discount?.minQuantity ?? discount?.min_quantity ?? 0),
  startDate: discount?.startDate ?? discount?.start_date ?? '',
  endDate: discount?.endDate ?? discount?.end_date ?? '',
  usageLimit: Number(discount?.usageLimit ?? discount?.usage_limit ?? 0),
  applyToSubscription: Boolean(discount?.applyToSubscription ?? discount?.apply_to_subscription),
  applyToSubscriptions: Boolean(discount?.applyToSubscriptions ?? discount?.applyToSubscription ?? discount?.apply_to_subscription),
  productIds: Array.isArray(discount?.productIds)
    ? discount.productIds
    : Array.isArray(discount?.products)
      ? discount.products.map((product) => product?.id).filter(Boolean)
      : Array.isArray(discount?.product_ids)
        ? discount.product_ids
        : [],
  createdAt: discount?.createdAt ?? discount?.created_at ?? '',
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
  id: subscription?.id ?? subscription?._id ?? subscription?.subscriptionId ?? subscription?.subscription_id ?? '',
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
  plan: subscription?.plan
    ? {
        ...subscription.plan,
        billingPeriod: subscription?.plan?.billingPeriod ?? subscription?.plan?.billing_period ?? '',
        price: Number(subscription?.plan?.price ?? subscription?.plan?.plan_price ?? 0),
      }
    : subscription?.plan,
  orderLines: (subscription?.orderLines || subscription?.items || []).map((item) => ({
    id: item?.id,
    productId: item?.productId ?? item?.product_id,
    productName: item?.productName ?? item?.product_name,
    variantId: item?.variantId ?? item?.variant_id ?? '',
    quantity: Number(item?.quantity ?? 1),
    unitPrice: Number(item?.unitPrice ?? item?.unit_price ?? 0),
    discountValue: Number(item?.discountValue ?? item?.discount ?? 0),
    taxValue: Number(item?.taxValue ?? item?.tax ?? 0),
    amount: Number(item?.amount ?? item?.lineTotal ?? 0),
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
  isPaid: Boolean(
    invoice?.isPaid ??
      invoice?.is_paid ??
      String(invoice?.paymentStatus ?? invoice?.payment_status ?? '').toLowerCase() === 'paid'
  ),
  paymentStatus:
    String(invoice?.paymentStatus ?? invoice?.payment_status ?? '').toLowerCase() === 'paid' ||
    Boolean(invoice?.isPaid ?? invoice?.is_paid)
      ? 'Paid'
      : 'Unpaid',
  paymentDate: invoice?.paymentDate ?? invoice?.payment_date ?? invoice?.paidAt ?? invoice?.paid_at ?? null,
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
  loadingPayment: false,
  paymentStatus: 'idle',
  lastTransaction: null,
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
      const response = await fetchApi('/users', { method: 'GET' });
      const data = getPayload(response);
      set({ users: (data.users || []).map(normalizeUser), loadingUsers: false });
    } catch (err) {
      set({ error: err.message, loadingUsers: false });
    }
  },

  deleteUser: async (id) => {
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      set(state => ({ users: state.users.filter(u => u.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createUser: async (userData) => {
    try {
      const response = await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      const data = getPayload(response);
      const normalized = normalizeUser(data.user);
      set(state => ({ users: [...state.users, normalized] }));
      return normalized;
    } catch(err) {
      throw err;
    }
  },
  
  updateUser: async (id, userData) => {
    try {
      const response = await fetchApi(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      const data = getPayload(response);
      const normalized = normalizeUser(data.user);
      set(state => ({ users: state.users.map(u => u.id === id ? normalized : u) }));
      return normalized;
    } catch(err) {
      throw err;
    }
  },

  fetchContacts: async (force = false) => {
    if (get().contacts.length > 0 && !force) return;
    set({ loadingContacts: true, error: null });
    try {
      const response = await fetchApi('/contacts', { method: 'GET' });
      const data = getPayload(response);
      set({ contacts: (data.contacts || []).map(normalizeContact), loadingContacts: false });
    } catch (err) {
      set({ error: err.message, loadingContacts: false });
    }
  },

  deleteContact: async (id) => {
    try {
      await fetchApi(`/contacts/${id}`, { method: 'DELETE' });
      set(state => ({ contacts: state.contacts.filter(c => c.id !== id) }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  
  createContact: async (contactData) => {
    try {
      const response = await fetchApi('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          ...contactData,
          user_id: contactData?.user_id ?? contactData?.userId,
        })
      });
      const data = getPayload(response);
      const normalized = normalizeContact(data.contact);
      set(state => ({ contacts: [...state.contacts, normalized] }));
      return normalized;
    } catch(err) {
      throw err;
    }
  },
  
  updateContact: async (id, contactData) => {
    try {
      const response = await fetchApi(`/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...contactData,
          user_id: contactData?.user_id ?? contactData?.userId,
        })
      });
      const data = getPayload(response);
      const normalized = normalizeContact(data.contact);
      set(state => ({ contacts: state.contacts.map(c => c.id === id ? normalized : c) }));
      return normalized;
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
    showSuccess('Subscription created');
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
    showSuccess('Subscription updated');
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
      const response = await fetchApi('/plans', { method: 'GET' });
      const data = getPayload(response);
      set({ plans: (data.plans || []).map(normalizePlan), loadingPlans: false });
    } catch (err) {
      set({ error: err.message, loadingPlans: false });
    }
  },

  createPlan: async (payload) => {
    const normalizedBillingPeriod = String(
      payload?.billing_period ?? payload?.billingPeriod ?? ''
    ).toLowerCase();

    const response = await fetchApi('/plans', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        billing_period: normalizedBillingPeriod,
        min_quantity: payload?.min_quantity ?? payload?.minQuantity ?? payload?.minimumQuantity,
        start_date: payload?.start_date ?? payload?.startDate,
        end_date: payload?.end_date ?? payload?.endDate,
        auto_close: payload?.auto_close ?? payload?.autoClose,
      }),
    });
    const data = getPayload(response);
    const normalized = normalizePlan(data.plan);
    set((state) => ({ plans: [...state.plans, normalized] }));
    return normalized;
  },

  updatePlan: async (id, payload) => {
    const normalizedBillingPeriod = String(
      payload?.billing_period ?? payload?.billingPeriod ?? ''
    ).toLowerCase();

    const response = await fetchApi(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        billing_period: normalizedBillingPeriod,
        min_quantity: payload?.min_quantity ?? payload?.minQuantity ?? payload?.minimumQuantity,
        start_date: payload?.start_date ?? payload?.startDate,
        end_date: payload?.end_date ?? payload?.endDate,
        auto_close: payload?.auto_close ?? payload?.autoClose,
      }),
    });
    const data = getPayload(response);
    const normalized = normalizePlan(data.plan);
    set((state) => ({ plans: state.plans.map((plan) => (plan.id === id ? normalized : plan)) }));
    return normalized;
  },

  deletePlan: async (id) => {
    await fetchApi(`/plans/${id}`, { method: 'DELETE' });
    set((state) => ({ plans: state.plans.filter((plan) => plan.id !== id) }));
    return true;
  },

  fetchTaxes: async (force = false) => {
    if (get().taxes.length > 0 && !force) return;
    set({ loadingTaxes: true, error: null });
    try {
      const response = await fetchApi('/taxes', { method: 'GET' });
      const data = getPayload(response);
      set({ taxes: (data.taxes || []).map(normalizeTax), loadingTaxes: false });
    } catch (err) {
      set({ error: err.message, loadingTaxes: false });
    }
  },

  createTax: async (payload) => {
    const response = await fetchApi('/taxes', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        type: String(payload?.type || '').toLowerCase(),
      }),
    });
    const data = getPayload(response);
    const normalized = normalizeTax(data.tax);
    set((state) => ({ taxes: [...state.taxes, normalized] }));
    return normalized;
  },

  updateTax: async (id, payload) => {
    const response = await fetchApi(`/taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        type: payload?.type ? String(payload.type).toLowerCase() : payload?.type,
      }),
    });
    const data = getPayload(response);
    const normalized = normalizeTax(data.tax);
    set((state) => ({ taxes: state.taxes.map((tax) => (tax.id === id ? normalized : tax)) }));
    return normalized;
  },

  deleteTax: async (id) => {
    await fetchApi(`/taxes/${id}`, { method: 'DELETE' });
    set((state) => ({ taxes: state.taxes.filter((tax) => tax.id !== id) }));
    return true;
  },

  fetchDiscounts: async (force = false) => {
    if (get().discounts.length > 0 && !force) return;
    set({ loadingDiscounts: true, error: null });
    try {
      const response = await fetchApi('/discounts', { method: 'GET' });
      const data = getPayload(response);
      set({ discounts: (data.discounts || []).map(normalizeDiscount), loadingDiscounts: false });
    } catch (err) {
      set({ error: err.message, loadingDiscounts: false });
    }
  },

  createDiscount: async (payload) => {
    const normalizedType = String(payload?.type || '').toLowerCase();

    const response = await fetchApi('/discounts', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        type: normalizedType,
        min_purchase: payload?.min_purchase ?? payload?.minPurchase,
        min_quantity: payload?.min_quantity ?? payload?.minQuantity ?? payload?.minimumQuantity,
        start_date: payload?.start_date ?? payload?.startDate,
        end_date: payload?.end_date ?? payload?.endDate,
        usage_limit: payload?.usage_limit ?? payload?.usageLimit,
        apply_to_subscription: payload?.apply_to_subscription ?? payload?.applyToSubscription ?? payload?.applyToSubscriptions,
        product_ids: payload?.product_ids ?? payload?.productIds,
      }),
    });
    const data = getPayload(response);
    const normalized = normalizeDiscount(data.discount);
    set((state) => ({ discounts: [...state.discounts, normalized] }));
    return normalized;
  },

  updateDiscount: async (id, payload) => {
    const normalizedType = String(payload?.type || '').toLowerCase();

    const response = await fetchApi(`/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        type: normalizedType,
        min_purchase: payload?.min_purchase ?? payload?.minPurchase,
        min_quantity: payload?.min_quantity ?? payload?.minQuantity ?? payload?.minimumQuantity,
        start_date: payload?.start_date ?? payload?.startDate,
        end_date: payload?.end_date ?? payload?.endDate,
        usage_limit: payload?.usage_limit ?? payload?.usageLimit,
        apply_to_subscription: payload?.apply_to_subscription ?? payload?.applyToSubscription ?? payload?.applyToSubscriptions,
        product_ids: payload?.product_ids ?? payload?.productIds,
      }),
    });
    const data = getPayload(response);
    const normalized = normalizeDiscount(data.discount);
    set((state) => ({ discounts: state.discounts.map((discount) => (discount.id === id ? normalized : discount)) }));
    return normalized;
  },

  deleteDiscount: async (id) => {
    await fetchApi(`/discounts/${id}`, { method: 'DELETE' });
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
    showSuccess(`Invoice ${action} action completed`);
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
    showSuccess('Invoice generated');
    return invoice;
  },

  createPaymentSession: async (invoiceId) => {
    set({ loadingPayment: true, paymentStatus: 'creating', error: null });
    try {
      showInfo('Redirecting to payment...');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${encodeURIComponent(invoiceId)}`;
      const cancelUrl = `${origin}/payment/cancel?invoice_id=${encodeURIComponent(invoiceId)}`;

      const response = await fetchApi('/payments/create-session', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoiceId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });
      const data = getPayload(response);
      const session = data?.session || data;

      const transaction = {
        invoiceId,
        sessionId: session?.id ?? session?.session_id ?? null,
        checkoutUrl: session?.url ?? session?.checkout_url ?? data?.url ?? data?.checkout_url ?? null,
        status: session?.payment_status ?? session?.status ?? 'pending',
        amountTotal: Number(session?.amount_total ?? data?.amount_total ?? 0),
        currency: session?.currency ?? data?.currency ?? 'usd',
      };

      set({
        loadingPayment: false,
        paymentStatus: 'ready',
        lastTransaction: transaction,
      });
      return transaction;
    } catch (err) {
      set({ loadingPayment: false, paymentStatus: 'failed', error: err.message });
      showError(err.message || 'Something went wrong');
      throw err;
    }
  },

  fetchPaymentSession: async (sessionId) => {
    if (!sessionId) {
      throw new Error('Missing payment session id');
    }

    set({ loadingPayment: true, paymentStatus: 'checking', error: null });
    try {
      const response = await fetchApi(`/payments/session/${sessionId}`, {
        method: 'GET',
      });
      const data = getPayload(response);
      const session = data?.session || data;

      const normalizedStatus = String(session?.payment_status || session?.status || '').toLowerCase();
      const transaction = {
        sessionId,
        invoiceId: session?.metadata?.invoice_id ?? session?.invoice_id ?? data?.invoice_id ?? null,
        status: normalizedStatus || 'unknown',
        amountTotal: Number(session?.amount_total ?? data?.amount_total ?? 0),
        currency: session?.currency ?? data?.currency ?? 'usd',
        customerEmail: session?.customer_details?.email ?? session?.customer_email ?? null,
        paymentDate: session?.created
          ? new Date(session.created * 1000).toISOString()
          : session?.payment_date ?? data?.payment_date ?? null,
      };

      set({
        loadingPayment: false,
        paymentStatus: normalizedStatus === 'paid' ? 'paid' : normalizedStatus || 'checked',
        lastTransaction: transaction,
      });
      if (normalizedStatus === 'paid') {
        showSuccess('Payment success');
      } else if (normalizedStatus === 'failed') {
        showWarning('Payment requires attention');
      }
      return transaction;
    } catch (err) {
      set({ loadingPayment: false, paymentStatus: 'failed', error: err.message });
      showError(err.message || 'Something went wrong');
      throw err;
    }
  },

  resetPaymentState: () => {
    set({ loadingPayment: false, paymentStatus: 'idle', lastTransaction: null });
  },
}));
