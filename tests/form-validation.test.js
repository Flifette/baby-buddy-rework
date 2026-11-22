import test from "node:test";
import assert from "node:assert/strict";

import { apiErrorTranslationKey, findSleepOverlap, findTimeOverlap } from "../baby-buddy-dashboard/frontend/src/utils/formValidation.js";

const entries = [
  { id: 1, start: "2026-08-11T23:11:00+02:00", end: "2026-08-12T00:11:00+02:00", nap: false },
  { id: 2, start: "2026-08-12T10:00:00+02:00", end: "2026-08-12T10:30:00+02:00", nap: true },
];

test("détecte un chevauchement de sommeil traversant minuit", () => {
  assert.equal(findTimeOverlap(entries, "2026-08-11T23:34:00+02:00", "2026-08-12T00:34:00+02:00")?.id, 1);
});

test("distingue une période libre et ignore l’occurrence en cours d’édition", () => {
  assert.equal(findTimeOverlap(entries, "2026-08-12T01:00:00+02:00", "2026-08-12T02:00:00+02:00"), null);
  assert.equal(findTimeOverlap(entries, entries[0].start, entries[0].end, 1), null);
});

test("explique aussi un chevauchement provenant d’un minuteur", () => {
  const timerOverlap = findSleepOverlap(entries, {
    timerId: 61,
    timerStart: "2026-08-12T09:45:00+02:00",
  }, new Date("2026-08-12T10:45:00+02:00"));
  assert.equal(timerOverlap?.id, 2);

  const freeTimer = findSleepOverlap(entries, {
    timerId: 62,
    timerStart: "2026-08-12T11:00:00+02:00",
  }, new Date("2026-08-12T12:00:00+02:00"));
  assert.equal(freeTimer, null);
});

test("classe les erreurs API sans exposer un message serveur non traduit", () => {
  assert.equal(apiErrorTranslationKey(new Error("API error 401")), "form.error.authorization");
  assert.equal(apiErrorTranslationKey(new Error("API error 409: already exists")), "form.error.duplicate");
  assert.equal(apiErrorTranslationKey(new Error("API error 400: required")), "form.error.invalid");
  assert.equal(apiErrorTranslationKey(new TypeError("Failed to fetch")), "form.error.connection");
  assert.equal(apiErrorTranslationKey(new Error("API error 503")), "form.error.server");
});

test("distingue une écriture à vérifier d'une connexion ou d'un délai dépassé", () => {
  assert.equal(apiErrorTranslationKey({ code: "baby_buddy_unconfirmed_write", status: 504 }), "form.error.unconfirmed");
  assert.equal(apiErrorTranslationKey({ code: "request_unconfirmed_write" }), "form.error.unconfirmed");
  assert.equal(apiErrorTranslationKey({ code: "baby_buddy_timeout", status: 504 }), "form.error.timeout");
  assert.equal(apiErrorTranslationKey({ code: "baby_buddy_unavailable", status: 502 }), "form.error.connection");
  assert.equal(apiErrorTranslationKey(new Error("API error 400: Another entry intersects the specified time period.")), "form.error.duplicate");
});
