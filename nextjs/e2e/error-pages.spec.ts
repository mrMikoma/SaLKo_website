import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

// What people see when a page is missing or fails: Finnish text and a way on,
// never Next's built-in English page

// Drops the expected browser log lines (the 404 or the cut connection), so the
// fixture fails only on anything else
const ignore = (errors: string[], expected: RegExp) =>
  errors.splice(0, errors.length, ...errors.filter((error) => !expected.test(error)));

test("an unknown address says so on a phone, with a way back", async ({ page, browserErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/ei-tallaista-sivua");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Sivua ei löytynyt" })).toBeVisible();
  await expect(page.getByText("Osoitteessa ei ole sivua")).toBeVisible();

  await page.getByRole("link", { name: "Etusivulle" }).click();
  await expect(page).toHaveURL("/");
  ignore(browserErrors, /status of 404/);
});

test.describe("admin", () => {
  const admin = accounts.admin;
  test.skip(!admin, "no admin account: set E2E_ADMIN_* or use a local database");
  test.use({ storageState: admin?.storageState });

  test("a missing invoice keeps the admin menu", async ({ page, browserErrors }) => {
    const response = await page.goto("/admin/laskut/999999999");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Ei löytynyt" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Järjestelmän hallintapaneeli" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hallinnan etusivulle" })).toHaveAttribute("href", "/admin");
    ignore(browserErrors, /status of 404/);
  });
});

// Starting a Google login is the one action left to throw to the error pages:
// it leaves the site, so there is no form to keep (docs/UX_ERROR_PLAN.md).
// Its POST is dropped once; Playwright's `times` would also count the page
// loads that fall through.
const dropNextAction = async (page: Page) => {
  let left = 1;
  await page.route("**/*", (route) => {
    const request = route.request();
    if (left === 0 || request.method() !== "POST" || !request.headers()["next-action"]) return route.fallback();
    left -= 1;
    return route.abort("connectionreset");
  });
};

test("a failure inside a page shows the error page under the navbar", async ({ page, browserErrors }) => {
  await page.goto("/kalusto/varauskalenteri");
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await dropNextAction(page);
  await page.locator("#calendar-login").getByRole("button", { name: "Kirjaudu Google Workspacella" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Yhteys katkesi" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Tarkista verkkoyhteys" })).toBeInViewport();
  // The navbar stays, and trying again brings the page back
  await expect(page.getByRole("button", { name: "Jäsenalue" })).toBeVisible();
  await page.getByRole("button", { name: "Yritä uudelleen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Varauskalenteri" })).toBeVisible();
  ignore(browserErrors, /ERR_CONNECTION_RESET|Failed to fetch|Failed to load resource/);
});

test("a failure in the navbar shows the site-wide error page", async ({ page, browserErrors }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await dropNextAction(page);
  await page.getByRole("button", { name: "Kirjaudu Google Workspacella" }).click();

  // The navbar is in the root layout, so global-error.tsx replaces the page
  await expect(page.getByRole("heading", { level: 1, name: "Yhteys katkesi" })).toBeVisible();
  await expect(page.getByText("Tarkista verkkoyhteys")).toBeVisible();
  await page.getByRole("button", { name: "Yritä uudelleen" }).click();
  await expect(page.getByRole("button", { name: "Jäsenalue" })).toBeVisible();
  ignore(browserErrors, /ERR_CONNECTION_RESET|Failed to fetch|Failed to load resource/);
});
