import test from "node:test";
import assert from "node:assert/strict";
import { createIdempotencyKey, idempotencyHeaders } from "../src/utils/idempotency.js";

test("mutation keys are scoped, unique and accepted by the API header helper", () => {
  const keys = new Set(Array.from({ length: 10 }, () => createIdempotencyKey("pickup")));
  assert.equal(keys.size, 10);
  for (const key of keys) {
    assert.match(key, /^pickup:/);
    assert.ok(key.length <= 120);
    assert.equal(idempotencyHeaders(key).headers["Idempotency-Key"], key);
  }
});
