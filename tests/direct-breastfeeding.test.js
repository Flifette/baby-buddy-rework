import test from "node:test";
import assert from "node:assert/strict";

import {
  feedingAmountForPayload,
  isDirectBreastfeeding,
  measurableFeedingAmount,
} from "../baby-buddy-dashboard/frontend/src/utils/feedings.js";
import {
  aggregateByPeriod,
  applyMilkWasteToFeedings,
  dailyFeedingGrowthTotals,
  dailyFeedingTotals,
  toFeedingTimeline,
} from "../baby-buddy-dashboard/frontend/src/utils/formatters.js";

const directMethods = ["left breast", "right breast", "both breasts"];

test("les repas au sein n’ont jamais de quantité mesurable", () => {
  directMethods.forEach((method) => {
    assert.equal(isDirectBreastfeeding(method), true);
    assert.equal(measurableFeedingAmount({ method, amount: 120 }), 0);
  });
  assert.equal(isDirectBreastfeeding("bottle"), false);
  assert.equal(measurableFeedingAmount({ method: "bottle", amount: 120 }), 120);
  assert.equal(feedingAmountForPayload("left breast", "120"), null);
  assert.equal(feedingAmountForPayload("bottle", "80"), 80);
});

test("une ancienne quantité au sein est ignorée dans les totaux et les graphiques", () => {
  const entries = [
    { start: "2026-08-08T08:00:00", method: "left breast", amount: 120 },
    { start: "2026-08-08T12:00:00", method: "bottle", amount: 80 },
  ];

  assert.equal(aggregateByPeriod(entries, "feeding", "all")[0].amount, 80);
  assert.equal(dailyFeedingTotals(entries, null)[0].amount, 80);
});

test("la croissance compte les allaitements au sein sans leur inventer de volume", () => {
  const entries = [
    { start: "2026-08-08T08:00:00", method: "left breast", amount: null },
    { start: "2026-08-08T10:00:00", method: "right breast", amount: 120 },
    { start: "2026-08-08T12:00:00", method: "bottle", amount: 80 },
    { start: "2026-08-09T08:00:00", method: "both breasts", amount: null },
  ];

  const series = dailyFeedingGrowthTotals(entries, null, "fr");
  assert.deepEqual(series.map(({ dateKey, amount, directCount }) => ({ dateKey, amount, directCount })), [
    { dateKey: "2026-08-08", amount: 80, directCount: 2 },
    { dateKey: "2026-08-09", amount: 0, directCount: 1 },
  ]);
});

test("le lait non bu ne s’applique qu’au biberon et l’allaitement reste sans volume", () => {
  const feedings = [
    { id: 1, start: "2026-08-08T08:00:00", end: "2026-08-08T08:20:00", type: "breast milk", method: "left breast", amount: 120 },
    { id: 2, start: "2026-08-08T09:00:00", end: "2026-08-08T09:20:00", type: "breast milk", method: "bottle", amount: 80 },
  ];
  const adjusted = applyMilkWasteToFeedings(feedings, [
    { time: "2026-08-08T09:30:00", amount: 20 },
  ]);

  assert.equal(adjusted[0].amount, null);
  assert.equal(adjusted[0]._milkWasteAmount, 0);
  assert.equal(adjusted[1].amount, 60);
  assert.equal(adjusted[1]._milkWasteAmount, 20);
});

test("la timeline affiche le côté mais jamais une quantité pour le sein", () => {
  const feeding = { start: "2026-08-08T08:00:00", method: "right breast", amount: 120 };
  const french = toFeedingTimeline([feeding], "mL", "fr")[0];
  const english = toFeedingTimeline([feeding], "mL", "en")[0];

  assert.equal(french.label, "Sein droit");
  assert.equal(english.label, "Right breast");
  assert.equal(french.amount, 0);
  assert.equal(english.amount, 0);
});
