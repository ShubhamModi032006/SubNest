export function allowRoles(allowedRoles, currentRole) {
  if (!currentRole) return false;
  return allowedRoles.includes(currentRole.toLowerCase());
}
