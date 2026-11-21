import { test, expect } from "@playwright/test";
import assert from "node:assert/strict";

test("committed feed data contains no long RSS excerpts or podcast descriptions", async ({ request }) => {
  const response = await request.get("/feed-data.json");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  for (const item of data.items) {
    assert.ok(item.summary.length <= 180, `${item.id} has a ${item.summary.length}-character excerpt`);
    if (item.type === "podcast") assert.equal(item.summary, "", `${item.id} republishes an episode description`);
  }
});

test("first stories are delivered in HTML even with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#story-results article")).toHaveCount(12);
  await expect(page.getByRole("heading", { name: "The source briefing" })).toBeVisible();
  await expect(page.getByText("Loading feed...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^All news/ })).toContainText("120");
  await context.close();
});

test("search, keyboard shortcut, categories, types, sorting and pagination work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#story-results article")).toHaveCount(12);
  await page.getByRole("button", { name: "Load more stories" }).click();
  await expect(page.locator("#story-results article")).toHaveCount(24);
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox", { name: "Search stories" });
  await expect(search).toBeFocused();
  await search.fill("sAlEsFoRcE");
  await expect(page.getByRole("heading", { name: "Search results" })).toBeVisible();
  await expect(page.locator("#story-results article").first()).toContainText(/salesforce/i);
  await search.fill("no-match-story-xyz");
  await expect(page.getByText("No stories match this view")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: /^CRM & Tech/ }).click();
  await expect(page.locator("#story-results article").first()).toContainText("CRM & Tech");
  await page.getByRole("button", { name: /^All news/ }).click();
  await page.getByRole("button", { name: "Podcasts", exact: true }).click();
  await expect(page.locator("#story-results article").first()).toContainText("Podcast");
  await expect(page.locator("#story-results article").first().getByRole("link", { name: "Listen at publisher" })).toHaveAttribute("target", "_blank");
  await page.getByRole("combobox", { name: "Sort stories" }).selectOption("score");
  await expect(page.getByText("It is not personalised or a quality rating.", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test("saving, persistent saved view and unsaving work", async ({ page }) => {
  await page.goto("/");
  const first = page.locator("#story-results article").first();
  const title = await first.getByRole("heading").innerText();
  await first.getByRole("button", { name: /^Save story:/ }).click();
  await page.getByRole("button", { name: /^Saved stories/ }).click();
  await expect(page.locator("#story-results article")).toHaveCount(1);
  await expect(page.locator("#story-results article").first().getByRole("heading")).toHaveText(title);
  await page.reload();
  await page.getByRole("button", { name: /^Saved stories/ }).click();
  await expect(page.locator("#story-results article")).toHaveCount(1);
  await page.getByRole("button", { name: /^Unsave story:/ }).click();
  await expect(page.getByText("Your reading list starts here")).toBeVisible();
});

test("saved state syncs across tabs", async ({ context, page }) => {
  await page.goto("/");
  const second = await context.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: /^Saved stories/ }).click();
  await expect(second.getByText("Your reading list starts here")).toBeVisible();
  await page.locator("#story-results article").first().getByRole("button", { name: /^Save story:/ }).click();
  await expect(second.locator("#story-results article")).toHaveCount(1);
});

test("corrupted or blocked local storage does not break the feed or in-tab saving", async ({ browser }) => {
  for (const mode of ["corrupt", "blocked", "quota"]) {
    const context = await browser.newContext();
    await context.addInitScript(mode => {
      if (mode === "corrupt") localStorage.setItem("revops-pulse-saved-v1", "broken-json");
      if (mode === "blocked") Object.defineProperty(window, "localStorage", { get() { throw new Error("Blocked"); } });
      if (mode === "quota") Storage.prototype.setItem = () => { throw new Error("Quota exceeded"); };
    }, mode);
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#story-results article").first().getByRole("button", { name: /^Save story:/ }).click();
    await page.getByRole("button", { name: /^Saved stories/ }).click();
    await expect(page.locator("#story-results article")).toHaveCount(1);
    await context.close();
  }
});

test("insight is always visible, clearly labelled, expandable, and not presented as reviewed", async ({ page }) => {
  await page.goto("/");
  const first = page.locator("#story-results article").first();
  await expect(first.getByText("Automated insight", { exact: false })).toBeVisible();
  await expect(first.getByText("Why it matters:", { exact: false })).toBeVisible();
  await expect(first.getByText("Low confidence; not editor-reviewed.", { exact: false })).toBeVisible();
  await expect(first.getByText("Strategic implication:", { exact: false })).not.toBeVisible();
  await first.locator("summary").click();
  await expect(first.getByText("Strategic implication:", { exact: false })).toBeVisible();
  await first.locator("summary").click();
  await expect(first.getByText("Strategic implication:", { exact: false })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Editor-reviewed briefings", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "How this feed works" }).click();
  await expect(page.getByRole("heading", { name: "Clear sources. Clear boundaries." })).toBeVisible();
});

test("mobile layout has no horizontal overflow and supports filters", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: /^GTM Trends/ }).click();
  await expect(page.locator("#story-results article").first()).toContainText("GTM Trends");
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("desktop screenshot", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
});
