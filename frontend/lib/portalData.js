import { invoicesDb } from "@/lib/invoiceData";
import { subscriptionsDb } from "@/lib/subscriptionData";
import { discountsDb, taxesDb } from "@/lib/configurationData";

const PRODUCTS = [
  {
    id: "prod-cloud-support",
    name: "Cloud Support Suite",
    category: "Services",
    description: "Managed support for teams that need fast response times and reliable SLA coverage.",
    basePrice: 149,
    costPrice: 42,
    imageLabel: "Cloud",
    accent: "from-sky-500 via-cyan-500 to-emerald-400",
    featured: true,
    tags: ["Support", "SLA", "Managed"],
    variants: [
      { id: "cloud-24-7", label: "24/7 SLA", extraPrice: 80 },
      { id: "cloud-business", label: "Business Hours", extraPrice: 30 },
    ],
    plans: [
      { id: "cloud-monthly", label: "Monthly", billingPeriod: "Monthly", recurringPrice: 49 },
      { id: "cloud-quarterly", label: "Quarterly", billingPeriod: "Monthly", recurringPrice: 129 },
    ],
  },
  {
    id: "prod-crm-setup",
    name: "CRM Setup Pack",
    category: "Software",
    description: "Launch-ready CRM configuration with onboarding, automation, and reporting templates.",
    basePrice: 220,
    costPrice: 72,
    imageLabel: "CRM",
    accent: "from-violet-500 via-fuchsia-500 to-pink-400",
    featured: true,
    tags: ["CRM", "Automation"],
    variants: [
      { id: "crm-starter", label: "Starter", extraPrice: 0 },
      { id: "crm-scale", label: "Scale", extraPrice: 70 },
    ],
    plans: [
      { id: "crm-monthly", label: "Monthly", billingPeriod: "Monthly", recurringPrice: 39 },
      { id: "crm-annual", label: "Annual", billingPeriod: "Yearly", recurringPrice: 299 },
    ],
  },
  {
    id: "prod-security-kit",
    name: "Security Review Kit",
    category: "Consulting",
    description: "Detailed security checklist, vulnerability review, and remediation roadmap for your release.",
    basePrice: 180,
    costPrice: 50,
    imageLabel: "Shield",
    accent: "from-amber-500 via-orange-500 to-rose-400",
    featured: false,
    tags: ["Security", "Audit"],
    variants: [
      { id: "security-standard", label: "Standard", extraPrice: 0 },
      { id: "security-deep", label: "Deep Review", extraPrice: 120 },
    ],
    plans: [
      { id: "security-once", label: "One-time", billingPeriod: "Monthly", recurringPrice: 0 },
      { id: "security-sla", label: "Support Add-on", billingPeriod: "Monthly", recurringPrice: 25 },
    ],
  },
  {
    id: "prod-hardware-pro",
    name: "Hardware Care Pro",
    category: "Goods",
    description: "Device bundle with premium protection and installation guidance for field teams.",
    basePrice: 95,
    costPrice: 31,
    imageLabel: "Kit",
    accent: "from-emerald-500 via-teal-500 to-cyan-400",
    featured: false,
    tags: ["Hardware", "Bundle"],
    variants: [
      { id: "hardware-one", label: "Single Device", extraPrice: 0 },
      { id: "hardware-five", label: "Team Pack", extraPrice: 240 },
    ],
    plans: [
      { id: "hardware-plan-monthly", label: "Monthly Care", billingPeriod: "Monthly", recurringPrice: 19 },
      { id: "hardware-plan-annual", label: "Annual Care", billingPeriod: "Yearly", recurringPrice: 149 },
    ],
  },
];

const orders = [];
const paymentSessions = [];

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const toNumber = (value) => Number(value || 0);

const getTaxRate = () => {
  const tax = taxesDb.list()[0];
  return tax ? toNumber(tax.value) : 0;
};

export const getProducts = () => PRODUCTS;

export const getProductById = (id) => PRODUCTS.find((product) => product.id === id);

export const searchProducts = ({ search = "", category = "all", minPrice = 0, maxPrice = Infinity } = {}) => {
  const normalizedSearch = String(search || "").trim().toLowerCase();
  return PRODUCTS.filter((product) => {
    const matchesSearch = !normalizedSearch || [product.name, product.category, product.description, ...(product.tags || [])]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesCategory = category === "all" || product.category === category;
    const matchesPrice = product.basePrice >= Number(minPrice || 0) && product.basePrice <= Number(maxPrice || Number.POSITIVE_INFINITY);
    return matchesSearch && matchesCategory && matchesPrice;
  });
};

export const computeProductPricing = (product, { variantId, planId, quantity = 1 } = {}) => {
  const variant = product?.variants?.find((item) => item.id === variantId) || product?.variants?.[0] || null;
  const plan = product?.plans?.find((item) => item.id === planId) || product?.plans?.[0] || null;
  const unitPrice = toNumber(product?.basePrice) + toNumber(variant?.extraPrice) + toNumber(plan?.recurringPrice);
  const subtotal = unitPrice * Number(quantity || 1);
  const taxRate = getTaxRate();
  const tax = (subtotal * taxRate) / 100;
  return {
    variant,
    plan,
    quantity: Number(quantity || 1),
    unitPrice,
    subtotal,
    taxRate,
    tax,
    total: subtotal + tax,
  };
};

export const ordersDb = {
  list: () => orders,
  getById: (id) => orders.find((order) => order.id === id),
  create: (payload) => {
    const customerId = payload?.customer?.id || payload?.customerId || "guest";
    const customerName = payload?.customer?.name || payload?.customerName || "Guest Customer";
    const customerEmail = payload?.customer?.email || payload?.customerEmail || "guest@example.com";
    const customerAddress = payload?.customer?.address || payload?.customerAddress || "";
    const orderItems = Array.isArray(payload?.items) ? payload.items : [];

    const normalizedItems = orderItems.map((item) => {
      const product = getProductById(item.productId);
      const pricing = computeProductPricing(product, {
        variantId: item.variantId,
        planId: item.planId,
        quantity: item.quantity,
      });

      return {
        id: item.id || genId("item"),
        productId: item.productId,
        productName: product?.name || item.productName || "Product",
        category: product?.category || item.category || "General",
        variantId: pricing.variant?.id || item.variantId || "",
        variantLabel: pricing.variant?.label || item.variantLabel || "Standard",
        planId: pricing.plan?.id || item.planId || "",
        planLabel: pricing.plan?.label || item.planLabel || "One-time",
        quantity: Number(item.quantity || 1),
        unitPrice: pricing.unitPrice,
        subtotal: pricing.subtotal,
        taxRate: pricing.taxRate,
        tax: pricing.tax,
        total: pricing.total,
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = normalizedItems.reduce((sum, item) => sum + item.tax, 0);
    const discountTotal = toNumber(payload?.discountAmount || 0);
    const total = Math.max(0, subtotal + tax - discountTotal);

    const subscription = subscriptionsDb.create({
      customerId,
      customerType: "user",
      customerLabel: customerName,
      recurringPlanId: normalizedItems[0]?.planId || "",
      recurringPlanLabel: normalizedItems[0]?.planLabel || "One-time",
      status: "Confirmed",
      startDate: new Date().toISOString().slice(0, 10),
      expirationDate: "",
      paymentTerms: "Due on receipt",
      paymentMethod: "Stripe",
      notes: payload?.notes || "Portal checkout",
      orderLines: normalizedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        planId: item.planId,
        planLabel: item.planLabel,
        quantity: item.quantity,
        basePrice: item.unitPrice,
        variantExtraPrice: 0,
        planPrice: 0,
        discountType: "Fixed",
        discountValue: 0,
        taxType: "Percentage",
        taxValue: item.taxRate,
      })),
    });

    const invoice = invoicesDb.create({
      customerId,
      customerLabel: customerName,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      linkedSubscriptionId: subscription.id,
      status: "confirmed",
      lines: normalizedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: 0,
        taxAmount: item.tax,
        total: item.total,
      })),
    });

    const order = {
      id: genId("ord"),
      orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId,
      customerName,
      customerEmail,
      customerAddress,
      status: "confirmed",
      subtotal,
      tax,
      discountTotal,
      total,
      items: normalizedItems,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      createdAt: new Date().toISOString(),
    };

    orders.unshift(order);
    return order;
  },
};

export const paymentsDb = {
  list: () => paymentSessions,
  getById: (id) => paymentSessions.find((session) => session.id === id),
  createSession: ({ invoiceId, successUrl, cancelUrl }) => {
    const invoice = invoicesDb.getById(invoiceId);
    if (!invoice) {
      const error = new Error("Invoice not found.");
      error.statusCode = 404;
      throw error;
    }

    if (String(invoice.status).toLowerCase() !== "confirmed") {
      const error = new Error("Only confirmed invoices can be paid.");
      error.statusCode = 400;
      throw error;
    }

    if (String(invoice.paymentStatus || "").toLowerCase() === "paid" || String(invoice.status).toLowerCase() === "paid") {
      const error = new Error("Invoice already paid.");
      error.statusCode = 400;
      throw error;
    }

    const existing = paymentSessions.find((session) => session.invoiceId === invoiceId && ["pending", "success"].includes(session.status));
    if (existing) {
      const error = new Error("Payment already initiated for this invoice.");
      error.statusCode = 409;
      throw error;
    }

    const session = {
      id: genId("ps"),
      invoiceId,
      amountTotal: Number(invoice.grandTotal || 0),
      currency: "usd",
      status: "pending",
      checkoutUrl: successUrl || `/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}&source=portal`,
      successUrl: successUrl || `/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}&source=portal`,
      cancelUrl: cancelUrl || `/payment/cancel?invoice_id=${invoiceId}&source=portal`,
      paymentDate: null,
      createdAt: new Date().toISOString(),
    };

    paymentSessions.unshift(session);
    return session;
  },
  settleSuccess: (sessionId) => {
    const session = paymentSessions.find((item) => item.id === sessionId);
    if (!session) return null;
    session.status = "success";
    session.paymentDate = new Date().toISOString();
    const invoice = invoicesDb.getById(session.invoiceId);
    if (invoice) {
      invoicesDb.update(invoice.id, { status: "paid", paymentStatus: "Paid", paymentDate: session.paymentDate });
    }
    return session;
  },
  markFailed: (sessionId) => {
    const session = paymentSessions.find((item) => item.id === sessionId);
    if (!session) return null;
    session.status = "failed";
    return session;
  },
};
