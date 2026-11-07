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

test.describe("member", () => {
  const user = accounts.user;
  test.skip(!user, "no member account: set E2E_USER_* or use a local database");
  test.use({ storageState: user?.storageState });

  test("a save that loses its connection shows a Finnish error page", async ({ page, browserErrors }) => {
    // On a phone the save button is far down the form, and the page keeps its
    // scroll position
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/jasenalue/profiili");
    await page.getByRole("button", { name: "Muokkaa tietoja" }).click();

    // The save never reaches the server. Counted here: Playwright's `times`
    // would also count page loads that fall through.
    let left = 1;
    await page.route("**/jasenalue/profiili", (route) => {
      if (left === 0 || route.request().method() !== "POST") return route.fallback();
      left -= 1;
      return route.abort("connectionreset");
    });
    await page.getByRole("button", { name: "Tallenna muutokset" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Yhteys katkesi" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Tarkista verkkoyhteys" })).toBeInViewport();
    // The navbar stays, and trying again brings the page back
    await expect(page.getByRole("banner").or(page.getByRole("navigation")).first()).toBeVisible();
    await page.getByRole("button", { name: "Yritä uudelleen" }).click();
    await expect(page.getByRole("button", { name: "Muokkaa tietoja" })).toBeVisible();
    ignore(browserErrors, /ERR_CONNECTION_RESET|Failed to fetch|Failed to load resource/);
  });
});
