import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCurrentMilkStock } from "../baby-buddy-dashboard/frontend/src/utils/milkStock.js";
import { feedingPatchPayload, shiftFeedingEndWithStart } from "../baby-buddy-dashboard/frontend/src/utils/feedings.js";
import { localDatetimeToApi } from "../baby-buddy-dashboard/frontend/src/utils/datetime.js";
import { parsePumpingNote, pumpingPatchPayload } from "../baby-buddy-dashboard/frontend/src/utils/pumping.js";

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

  assert.deepEqual(patch, { start: localDatetimeToApi("2026-08-25T14:01") });
});

test("déplacer le début d’un repas conserve sa durée", () => {
  const end = shiftFeedingEndWithStart(
    "2026-08-27T15:00",
    "2026-08-27T15:15",
    "2026-08-27T13:00",
  );
  assert.equal(end, "2026-08-27T13:15");

  assert.deepEqual(feedingPatchPayload({
    type: "breast milk",
    method: "bottle",
    amount: 70,
    notes: "",
  }, {
    type: "breast milk",
    method: "bottle",
    amount: "70",
    start: "2026-08-27T13:00",
    end,
    originalStart: "2026-08-27T15:00",
    originalEnd: "2026-08-27T15:15",
    notes: "",
  }), {
    start: localDatetimeToApi("2026-08-27T13:00"),
    end: localDatetimeToApi("2026-08-27T13:15"),
  });
});

test("modifier un tirage envoie un PATCH minimal avec des heures absolues", () => {
  const parsed = parsePumpingNote("Sein : Les deux seins");
  assert.deepEqual(parsed, { side: "both", note: "" });

  assert.deepEqual(pumpingPatchPayload({ amount: 100 }, {
    amount: "100",
    side: "both",
    start: "2026-08-27T16:15",
    end: "2026-08-27T16:30",
    originalStart: "2026-08-27T16:30",
    originalEnd: "2026-08-27T16:45",
    notes: "",
    originalSide: "both",
    originalNotes: "",
    serializedNotes: "Sein : Les deux seins",
  }), {
    start: localDatetimeToApi("2026-08-27T16:15"),
    end: localDatetimeToApi("2026-08-27T16:30"),
  });
});

test("tous les formulaires temporels envoient un instant absolu", () => {
  const files = [
    "App.jsx",
    "components/forms/DiaperForm.jsx",
    "components/forms/FeedingForm.jsx",
    "components/forms/MilkWasteForm.jsx",
    "components/forms/NoteForm.jsx",
    "components/forms/PumpingForm.jsx",
    "components/forms/SleepForm.jsx",
    "components/forms/TummyTimeForm.jsx",
  ];
  const sourceRoot = new URL("../baby-buddy-dashboard/frontend/src/", import.meta.url);

  for (const file of files) {
    const source = readFileSync(new URL(file, sourceRoot), "utf8");
    assert.match(source, /localDatetimeToApi/);
    assert.doesNotMatch(source, /\$\{(?:start|end|time|e\.target\.value)\}:00/);
  }
});
