import axios from "axios";

const TOKEN_KEY = "br_token";
const AUTH_EVENT = "br:unauthorized";
const env = import.meta.env || {};
const PRODUCTION_API_URL = "https://baggage-room-backend.onrender.com/api";
const parseTimeout = (value, fallback = 15000) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1000 && parsed <= 120000 ? parsed : fallback;
};

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

const fingerprint = (value = "") => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const getAuthContextKey = () => {
  const token = readToken();
  return token ? `auth:${fingerprint(token)}` : "anonymous";
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
  timeout: parseTimeout(env.VITE_API_TIMEOUT_MS),
  headers: {
    "Content-Type": "application/json",
  },
});

// React StrictMode intentionally mounts effects twice in development. Keeping
// identical GET requests in-flight also protects production from two mounted
// consumers asking for the same resource at the same time.
const inFlightGets = new Map();

const stableSerialize = (value) => {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
};

const sharedGetKey = (url, config = {}) => {
  const baseURL = config.baseURL || apiClient.defaults.baseURL || "";
  return `${baseURL}|${getAuthContextKey()}|${url}?${stableSerialize({
    params: config.params || {},
    headers: config.headers || {},
    responseType: config.responseType || "",
    timeout: config.timeout || apiClient.defaults.timeout || "",
  })}`;
};

const originalGet = apiClient.get.bind(apiClient);
const createCancelledError = () => ({
  success: false,
  message: "Request cancelled",
  errors: [],
  status: 0,
  code: "ERR_CANCELED",
  cancelled: true,
  retryable: false,
});

const subscribeToGet = (entry, signal) => {
  if (signal?.aborted) return Promise.reject(createCancelledError());

  entry.subscribers += 1;

  if (!signal) {
    return entry.promise.finally(() => {
      entry.subscribers = Math.max(0, entry.subscribers - 1);
    });
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      entry.subscribers = Math.max(0, entry.subscribers - 1);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(createCancelledError());

      // Give a StrictMode remount or another consumer in the same turn a
      // chance to subscribe before cancelling the shared network request.
      queueMicrotask(() => {
        if (entry.subscribers === 0 && !entry.settled) entry.controller.abort();
      });
    };

    signal.addEventListener("abort", onAbort, { once: true });
    entry.promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
};

apiClient.get = (url, config = {}) => {
  const safeConfig = config ?? {};
  const key = sharedGetKey(url, safeConfig);
  if (safeConfig.signal?.aborted) return Promise.reject(createCancelledError());
  const existing = inFlightGets.get(key);
  if (existing) return subscribeToGet(existing, safeConfig.signal);

  const { signal: callerSignal, ...requestConfig } = safeConfig;
  const controller = new AbortController();
  const entry = {
    controller,
    promise: null,
    settled: false,
    subscribers: 0,
  };

  entry.promise = originalGet(url, { ...requestConfig, signal: controller.signal }).finally(() => {
    entry.settled = true;
    if (inFlightGets.get(key) === entry) inFlightGets.delete(key);
  });
  inFlightGets.set(key, entry);
  return subscribeToGet(entry, callerSignal);
};

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

    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(createCancelledError());
    }

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
      isTimeout: error.code === "ECONNABORTED" || error.code === "ETIMEDOUT",
      isNetworkError: !error.response && error.code !== "ECONNABORTED" && error.code !== "ETIMEDOUT",
    });
  },
);

export { TOKEN_KEY, AUTH_EVENT, getAuthContextKey };
export default apiClient;
