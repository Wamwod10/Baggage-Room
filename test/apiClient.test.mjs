import test from "node:test";
import assert from "node:assert/strict";
import apiClient, { __apiClientTest } from "../src/services/apiClient.js";

const installAdapter = ({ delay = 20 } = {}) => {
  let calls = 0;
  let networkAborts = 0;
  apiClient.defaults.adapter = (config) => new Promise((resolve, reject) => {
    calls += 1;
    const timer = setTimeout(() => resolve({
      data: { success: true, data: { url: config.url } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }), delay);
    config.signal?.addEventListener("abort", () => {
      networkAborts += 1;
      clearTimeout(timer);
      const error = new Error("cancelled");
      error.code = "ERR_CANCELED";
      reject(error);
    }, { once: true });
  });
  return { calls: () => calls, networkAborts: () => networkAborts };
};

test.afterEach(() => __apiClientTest.resetInFlight());

test("no-signal shared GET settles and leaves no stale entry", async () => {
  const stats = installAdapter();
  const [first, second] = await Promise.all([apiClient.get("/test", { params: { b: 2, a: 1 } }), apiClient.get("/test", { params: { a: 1, b: 2 } })]);
  assert.deepEqual(first, second);
  assert.equal(stats.calls(), 1);
  assert.equal(__apiClientTest.inFlightCount(), 0);
});

test("aborting one shared GET subscriber does not abort the other", async () => {
  const stats = installAdapter();
  const firstController = new AbortController();
  const secondController = new AbortController();
  const first = apiClient.get("/shared", { signal: firstController.signal });
  const second = apiClient.get("/shared", { signal: secondController.signal });
  firstController.abort();
  await assert.rejects(first, (error) => error.cancelled === true);
  const value = await second;
  assert.equal(value.data.url, "/shared");
  assert.equal(stats.calls(), 1);
  assert.equal(stats.networkAborts(), 0);
  assert.equal(__apiClientTest.inFlightCount(), 0);
});

test("when the last subscriber aborts the shared network request is cancelled", async () => {
  const stats = installAdapter({ delay: 100 });
  const controller = new AbortController();
  const request = apiClient.get("/abort-all", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, (error) => error.cancelled === true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(stats.calls() === 0 || stats.networkAborts() === 1);
  assert.equal(__apiClientTest.inFlightCount(), 0);
});

test("already-aborted optional signal never starts a request", async () => {
  const stats = installAdapter();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(apiClient.get("/already-aborted", { signal: controller.signal }), (error) => error.cancelled === true);
  assert.equal(stats.calls(), 0);
});
