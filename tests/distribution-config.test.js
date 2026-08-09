import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("repository metadata identifies the rework repository", async () => {
  const repository = await read("repository.yaml");
  const addon = await read("baby-buddy-dashboard/config.yaml");
  const build = await read("baby-buddy-dashboard/build.yaml");

  assert.match(repository, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(repository, /maintainer:\s*Flifette/);
  assert.match(addon, /slug:\s*"baby-buddy-dashboard"/);
  assert.match(addon, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(build, /amd64-base-python/);
  assert.match(build, /aarch64-base-python/);
  assert.doesNotMatch(build, /(armv7|armhf|i386)-base-python/);
});

test("Compose builds this repository and persists dashboard data", async () => {
  const compose = await read("docker-compose.yml");

  assert.doesNotMatch(compose, /mbentancour\/baby-buddy-dashboard:latest/);
  assert.match(compose, /dashboard:[\s\S]*build:/);
  assert.match(compose, /dashboard_data:\/data/);
});

test("standalone image keeps milk waste persistent and runs unprivileged", async () => {
  const dockerfile = await read("Dockerfile");

  assert.match(dockerfile, /MILK_WASTE_FILE=\/data\/milk-waste\.json/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(dockerfile, /USER dashboard/);
  assert.match(dockerfile, /HEALTHCHECK/);
});

test("documentation and example configuration point to this distribution", async () => {
  const readme = await read("README.md");
  const environment = await read(".env.example");

  assert.match(readme, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(environment, /BABY_BUDDY_URL=http:\/\/babybuddy:8000/);
  assert.doesNotMatch(environment, /BABY_BUDDY_URL=http:\/\/localhost:8000/);
});

test("the documented screenshot gallery contains valid JPEG files", async () => {
  const readme = await read("README.md");
  const screenshots = [
    "overview-current.jpg",
    "growth-current.jpg",
    "day-timeline.jpg",
    "routine-overview.jpg",
    "notes-view.jpg",
    "tile-settings.jpg",
  ];

  for (const filename of screenshots) {
    assert.match(readme, new RegExp(`screenshots/${filename}`));
    const image = await readFile(path.join(root, "screenshots", filename));
    assert.deepEqual([...image.subarray(0, 2)], [0xff, 0xd8]);
    assert.deepEqual([...image.subarray(-2)], [0xff, 0xd9]);
  }
});

test("Home Assistant examples and their screenshots remain linked", async () => {
  const readme = await read("README.md");
  const readmeFr = await read("README.fr.md");
  const guide = await read("examples/home-assistant/README.md");
  const screenshots = [
    "activity-timer.jpg",
    "action-menu.jpg",
    "feeding-form.jpg",
    "quick-actions.jpg",
  ];

  assert.match(readme, /examples\/home-assistant\/README\.md/);
  assert.match(readmeFr, /examples\/home-assistant\/README\.md/);
  assert.match(guide, /babybuddy\.add_feeding/);
  assert.match(guide, /integration_entities\('babybuddy'\)/);
  assert.doesNotMatch(guide, /REMPLACER_PAR_LE_JETON_API[^\n]*[A-Za-z0-9]{20,}/);

  for (const filename of screenshots) {
    assert.match(guide, new RegExp(`screenshots/${filename}`));
    const image = await readFile(path.join(root, "examples", "home-assistant", "screenshots", filename));
    assert.deepEqual([...image.subarray(0, 2)], [0xff, 0xd8]);
    assert.deepEqual([...image.subarray(-2)], [0xff, 0xd9]);
  }
});

test("the project acknowledgements remain visible in both readmes", async () => {
  const readme = await read("README.md");
  const readmeFr = await read("README.fr.md");

  for (const document of [readme, readmeFr]) {
    assert.match(document, /mbentancour\/baby-buddy-dashboard/);
    assert.match(document, /herveaurel\/HomeAssistant/);
    assert.match(document, /Codex/i);
  }
});
