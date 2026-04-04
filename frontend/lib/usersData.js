let users = [
  { id: "1", name: "Admin Setup", email: "admin@example.com", role: "admin", phone: "123-456-7890", address: "123 Admin Way", created_at: new Date().toISOString() },
  { id: "2", name: "Internal User", email: "internal@example.com", role: "internal", phone: "987-654-3210", address: "456 Office St", created_at: new Date().toISOString() },
  { id: "3", name: "Regular Portal", email: "user@example.com", role: "user", phone: "555-555-5555", address: "789 User Blvd", created_at: new Date().toISOString() },
];

export const usersDb = {
  list: () => users,
  getById: (id) => users.find((item) => item.id === id),
  update: (id, payload) => {
    const existing = users.find((item) => item.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...payload, id, updated_at: new Date().toISOString() };
    users = users.map((item) => (item.id === id ? updated : item));
    return updated;
  },
  create: (payload) => {
    const item = { id: String(Date.now()), ...payload, created_at: new Date().toISOString() };
    users = [item, ...users];
    return item;
  },
};
