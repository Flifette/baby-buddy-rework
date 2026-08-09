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
