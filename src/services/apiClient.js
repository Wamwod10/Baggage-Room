import axios from "axios";

const TOKEN_KEY = "br_token";
const AUTH_EVENT = "br:unauthorized";
const env = import.meta.env || {};
const PRODUCTION_API_URL = "https://baggage-room-backend.onrender.com/api";

const getBaseURL = () => {
  const configuredUrl = String(env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  const localDevHost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const isProductionDomain =
    typeof window !== "undefined" &&
    ["qonoqbaggage.uz", "www.qonoqbaggage.uz"].includes(window.location.hostname);

  if (
    localDevHost &&
    configuredUrl &&
    configuredUrl.includes("baggage-room-backend.onrender.com")
  ) {
    return "http://localhost:5000/api";
  }

  if (
    isProductionDomain &&
    (!configuredUrl || configuredUrl.startsWith("http://") || configuredUrl.includes("localhost"))
  ) {
    return PRODUCTION_API_URL;
  }

  if (configuredUrl) return configuredUrl;

  return "http://localhost:5000/api";
};

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
  baseURL: getBaseURL(),
  timeout: 60000,
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
          : payload?.message ||
            (error.code === "ECONNABORTED"
              ? "Server javobi kechikdi. Qayta urinib ko'ring."
              : !error.response
                ? "Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring."
                : error.message || "Request failed"),
      errors: payload?.errors || [],
      status,
      code: error.code,
      retryable: !status || status >= 500,
    });
  },
);

export { TOKEN_KEY, AUTH_EVENT };
export default apiClient;
