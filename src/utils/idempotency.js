export const createIdempotencyKey = (scope = "mutation") => {
  const random = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${random}`.slice(0, 120);
};

export const idempotencyHeaders = (key) => ({
  headers: { "Idempotency-Key": String(key || "").trim() },
});
