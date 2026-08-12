import test from "node:test";
import assert from "node:assert/strict";

import { apiErrorTranslationKey, findTimeOverlap } from "../baby-buddy-dashboard/frontend/src/utils/formValidation.js";

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

test("classe les erreurs API sans exposer un message serveur non traduit", () => {
  assert.equal(apiErrorTranslationKey(new Error("API error 401")), "form.error.authorization");
  assert.equal(apiErrorTranslationKey(new Error("API error 409: already exists")), "form.error.duplicate");
  assert.equal(apiErrorTranslationKey(new Error("API error 400: required")), "form.error.invalid");
  assert.equal(apiErrorTranslationKey(new TypeError("Failed to fetch")), "form.error.connection");
  assert.equal(apiErrorTranslationKey(new Error("API error 503")), "form.error.server");
});
