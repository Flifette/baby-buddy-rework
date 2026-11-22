import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium, devices, webkit } from "playwright";
import { startFixture } from "./fixture.mjs";

const engines = [
  { name: "Mobile Chromium", browserType: chromium, device: devices["Pixel 7"], language: "en" },
  { name: "Mobile WebKit", browserType: webkit, device: devices["iPhone 13"], language: "fr" },
];

for (const { name, browserType, device, language } of engines) {
  test(`${name} keeps its data and can save a timer after a temporary failure`, { timeout: 90_000 }, async (t) => {
    const { state, url } = await startFixture(t);
    const browser = await browserType.launch();
    try {
      const french = language === "fr";
      const context = await browser.newContext({ ...device, locale: french ? "fr-FR" : "en-US" });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.addInitScript((lang) => localStorage.setItem("baby-buddy-language", lang), language);
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const child = page.getByRole("heading", { name: "Fixture Child", exact: true });
      const timer = page.locator(".timer-bar");
      const refresh = page.getByRole("button", { name: french ? "Actualiser" : "Refresh", exact: true });
      const syncError = page.getByRole("status").and(page.locator(".sync-error"));
      const feeding = page.getByText("37 mL", { exact: true });
      await child.waitFor();
      await timer.waitFor();
      await feeding.waitFor();
      assert.equal(await page.evaluate(() => document.baseURI), url);

      state.sleepReadUnavailable = true;
      await refresh.tap();
      await syncError.waitFor();
      assert.equal(await child.isVisible(), true);
      assert.equal(await timer.isVisible(), true);
      assert.equal(await feeding.isVisible(), true);
      state.sleepReadUnavailable = false;
      await refresh.tap();
      await syncError.waitFor({ state: "hidden" });

      await context.setOffline(true);
      await refresh.tap();
      await syncError.waitFor();
      assert.equal(await timer.isVisible(), true);
      assert.equal(await feeding.isVisible(), true);
      state.feeding.amount = 53;
      let markPending;
      let releaseRead;
      const readPending = new Promise((resolve) => { markPending = resolve; });
      const readGate = new Promise((resolve) => { releaseRead = resolve; });
      await page.route("**/api/baby-buddy/pumping/**", async (route) => {
        markPending();
        await readGate;
        await route.continue();
      }, { times: 1 });
      await context.setOffline(false);
      await syncError.waitFor({ state: "hidden" });
      await page.getByText("53 mL", { exact: true }).waitFor();
      await readPending;

      // Simulate leaving and restoring the WebView without reloading it.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      state.feeding.amount = 61;
      assert.equal(await page.getByText("53 mL", { exact: true }).isVisible(), true);
      await page.evaluate(() => {
        delete document.visibilityState;
        window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      });
      releaseRead();
      await page.getByText("61 mL", { exact: true }).waitFor();

      const save = page.getByRole("button", { name: french ? "Enregistrer le sommeil" : "Save sleep", exact: true });
      const note = page.getByPlaceholder(french ? "Facultative" : "Optional", { exact: true });
      const formError = page.getByRole("alert").filter({
        hasText: french ? /avant de réessayer/i : /before trying again/i,
      });
      await timer.locator(".timer-save-btn").tap();
      await page.getByRole("dialog").getByRole("button", { name: french ? "Fermer" : "Close", exact: true }).tap();
      await save.waitFor({ state: "hidden" });
      assert.equal(await timer.isVisible(), true);
      assert.deepEqual(state.sleepPosts, []);

      state.sleepWriteUnavailable = true;
      await timer.locator(".timer-save-btn").tap();
      await note.fill("Browser fixture note");
      await save.tap();
      await formError.waitFor();
      assert.equal(await note.inputValue(), "Browser fixture note");
      assert.deepEqual(state.sleepPosts, [{ child: 1, timer: 12, notes: "Browser fixture note" }]);

      state.sleepWriteUnavailable = false;
      await save.tap();
      await save.waitFor({ state: "hidden" });
      await timer.waitFor({ state: "hidden" });
      assert.equal(state.sleepPosts.length, 2, "Only two explicit taps submitted a sleep entry");
      assert.equal(state.timer, null);
      assert.deepEqual(pageErrors, []);
    } finally {
      await browser.close();
    }
  });
}
