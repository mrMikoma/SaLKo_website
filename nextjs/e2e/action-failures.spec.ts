import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

// A save or a fetch whose call fails (a lost connection, a page from before a
// deploy) is explained where it happened, and what was typed stays

// Drops the expected browser log lines, so the fixture fails only on anything else
const ignore = (errors: string[], expected: RegExp) =>
  errors.splice(0, errors.length, ...errors.filter((error) => !expected.test(error)));

// Server action calls are POSTs with a Next-Action header; page loads aren't.
// Counted here: Playwright's `times` would also count the page loads that
// fall through, and then let the action pass.
const failActions = async (page: Page, how: "drop" | "outdated", times = 1) => {
  let left = times;
  await page.route("**/*", (route) => {
    const request = route.request();
    if (left === 0 || request.method() !== "POST" || !request.headers()["next-action"]) return route.fallback();
    left -= 1;
    // What Next answers for an action the new deploy doesn't have
    return how === "drop"
      ? route.abort("connectionreset")
      : route.fulfill({
          status: 404,
          headers: { "x-nextjs-action-not-found": "1", "content-type": "text/plain" },
          body: "Server action not found.",
        });
  });
};

test("the calendar from before a deploy asks for a reload", async ({ page, browserErrors }) => {
  await failActions(page, "outdated");
  await page.goto("/kalusto/varauskalenteri");

  const error = page.getByRole("alert").filter({ hasText: "Varausten lataaminen epäonnistui" });
  await expect(error).toContainText("Sivusto on päivittynyt");
  // Not Next's English message, and no retry that can't help
  await expect(error).not.toContainText("Server Action");
  await expect(error.getByRole("button", { name: "Lataa sivu uudelleen" })).toBeVisible();
  await expect(error.getByRole("button", { name: "Yritä uudelleen" })).toHaveCount(0);
  // The site-wide notice says the same, for saves anywhere on the page
  await expect(page.getByRole("alert").filter({ hasText: "Kopioi pitkät tekstit talteen" })).toBeVisible();

  // Reloading loads the bookings again
  await error.getByRole("button", { name: "Lataa sivu uudelleen" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Varausten lataaminen epäonnistui" })).toHaveCount(0);
  ignore(browserErrors, /status of 404/);
});

test.describe("member", () => {
  const user = accounts.user;
  test.skip(!user, "no member account: set E2E_USER_* or use a local database");
  test.use({ storageState: user?.storageState });

  test("a profile save that loses its connection says so and keeps what was typed", async ({
    page,
    browserErrors,
  }) => {
    await page.goto("/jasenalue/profiili");
    await page.getByRole("button", { name: "Muokkaa tietoja" }).click();
    await page.getByLabel("Asuinkunta").fill("Kerimäki-testi");

    await failActions(page, "drop");
    await page.getByRole("button", { name: "Tallenna muutokset" }).click();

    await expect(page.getByText("Yhteys palvelimeen katkesi. Tarkista verkkoyhteys")).toBeVisible();
    // Still the form, not the error page, and the typed value is there
    await expect(page.getByRole("heading", { level: 1, name: "Profiili" })).toBeVisible();
    await expect(page.getByLabel("Asuinkunta")).toHaveValue("Kerimäki-testi");
    // Leave the account as it was
    await page.getByRole("button", { name: "Takaisin" }).click();
    ignore(browserErrors, /ERR_CONNECTION_RESET|Failed to fetch|Failed to load resource/);
  });
});

test.describe("admin", () => {
  const admin = accounts.admin;
  test.skip(!admin, "no admin account: set E2E_ADMIN_* or use a local database");
  test.use({ storageState: admin?.storageState });

  test("a bulletin that can't be saved stays in the editor", async ({ page, browserErrors }) => {
    await page.goto("/admin/bulletins");
    await page.getByRole("button", { name: "+ Luo uusi tiedote" }).click();
    await page.getByLabel("Otsikko *").fill("E2E-tiedote ilman yhteyttä");
    await page.getByLabel("Sisältö *").fill("Pitkä teksti, joka ei saa kadota.");

    await failActions(page, "drop");
    await page.getByRole("button", { name: "Tallenna luonnoksena" }).click();

    await expect(page.getByText("Yhteys palvelimeen katkesi")).toBeVisible();
    await expect(page.getByLabel("Otsikko *")).toHaveValue("E2E-tiedote ilman yhteyttä");
    await expect(page.getByLabel("Sisältö *")).toHaveValue("Pitkä teksti, joka ei saa kadota.");
    ignore(browserErrors, /ERR_CONNECTION_RESET|Failed to fetch|Failed to load resource/);
  });
});
