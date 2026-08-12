import test from "node:test";
import assert from "node:assert/strict";

import { timerTypeFromName } from "../baby-buddy-dashboard/frontend/src/utils/timerAppearance.js";

test("le type du minuteur conserve la couleur de son activité", () => {
  assert.equal(timerTypeFromName("feeding"), "feeding");
  assert.equal(timerTypeFromName("Sleep"), "sleep");
  assert.equal(timerTypeFromName("Tummy time"), "tummy");
  assert.equal(timerTypeFromName("unknown"), "feeding");
});
