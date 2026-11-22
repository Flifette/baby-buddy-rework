import { spawn } from "node:child_process";
import { mkdtemp, copyFile, cp, mkdir, rm } from "node:fs/promises";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../baby-buddy-dashboard/", import.meta.url));
const ingress = "/api/hassio_ingress/browser-test";
const token = "browser-test-fixture-token";
const fixtureChild = { id: 1, first_name: "Fixture Child", birth_date: "2024-01-01" };
const list = (results) => ({ count: results.length, next: null, previous: null, results });
const reply = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function startBackend(directory, fixtureUrl) {
  const backend = spawn(process.env.BABY_BUDDY_TEST_PYTHON || "python", [
    "-m", "uvicorn", "backend.server:app", "--host", "127.0.0.1", "--port", "0", "--no-access-log", "--no-use-colors",
  ], {
    cwd: directory,
    env: {
      ...process.env,
      HA_ADDON_MODE: "true",
      BABY_BUDDY_URL: fixtureUrl,
      BABY_BUDDY_API_KEY: token,
      DEMO_MODE: "false",
      REFRESH_INTERVAL: "300",
      MILK_WASTE_FILE: join(directory, "milk-waste.json"),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let serverPid;
  const ready = new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`Test backend failed to start:\n${output}`)), 30_000);
    backend.stderr.setEncoding("utf8");
    backend.stderr.on("data", (chunk) => {
      output = (output + chunk).slice(-4000);
      const started = output.match(/Started server process \[(\d+)\]/);
      if (started) serverPid = Number(started[1]);
      const match = output.match(/Uvicorn running on (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    backend.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    backend.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Test backend exited with code ${code}:\n${output}`));
    });
  });
  async function stop() {
    if (!backend.pid || backend.exitCode !== null || backend.signalCode !== null) return;
    await new Promise((resolve) => {
      backend.once("exit", resolve);
      // The Windows venv launcher can wrap the actual server process.
      if (serverPid && serverPid !== backend.pid) {
        try {
          process.kill(serverPid);
          return;
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
      backend.kill();
    });
  }
  return { ready, stop };
}

export async function startFixture(test) {
  const directory = await mkdtemp(join(tmpdir(), "baby-buddy-browser-"));
  let backend;
  let backendUrl;
  const timer = { id: 12, child: 1, name: "sleep", start: new Date(Date.now() - 600_000).toISOString() };
  const feeding = {
    id: 2, child: 1, type: "formula", method: "bottle", amount: 37,
    start: new Date(Date.now() - 21_600_000).toISOString(),
    end: new Date(Date.now() - 21_300_000).toISOString(),
  };
  const state = { timer, feeding, sleepReadUnavailable: false, sleepWriteUnavailable: false, sleepPosts: [] };
  const sleep = [];

  const fixture = createServer(async (incoming, response) => {
    const path = incoming.url.split("?")[0];
    if (path.startsWith(`${ingress}/`)) {
      const proxied = request(new URL(incoming.url.slice(ingress.length), backendUrl), {
        method: incoming.method,
        headers: { ...incoming.headers, "X-Ingress-Path": ingress },
      }, (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
      });
      proxied.on("error", () => {
        if (response.headersSent) response.destroy();
        else reply(response, 502, { detail: "Fixture backend unavailable" });
      });
      response.on("close", () => proxied.destroy());
      incoming.pipe(proxied);
      return;
    }

    if (!path.startsWith("/api/")) return reply(response, 404, {});
    if (incoming.headers.authorization !== `Token ${token}`) return reply(response, 401, {});
    if (path === "/api/children/") return reply(response, 200, list([fixtureChild]));
    if (path === "/api/timers/") return reply(response, 200, list(state.timer ? [state.timer] : []));
    if (path === "/api/feedings/") return reply(response, 200, list([state.feeding]));
    if (path === "/api/sleep/") {
      if (incoming.method === "GET") {
        return state.sleepReadUnavailable
          ? reply(response, 503, { detail: "Fixture read unavailable" })
          : reply(response, 200, list(sleep));
      }
      if (incoming.method === "POST") {
        try {
          incoming.setEncoding("utf8");
          let body = "";
          for await (const chunk of incoming) body += chunk;
          const data = JSON.parse(body);
          state.sleepPosts.push(data);
          if (state.sleepWriteUnavailable) return reply(response, 504, { detail: "Fixture write unavailable" });
          if (!state.timer || data.timer !== state.timer.id || data.child !== fixtureChild.id) {
            return reply(response, 400, { detail: "Expected the active sleep timer and child" });
          }
          const entry = { ...data, id: 3, start: timer.start, end: new Date().toISOString(), duration: "00:10:00", nap: false };
          delete entry.timer;
          state.timer = null;
          sleep.push(entry);
          return reply(response, 201, entry);
        } catch {
          return reply(response, 400, { detail: "Invalid fixture request" });
        }
      }
    }
    if (incoming.method !== "GET") return reply(response, 405, {});
    reply(response, 200, list([]));
  });

  test.after(async () => {
    await backend?.stop();
    fixture.closeAllConnections();
    await new Promise((resolve) => fixture.close(resolve));
    await rm(directory, { recursive: true, force: true, maxRetries: 5 });
  });

  await mkdir(join(directory, "backend"));
  await copyFile(join(source, "backend", "server.py"), join(directory, "backend", "server.py"));
  await cp(join(source, "frontend", "dist"), join(directory, "static"), { recursive: true });
  const fixtureUrl = await listen(fixture);
  backend = startBackend(directory, fixtureUrl);
  backendUrl = await backend.ready;
  return { state, url: `${fixtureUrl}${ingress}/` };
}
