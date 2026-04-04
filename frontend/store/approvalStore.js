import { create } from "zustand";
import { fetchApi } from "@/lib/api";
import { showError, showInfo, showSuccess, showWarning } from "@/lib/toast";

const getPayload = (response) => response?.data ?? response;

export const useApprovalStore = create((set, get) => ({
  requests: [],
  loadingRequests: false,
  creatingRequest: false,
  error: null,
  notification: null,

  clearNotification: () => set({ notification: null }),

  fetchRequests: async () => {
    set({ loadingRequests: true, error: null });
    try {
      const response = await fetchApi("/approvals", { method: "GET" });
      const data = getPayload(response);
      set({ requests: data.approvals || [], loadingRequests: false });
      return data.approvals || [];
    } catch (err) {
      set({ loadingRequests: false, error: err.message || "Failed to load approvals" });
      throw err;
    }
  },

  createRequest: async (payload) => {
    set({ creatingRequest: true, error: null });
    try {
      const response = await fetchApi("/approvals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = getPayload(response);
      const created = data.approval;
      if (created) {
        const existing = get().requests.some((item) => item.id === created.id);
        set((state) => ({
          requests: existing
            ? state.requests.map((item) => (item.id === created.id ? created : item))
            : [created, ...state.requests],
          creatingRequest: false,
          notification: {
            type: "success",
            message: "Request sent to admin",
          },
        }));
        showWarning("Requires admin approval");
      } else {
        set({ creatingRequest: false });
      }
      return data;
    } catch (err) {
      set({
        creatingRequest: false,
        error: err.message || "Failed to create approval request",
        notification: {
          type: "error",
          message: err.message || "Failed to create approval request",
        },
      });
      showError(err.message || "Something went wrong");
      throw err;
    }
  },

  approveRequest: async (id) => {
    try {
      const response = await fetchApi(`/approvals/${id}/approve`, { method: "POST" });
      const data = getPayload(response);
      if (data.approval) {
        set((state) => ({
          requests: state.requests.map((item) => (item.id === id ? data.approval : item)),
          notification: { type: "success", message: "Approval approved" },
        }));
        showSuccess("Approval updated");
      }
      return data;
    } catch (err) {
      set({
        error: err.message || "Failed to approve request",
        notification: {
          type: "error",
          message: err.message || "Failed to approve request",
        },
      });
      showError(err.message || "Something went wrong");
      throw err;
    }
  },

  rejectRequest: async (id) => {
    try {
      const response = await fetchApi(`/approvals/${id}/reject`, { method: "POST" });
      const data = getPayload(response);
      if (data.approval) {
        set((state) => ({
          requests: state.requests.map((item) => (item.id === id ? data.approval : item)),
          notification: { type: "success", message: "Approval rejected" },
        }));
        showInfo("Approval decision recorded");
      }
      return data;
    } catch (err) {
      set({
        error: err.message || "Failed to reject request",
        notification: {
          type: "error",
          message: err.message || "Failed to reject request",
        },
      });
      showError(err.message || "Something went wrong");
      throw err;
    }
  },
}));
