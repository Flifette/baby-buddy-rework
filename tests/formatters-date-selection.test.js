import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateByPeriod,
  dailyFeedingTotals,
  dailySleepTotals,
  dailyTummyTotals,
  getEntriesForDateKey,
} from "../baby-buddy-dashboard/frontend/src/utils/formatters.js";

const dateKey = "2026-08-08";
const feeding = { start: `${dateKey}T08:30:00`, amount: 80 };
const sleep = { start: `${dateKey}T09:00:00`, duration: "01:30:00" };
const tummy = { start: `${dateKey}T11:00:00`, duration: "00:10:00" };

test("les séries conservent une clé de date indépendante du libellé affiché", () => {
  assert.equal(aggregateByPeriod([feeding], "feeding", "all")[0].dateKey, dateKey);
  assert.equal(dailyFeedingTotals([feeding], null)[0].dateKey, dateKey);
  assert.equal(dailySleepTotals([sleep], null)[0].dateKey, dateKey);
  assert.equal(dailyTummyTotals([tummy], null)[0].dateKey, dateKey);
});

test("les occurrences sont sélectionnées par leur clé de date stable", () => {
  const entries = [
    feeding,
    { start: "2026-08-09T08:30:00", amount: 90 },
  ];

  assert.deepEqual(getEntriesForDateKey(entries, dateKey), [feeding]);
  assert.deepEqual(getEntriesForDateKey(entries, undefined), []);
});
