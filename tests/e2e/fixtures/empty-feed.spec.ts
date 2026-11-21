import { test, expect } from "@playwright/test";

test("a temporary feed outage shows an honest empty state without breaking the page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No stories in this view right now.", { exact: false })).toBeVisible();
  await expect(page.getByText("The source briefing")).toHaveCount(0);
  await page.getByRole("button", { name: "Browse all news" }).click();
  await expect(page.getByRole("heading", { name: "The source briefing" })).toHaveCount(0);
});
