import { showError, showSuccess } from "@/lib/toast";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function fetchApi(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
  let parsedToken = null;
  
  if (token) {
    try {
      const state = JSON.parse(token);
      parsedToken = state?.state?.token;
    } catch(e) {
      // ignoring parse error
    }
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (parsedToken) {
    defaultHeaders["Authorization"] = `Bearer ${parsedToken}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch (networkError) {
    const error = new Error("Unable to connect to backend API. Ensure backend is running on port 5000.");
    error.status = 0;
    error.payload = { cause: networkError?.message || "Network request failed" };
    if (!options?.silentErrorToast) {
      showError(error.message);
    }
    throw error;
  }
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || "Something went wrong";
    if (!options?.silentErrorToast) {
      showError(message);
    }
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  if (options?.successToastMessage) {
    showSuccess(options.successToastMessage);
  }

  return data;
}
