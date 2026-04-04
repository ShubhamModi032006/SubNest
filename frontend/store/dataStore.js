import { create } from 'zustand';

export const useDataStore = create((set, get) => ({
  users: [],
  contacts: [],
  products: [],
  loadingUsers: false,
  loadingContacts: false,
  loadingProducts: false,
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
  }
}));
