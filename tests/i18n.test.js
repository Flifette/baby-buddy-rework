import test from "node:test";
import assert from "node:assert/strict";

import {
  LANGUAGES,
  TRANSLATIONS,
  localeFor,
  normalizeLanguage,
  translate,
} from "../baby-buddy-dashboard/frontend/src/utils/i18nCore.js";
import { formatTime } from "../baby-buddy-dashboard/frontend/src/utils/formatters.js";

test("les catalogues français et anglais contiennent exactement les mêmes clés", () => {
  const frenchKeys = Object.keys(TRANSLATIONS.fr).sort();
  const englishKeys = Object.keys(TRANSLATIONS.en).sort();
  assert.deepEqual(englishKeys, frenchKeys);
  assert.ok(frenchKeys.length >= 150);
});

test("la langue est persistable, normalisée et possède une locale explicite", () => {
  assert.deepEqual(LANGUAGES, ["fr", "en"]);
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("invalid"), "fr");
  assert.equal(localeFor("fr"), "fr-FR");
  assert.equal(localeFor("en"), "en-US");
});

test("les traductions simples et paramétrées fonctionnent dans les deux langues", () => {
  assert.equal(translate("nav.overview", {}, "fr"), "Aperçu");
  assert.equal(translate("nav.overview", {}, "en"), "Overview");
  assert.equal(translate("common.showMore", { count: 3 }, "fr"), "Afficher 3 de plus");
  assert.equal(translate("common.showMore", { count: 3 }, "en"), "Show 3 more");
});

test("une clé inconnue reste visible pour faciliter le diagnostic", () => {
  assert.equal(translate("missing.key", {}, "en"), "missing.key");
});

test("les heures anglaises utilisent AM/PM et les heures françaises restent sur 24 heures", () => {
  const afternoon = new Date(2026, 7, 12, 13, 14);
  assert.match(formatTime(afternoon, "en"), /PM/i);
  assert.doesNotMatch(formatTime(afternoon, "fr"), /AM|PM/i);
});

test("les chevauchements de sommeil et de sieste sont expliqués dans les deux langues", () => {
  const params = { start: "23:11", end: "00:11" };
  assert.match(translate("form.error.sleepOverlap", params, "fr"), /occurrence de sommeil.*23:11.*00:11/);
  assert.match(translate("form.error.napOverlap", params, "fr"), /sieste.*23:11.*00:11/);
  assert.match(translate("form.error.sleepOverlap", params, "en"), /sleep entry.*23:11.*00:11/);
  assert.match(translate("form.error.napOverlap", params, "en"), /nap.*23:11.*00:11/);
});

test("les bulles de validation sont traduites par le dashboard", () => {
  assert.equal(translate("form.validation.required", {}, "fr"), "Renseignez ce champ.");
  assert.equal(translate("form.validation.required", {}, "en"), "Fill in this field.");
  assert.equal(translate("form.validation.invalid", {}, "fr"), "Saisissez une valeur valide.");
  assert.equal(translate("form.validation.invalid", {}, "en"), "Enter a valid value.");
});

test("le symbole court des heures reste en minuscule dans les deux langues", () => {
  assert.equal(translate("unit.hourShort", {}, "fr"), "h");
  assert.equal(translate("unit.hourShort", {}, "en"), "h");
  assert.equal(translate("time.hoursAgo", { count: 2 }, "fr"), "il y a 2 h");
});
