const PRODUCTS = [
  {
    id: "prod-cloud-support",
    name: "Cloud Support Suite",
    category: "Services",
    description: "Managed support for teams that need fast response times and reliable SLA coverage.",
    basePrice: 149,
    costPrice: 42,
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

const normalize = (value) => String(value || "").trim().toLowerCase();

const getProducts = () => PRODUCTS;

const getProductById = (id) => PRODUCTS.find((product) => product.id === id);

const searchProducts = ({ search = "", category = "all", minPrice = 0, maxPrice = Number.POSITIVE_INFINITY } = {}) => {
  const query = normalize(search);
  return PRODUCTS.filter((product) => {
    const matchesSearch =
      !query ||
      [product.name, product.category, product.description, ...(product.tags || [])].join(" ").toLowerCase().includes(query);
    const matchesCategory = category === "all" || product.category === category;
    const matchesPrice = product.basePrice >= Number(minPrice || 0) && product.basePrice <= Number(maxPrice || Number.POSITIVE_INFINITY);
    return matchesSearch && matchesCategory && matchesPrice;
  });
};

const calculatePortalPricing = (product, { variantId, planId, quantity = 1 } = {}) => {
  const variant = product?.variants?.find((item) => item.id === variantId) || product?.variants?.[0] || null;
  const plan = product?.plans?.find((item) => item.id === planId) || product?.plans?.[0] || null;
  const unitPrice = Number(product?.basePrice || 0) + Number(variant?.extraPrice || 0) + Number(plan?.recurringPrice || 0);
  const normalizedQuantity = Math.max(1, Number(quantity || 1));
  const subtotal = unitPrice * normalizedQuantity;

  return {
    variant,
    plan,
    quantity: normalizedQuantity,
    unitPrice,
    subtotal,
  };
};

module.exports = {
  getProducts,
  getProductById,
  searchProducts,
  calculatePortalPricing,
};