import test from "node:test";
import assert from "node:assert/strict";
import { calculateCurrentMilkStock } from "../baby-buddy-dashboard/frontend/src/utils/milkStock.js";
import { feedingPatchPayload } from "../baby-buddy-dashboard/frontend/src/utils/feedings.js";

test("le stock actuel reste cumulatif indépendamment de la période affichée", () => {
  const pumping = [{ amount: 100 }, { amount: 80 }, { amount: 58 }];
  const feedings = [
    { type: "breast milk", method: "bottle", amount: 30 },
    { type: "breast milk", method: "left breast", amount: 90 },
    { type: "formula", method: "bottle", amount: 50 },
  ];

  assert.equal(calculateCurrentMilkStock(pumping, feedings), 208);
});

test("modifier uniquement une quantité envoie un PATCH minimal", () => {
  const entry = {
    type: "breast milk",
    method: "bottle",
    amount: 60,
    start: "2026-08-25T14:00:00+02:00",
    end: "2026-08-25T14:20:00+02:00",
    notes: null,
  };

  assert.deepEqual(feedingPatchPayload(entry, {
    type: "breast milk",
    method: "bottle",
    amount: "70",
    start: "2026-08-25T14:00",
    end: "2026-08-25T14:20",
    originalStart: "2026-08-25T14:00",
    originalEnd: "2026-08-25T14:20",
    notes: "",
  }), { amount: 70 });
});

test("une modification des heures continue à être transmise explicitement", () => {
  const entry = { type: "breast milk", method: "bottle", amount: 60, notes: "" };
  const patch = feedingPatchPayload(entry, {
    type: "breast milk",
    method: "bottle",
    amount: "60",
    start: "2026-08-25T14:01",
    end: "2026-08-25T14:20",
    originalStart: "2026-08-25T14:00",
    originalEnd: "2026-08-25T14:20",
    notes: "",
  });

  assert.deepEqual(patch, { start: "2026-08-25T14:01:00" });
});
