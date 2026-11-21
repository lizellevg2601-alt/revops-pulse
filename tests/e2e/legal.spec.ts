import { test, expect } from "@playwright/test";

const email = "admin@gtmautomationacademy.com";

test("legal and contact links are reachable from the footer", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Sources & editorial approach" })).toHaveAttribute("href", "/about/");
  await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms/");
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy/");
  const contact = footer.getByRole("link", { name: "For publishers" });
  await expect(contact).toHaveAttribute("href", /^mailto:admin@gtmautomationacademy\.com\?subject=/);
  await expect(contact).toHaveAttribute("href", /takedown%20request/);
});

test("terms and privacy pages render with the real contact address", async ({ page }) => {
  for (const [path, heading] of [["/terms/", "Terms of Use"], ["/privacy/", "Privacy Policy"]]) {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Effective 21 November 2026", { exact: false })).toBeVisible();
      await expect(page.getByRole("link", { name: email })).toHaveAttribute("href", /^mailto:/);
      await expect(page.getByRole("link", { name: "Back to RevOps Pulse" })).toHaveAttribute("href", "/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test("the methodology page links to the legal pages and contact address", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("heading", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: email })).toHaveAttribute("href", /^mailto:/);
  await expect(page.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms/");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy/");
});
