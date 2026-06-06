import axios from "axios";

const TOKEN_KEY = "br_token";
const AUTH_EVENT = "br:unauthorized";
const env = import.meta.env || {};

const readToken = () => {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const clearAuthStorage = () => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("br_user");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_EVENT));
    }
  } catch {
    // Ignore storage access failures, the original 401 response is still returned.
  }
};

const apiClient = axios.create({
  baseURL: env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      clearAuthStorage();
    }

    const firstValidationMessage = Array.isArray(payload?.errors)
      ? payload.errors.find((item) => item?.message)?.message
      : "";

    return Promise.reject({
      success: false,
      message:
        payload?.message === "Validation failed" && firstValidationMessage
          ? firstValidationMessage
          : payload?.message || error.message || "Request failed",
      errors: payload?.errors || [],
      status,
    });
  },
);

export { TOKEN_KEY, AUTH_EVENT };
export default apiClient;
