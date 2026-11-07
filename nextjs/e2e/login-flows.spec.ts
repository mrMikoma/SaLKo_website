import { Pool } from "pg";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase, seedAccount } from "./accounts";

// Logging in leads on to where the member was going, and a refused or failed
// login is explained in Finnish

const user = accounts.user;

async function logIn(page: Page) {
  await page.getByRole("textbox", { name: "Sähköposti" }).fill(user!.email);
  await page.getByRole("textbox", { name: "Salasana" }).fill(user!.password);
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
}

test.describe("logging in", () => {
  test.skip(!user, "no member account: set E2E_USER_* or use a local database");

  test("from a member page's login, the member goes on to that page", async ({ page }) => {
    await page.goto("/jasenalue/profiili");
    await expect(page).toHaveURL(/\/auth\/kirjaudu\?paluu=/);
    await expect(page.getByText("Sivu on vain jäsenille")).toBeVisible();
    await logIn(page);
    await expect(page).toHaveURL("/jasenalue/profiili");
    await expect(page.getByRole("heading", { level: 1, name: "Profiili" })).toBeVisible();
  });

  test("from the navbar, the member stays on the page", async ({ page }) => {
    await page.goto("/kerho/hinnasto");
    await page.getByRole("button", { name: "Jäsenalue" }).click();
    await logIn(page);
    await expect(page.getByText("Et ole kirjautunut jäsenalueelle")).toBeHidden();
    await expect(page).toHaveURL("/kerho/hinnasto");
  });
});

test("a refused Google login says why, with the password login under it", async ({ page }) => {
  await page.goto("/auth/virhe?error=AccessDenied");
  await expect(page.getByRole("heading", { level: 1, name: "Kirjautuminen estetty" })).toBeVisible();
  await expect(page.getByText("@savonlinnanlentokerho.fi-tunnuksilla")).toBeVisible();
  await expect(page.locator("main").getByRole("textbox", { name: "Salasana" })).toBeVisible();
});

test("a cancelled Google login comes back to the login page with a note", async ({ page }) => {
  await page.goto("/auth/kirjaudu?error=OAuthCallbackError");
  await expect(page.getByRole("alert").filter({ hasText: "Google-kirjautuminen keskeytyi" })).toBeVisible();
});

test.describe("member", () => {
  test.skip(!user, "no member account: set E2E_USER_* or use a local database");
  test.use({ storageState: user?.storageState });

  test("the login page sends a logged-in member straight on", async ({ page }) => {
    await page.goto("/auth/kirjaudu?paluu=%2Fkalusto");
    await expect(page).toHaveURL("/kalusto");
  });
});

// Its own account, whose sessions it ends: ending the shared member's would
// end the other tests' sessions too, and clearing the browser's cookies races
// with the responses that renew the session cookie
test.describe("an ended session", () => {
  test.skip(!isLocalDatabase(), "creates a user: local database only");
  const EMAIL = "e2e-session@salko.invalid";
  const PASSWORD = "Istunto-salasana1!";

  const query = async (sql: string, params: unknown[]) => {
    const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    try {
      await pool.query(sql, params);
    } finally {
      await pool.end();
    }
  };
  test.beforeAll(() => seedAccount({ role: "user", email: EMAIL, password: PASSWORD, seed: true, storageState: "" }));
  test.afterAll(() => query("DELETE FROM users WHERE email = $1", [EMAIL]));

  test("a save after the session ended offers a login and keeps the form", async ({ page }) => {
    await page.goto("/auth/kirjaudu?paluu=%2Fjasenalue%2Fprofiili");
    await page.getByRole("textbox", { name: "Sähköposti" }).fill(EMAIL);
    await page.getByRole("textbox", { name: "Salasana" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
    await expect(page).toHaveURL("/jasenalue/profiili");
    await page.getByRole("button", { name: "Muokkaa tietoja" }).click();
    await page.getByLabel("Asuinkunta").fill("Istunto-testi");

    // The session ends while the form is open, as after a password change
    await query("UPDATE users SET session_version = session_version + 1 WHERE email = $1", [EMAIL]);
    await page.getByRole("button", { name: "Tallenna muutokset" }).click();

    await expect(page.getByText("Istuntosi on päättynyt. Kirjaudu sisään uudelleen.")).toBeVisible();
    const notice = page.getByRole("alert").filter({ hasText: "Kirjaudu sisään uudessa välilehdessä" });
    const login = notice.getByRole("link", { name: /Kirjaudu sisään/ });
    await expect(login).toHaveAttribute("href", "/auth/kirjaudu?paluu=%2Fjasenalue%2Fprofiili");
    await expect(login).toHaveAttribute("target", "_blank");
    await expect(page.getByLabel("Asuinkunta")).toHaveValue("Istunto-testi");
  });
});
