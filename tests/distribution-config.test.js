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
  const dockerfile = await read("baby-buddy-dashboard/Dockerfile");

  assert.match(repository, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(repository, /maintainer:\s*Flifette/);
  assert.match(addon, /slug:\s*"baby-buddy-dashboard"/);
  assert.match(addon, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(dockerfile, /amd64-base-python/);
  assert.match(dockerfile, /aarch64-base-python/);
  assert.doesNotMatch(dockerfile, /(armv7|armhf|i386)-base-python/);
});

test("Compose builds this repository and persists dashboard data", async () => {
  const compose = await read("docker-compose.yml");

  assert.doesNotMatch(compose, /mbentancour\/baby-buddy-dashboard:latest/);
  assert.doesNotMatch(compose, /image:\s*[^\n]+:latest/);
  assert.match(compose, /dashboard:[\s\S]*build:/);
  assert.match(compose, /dashboard_data:\/data/);
  assert.match(compose, /DASHBOARD_USERNAME/);
  assert.match(compose, /DASHBOARD_PASSWORD/);
});

test("standalone image keeps milk waste persistent and runs unprivileged", async () => {
  const dockerfile = await read("Dockerfile");

  assert.match(dockerfile, /MILK_WASTE_FILE=\/data\/milk-waste\.json/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(dockerfile, /USER dashboard/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /python:3\.12\.13-alpine3\.22@sha256:/);
});

test("security-sensitive build inputs are immutable", async () => {
  const build = await read("baby-buddy-dashboard/Dockerfile");
  const workflows = [
    await read(".github/workflows/ci.yml"),
    await read(".github/workflows/publish-image.yml"),
  ].join("\n");

  assert.match(build, /amd64-base-python:[^\n]+@sha256:/);
  assert.match(build, /aarch64-base-python:[^\n]+@sha256:/);
  assert.doesNotMatch(workflows, /uses:\s*[^\s#]+@v\d/);
  assert.match(workflows, /uses:\s*actions\/checkout@[0-9a-f]{40}/);
});

test("documentation and example configuration point to this distribution", async () => {
  const readme = await read("README.md");
  const environment = await read(".env.example");

  assert.match(readme, /github\.com\/Flifette\/baby-buddy-rework/);
  assert.match(environment, /BABY_BUDDY_URL=http:\/\/babybuddy:8000/);
  assert.match(environment, /DASHBOARD_PASSWORD=/);
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
  assert.match(guide, /entity_globs:[\s\S]*sensor\.baby_buddy_api_\*/);
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
