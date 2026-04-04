const ADMIN_ROLE = "admin";
const INTERNAL_ROLE = "internal";
const PORTAL_ROLE = "portal";

export function normalizeRole(role) {
  return String(role || "").toLowerCase();
}

export function isAdmin(role) {
  return normalizeRole(role) === ADMIN_ROLE;
}

export function isInternal(role) {
  return normalizeRole(role) === INTERNAL_ROLE;
}

export function isPortal(role) {
  return normalizeRole(role) === PORTAL_ROLE;
}

export function canAccessDashboard(role) {
  const normalized = normalizeRole(role);
  return normalized === ADMIN_ROLE || normalized === INTERNAL_ROLE;
}

export function canAccessConfiguration(role) {
  return isAdmin(role);
}

export function canCreateUser(role) {
  return isAdmin(role);
}

export function canCreateProduct(role) {
  const normalized = normalizeRole(role);
  return normalized === ADMIN_ROLE || normalized === INTERNAL_ROLE;
}

export function canEditProduct(role) {
  return canCreateProduct(role);
}

export function canArchiveProduct(role) {
  return canCreateProduct(role);
}

export function canCreateInvoice(role) {
  const normalized = normalizeRole(role);
  return normalized === ADMIN_ROLE || normalized === INTERNAL_ROLE;
}

export function canTriggerInvoicePayment(role) {
  const normalized = normalizeRole(role);
  return normalized === ADMIN_ROLE || normalized === INTERNAL_ROLE;
}

export function canDeleteProduct(role) {
  return isAdmin(role);
}

export function canCancelInvoice(role, invoiceStatus) {
  const normalizedRole = normalizeRole(role);
  const normalizedStatus = String(invoiceStatus || "").toLowerCase();

  if (normalizedRole === ADMIN_ROLE) return true;
  if (normalizedRole === INTERNAL_ROLE) {
    return normalizedStatus !== "confirmed";
  }

  return false;
}

export function canModifyPricing(role) {
  return isAdmin(role);
}
