import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../baby-buddy-dashboard/frontend/src/api.js";
import {
  createRefreshLoop, createSectionReads, dataScope, readAllPages, refreshSections,
} from "../baby-buddy-dashboard/frontend/src/utils/babyDataRefresh.js";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("le rafraîchissement ne se chevauche pas et regroupe les demandes après une écriture", async () => {
  const first = deferred();
  const second = deferred();
  let count = 0;
  const loop = createRefreshLoop(() => (++count === 1 ? first.promise : second.promise), {
    interval: 30000,
    available: () => true,
  });
  try {
    const initial = loop.refresh();
    assert.equal(loop.refresh(), initial);
    const queued = loop.refresh({ queue: true });
    assert.equal(loop.refresh({ queue: true }), queued);
    await Promise.resolve();
    assert.equal(count, 1);
    first.resolve();
    await initial;
    await Promise.resolve();
    assert.equal(count, 2);
    second.resolve();
    await queued;
  } finally {
    loop.stop();
  }
});

test("une synchronisation quittée ignore également les réponses qui arrivent après annulation", async () => {
  const previous = deferred();
  const results = [];
  const apply = (section, result) => results.push([section.key, result]);
  const controller = new AbortController();
  const first = refreshSections([{ key: "previous", read: () => previous.promise }], controller.signal, apply);
  controller.abort();
  await refreshSections([{ key: "current", read: async () => 2 }], new AbortController().signal, apply);
  previous.resolve(1);
  await first;
  assert.deepEqual(results, [["current", { data: 2 }]]);
});

test("une lecture en erreur laisse arriver les réponses des autres sections", async () => {
  const results = new Map();
  const fault = new Error("Network");
  await refreshSections([
    { key: "feedings", read: async () => [{ id: 1 }] },
    { key: "sleep", read: async () => { throw fault; } },
    { key: "changes", read: async () => [{ id: 2 }] },
  ], new AbortController().signal, (section, result) => results.set(section.key, result));
  assert.deepEqual(results.get("feedings"), { data: [{ id: 1 }] });
  assert.deepEqual(results.get("sleep"), { error: fault });
  assert.deepEqual(results.get("changes"), { data: [{ id: 2 }] });
});

test("la pagination conserve les filtres, ignore l'URL de la page suivante et dédoublonne", async () => {
  const offsets = [];
  const entries = await readAllPages(async (params) => {
    assert.equal(params.child, 7);
    offsets.push(params.offset);
    return [
      { results: [{ id: 1 }, { id: 2 }], next: "https://example.invalid/?offset=123" },
      { results: [{ id: 2 }, { id: 3 }], next: "more" },
      { results: [{ id: 4 }], next: null },
    ][offsets.length - 1];
  }, { child: 7 });
  assert.deepEqual(offsets, [0, 2, 4]);
  assert.deepEqual(entries.map(entry => entry.id), [1, 2, 3, 4]);
});

test("la Journée se charge à la date locale demandée même pendant un changement d'heure", async () => {
  const key = "2026-03-29";
  const now = new Date(2026, 3, 1, 12);
  const expectedStart = new Date(2026, 2, 29).toISOString();
  const expectedNext = new Date(2026, 2, 30).toISOString();
  const scope = dataScope("all", "day", key, now);
  assert.equal(scope.min, expectedStart);
  assert.equal(scope.next.toISOString(), expectedNext);
  assert.ok(Date.parse(scope.max) < Date.parse(expectedNext));

  const captured = new Map();
  const mock = new Proxy({}, { get: (_, method) => async (params) => {
    captured.set(method, params);
    return [];
  } });
  const plan = createSectionReads(mock, 3, "all", "day", key, now);
  await refreshSections(plan.reads, new AbortController().signal, () => {});
  assert.equal(captured.get("getFeedings").start_min, expectedStart);
  assert.equal(captured.get("getFeedings").start_max, scope.max);
  assert.equal(captured.get("getSleep").end_min, expectedStart);
  assert.equal(captured.get("getSleep").start_max, scope.max);
  assert.equal(captured.get("getTemperature").date_min, expectedStart);
  assert.equal(captured.get("getNotes").date_min, expectedStart);
  assert.equal(captured.get("getWeight").date, key);
  assert.equal(captured.get("getHeight").date, key);
  assert.equal(plan.fullStock, false);
  assert.ok(!plan.reads.some(section => section.key === "stock"));
});

test("Total réutilise les relevés complets pour le stock et les autres périodes chargent le stock séparément", () => {
  const total = createSectionReads({}, 1, "all", "overview");
  const week = createSectionReads({}, 1, "week", "overview");
  assert.equal(total.fullStock, true);
  assert.ok(!total.reads.some(section => section.key === "stock"));
  assert.equal(week.fullStock, false);
  assert.ok(week.reads.some(section => section.key === "stock"));
});

test("la date limite s'applique aussi au corps de la réponse", async (context) => {
  const reading = deferred();
  context.mock.timers.enable({ apis: ["setTimeout"] });
  context.mock.method(globalThis, "fetch", async (_, { signal }) => ({
    status: 200,
    ok: true,
    text: () => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      reading.resolve();
    }),
  }));
  const result = assert.rejects(api.getConfig(), { code: "request_timeout", timedOut: true });
  await reading.promise;
  context.mock.timers.runAll();
  await result;
});

test("une lecture abandonnée remonte une annulation et une écriture incertaine n'est pas retentée", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => { throw new TypeError("Network"); });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.getChildren({}, { signal: controller.signal }), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 0);
  await assert.rejects(api.createSleep({ child: 1 }), { code: "request_unconfirmed_write", uncertain: true });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("une réponse 408 générique ne confirme pas l'échec d'une écriture", async (context) => {
  context.mock.method(globalThis, "fetch", async () => new Response("Request timeout", { status: 408 }));
  await assert.rejects(api.createSleep({ child: 1 }), { status: 408, code: "request_unconfirmed_write", uncertain: true });
});
