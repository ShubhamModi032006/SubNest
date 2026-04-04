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

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.error || "Something went wrong");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}
