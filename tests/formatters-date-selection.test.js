import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateByPeriod,
  dailyFeedingTotals,
  dailySleepTotals,
  dailyTummyTotals,
  formatDuration,
  getEntriesForDateKey,
  localDateFromKey,
  localDateKey,
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

test("les libellés de graphiques suivent la langue sans modifier leur clé de date", () => {
  const french = aggregateByPeriod([feeding], "feeding", "all", [], "fr")[0];
  const english = aggregateByPeriod([feeding], "feeding", "all", [], "en")[0];
  assert.equal(french.dateKey, dateKey);
  assert.equal(english.dateKey, dateKey);
  assert.notEqual(french.day, english.day);
});

test("la vue Journée présente les durées de sommeil sans décimales inutiles", () => {
  assert.equal(formatDuration("00:42:00", "fr"), "42 min");
  assert.equal(formatDuration("05:15:00", "fr"), "5 h 15 min");
  assert.equal(formatDuration("01:00:00", "fr"), "1 h");
  assert.equal(formatDuration("01:14:40", "en"), "1 h 15 min");
});

test("le calendrier de la vue Journée conserve la date locale sans conversion UTC", () => {
  const selected = localDateFromKey("2026-03-29");
  assert.ok(selected instanceof Date);
  assert.equal(selected.getHours(), 12);
  assert.equal(localDateKey(selected), "2026-03-29");
  assert.equal(localDateFromKey("2026-02-31"), null);
  assert.equal(localDateFromKey("29/03/2026"), null);
});
