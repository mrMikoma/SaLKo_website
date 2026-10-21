import { Pool } from "pg";
import type { Browser, Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Creates, deactivates and anonymises a throwaway user, so it only runs
// against a local database and deletes the user afterwards
test.skip(!isLocalDatabase(), "creates users: local database only");
test.skip(!accounts.admin, "no admin account");
test.describe.configure({ mode: "serial" });
test.use({ storageState: accounts.admin?.storageState });

const TYPED_EMAIL = "E2E-Kayttaja@Salko.invalid";
const EMAIL = TYPED_EMAIL.toLowerCase();
const FULL_NAME = "E2E Käyttäjä";
const PASSWORD = "Alku-salasana1!";
const NEW_PASSWORD = "Uusi-salasana2!";

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

let userId: string | null = null;

const removeUser = async () => {
  await query("DELETE FROM users WHERE lower(email) = $1 OR id = $2", [EMAIL, userId ?? ""]);
};
test.beforeAll(removeUser);
test.afterAll(removeUser);

const userRow = (page: Page) => page.getByRole("row").filter({ hasText: FULL_NAME });

// Logs in from a fresh browser context and tells whether it worked
async function canLogIn(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Jäsenalue" }).click();
    await page.getByRole("textbox", { name: "Sähköposti" }).fill(email);
    await page.getByRole("textbox", { name: "Salasana" }).fill(password);
    await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
    // Either the error shows, or the navbar stops saying "not logged in"
    const failed = page.getByText("Virheellinen sähköpostiosoite tai salasana.");
    const loggedOut = page.getByText("Et ole kirjautunut jäsenalueelle");
    await expect(async () => {
      expect((await failed.isVisible()) || !(await loggedOut.isVisible())).toBe(true);
    }).toPass({ timeout: 10_000 });
    return !(await failed.isVisible());
  } finally {
    await context.close();
  }
}

test("creates a user with the email in lower case", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "+ Luo uusi käyttäjä" }).click();
  await page.getByLabel("Sähköposti *").fill(TYPED_EMAIL);
  await page.getByLabel("Salasana *").fill(PASSWORD);
  await page.getByLabel("Käyttäjänimi *").fill("e2e-kayttaja");
  await page.getByLabel("Koko nimi *").fill(FULL_NAME);
  await page.getByRole("button", { name: "Luo käyttäjä" }).click();

  await expect(page.getByText("Käyttäjä luotu onnistuneesti")).toBeVisible();
  await expect(userRow(page)).toContainText(EMAIL);
  userId = (await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [EMAIL]))[0].id;
});

test("doesn't offer actions on your own row", async ({ page }) => {
  await page.goto("/admin/users");
  const own = page.getByRole("row").filter({ hasText: "(sinä)" });
  await expect(own.getByRole("button", { name: "Muokkaa tietoja" })).toBeVisible();
  await expect(own.getByRole("button", { name: "Muokkaa rooleja" })).toHaveCount(0);
  await expect(own.getByRole("button", { name: "Poista käytöstä" })).toHaveCount(0);
});

test("a deactivated user can't log in until reactivated", async ({ page, browser }) => {
  expect(await canLogIn(browser, TYPED_EMAIL, PASSWORD)).toBe(true);

  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Poista käytöstä" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toBeVisible();
  expect(await canLogIn(browser, EMAIL, PASSWORD)).toBe(false);

  await userRow(page).getByRole("button", { name: "Palauta käyttöön" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toHaveCount(0);
  expect(await canLogIn(browser, EMAIL, PASSWORD)).toBe(true);
});

test("a reset link sets a new password once", async ({ page, browser }) => {
  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Salasanan vaihtolinkki" }).click();
  const link = await page.getByLabel("Salasanan vaihtolinkki").inputValue();
  expect(link).toContain("/auth/uusi-salasana?token=");

  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const resetPage = await visitor.newPage();
  await resetPage.goto(link);
  await resetPage.getByLabel("Uusi salasana", { exact: true }).fill(NEW_PASSWORD);
  await resetPage.getByLabel("Uusi salasana uudelleen").fill(NEW_PASSWORD);
  await resetPage.getByRole("button", { name: "Vaihda salasana" }).click();
  await expect(resetPage.getByText("Salasana vaihdettu")).toBeVisible();

  // The same link doesn't work twice
  await resetPage.goto(link);
  await resetPage.getByLabel("Uusi salasana", { exact: true }).fill(PASSWORD);
  await resetPage.getByLabel("Uusi salasana uudelleen").fill(PASSWORD);
  await resetPage.getByRole("button", { name: "Vaihda salasana" }).click();
  await expect(resetPage.getByText(/Linkki on vanhentunut tai jo käytetty/)).toBeVisible();
  await visitor.close();

  expect(await canLogIn(browser, EMAIL, NEW_PASSWORD)).toBe(true);
});

test("anonymising removes the personal details", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Anonymisoi" }).click();
  await expect(page.getByText("Käyttäjä anonymisoitu")).toBeVisible();

  const [user] = await query<{ full_name: string; email: string; deactivated: boolean }>(
    "SELECT full_name, email, deactivated_at IS NOT NULL AS deactivated FROM users WHERE id = $1",
    [userId]
  );
  expect(user).toEqual({
    full_name: "Poistettu käyttäjä",
    email: `poistettu-${userId}@salko.invalid`,
    deactivated: true,
  });
});
