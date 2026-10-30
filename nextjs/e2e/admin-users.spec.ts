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
const OWN_PASSWORD = "Oma-salasana3!";

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

// A browser context logged in as the test user, to see whether its session survives
async function loggedInContext(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await page.getByRole("textbox", { name: "Sähköposti" }).fill(email);
  await page.getByRole("textbox", { name: "Salasana" }).fill(password);
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await expect(page.getByText("Et ole kirjautunut jäsenalueelle")).toBeHidden();
  return { context, page };
}

// Whether the session still opens the member area (it redirects to / otherwise)
async function sessionWorks(page: Page) {
  await page.goto("/jasenalue/profiili");
  return new URL(page.url()).pathname === "/jasenalue/profiili";
}

// The admin makes a password reset link for the test user
async function makeResetLink(page: Page) {
  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Salasanan vaihtolinkki" }).click();
  const link = await page.getByLabel("Salasanan vaihtolinkki").inputValue();
  expect(link).toContain("/auth/uusi-salasana?token=");
  await page.goto("/admin/users");
  return link;
}

// Opens a reset link in a fresh browser and sets a new password with it
async function useResetLink(browser: Browser, link: string, password: string) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto(link);
  await page.getByLabel("Uusi salasana", { exact: true }).fill(password);
  await page.getByLabel("Uusi salasana uudelleen").fill(password);
  await page.getByRole("button", { name: "Vaihda salasana" }).click();
  return { context, page };
}

// Submits the change-password form on the profile page, already opened
async function submitPasswordChange(page: Page, current: string, next: string) {
  await page.getByLabel("Nykyinen salasana *").fill(current);
  await page.getByLabel("Uusi salasana *", { exact: true }).fill(next);
  await page.getByLabel("Vahvista uusi salasana *").fill(next);
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Vaihda salasana" }).click(),
  ]);
}

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
  const before = await loggedInContext(browser, EMAIL, PASSWORD);
  expect(await sessionWorks(before.page)).toBe(true);

  await page.goto("/admin/users");
  await userRow(page).getByRole("button", { name: "Poista käytöstä" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toBeVisible();
  expect(await canLogIn(browser, EMAIL, PASSWORD)).toBe(false);
  expect(await sessionWorks(before.page)).toBe(false);

  await userRow(page).getByRole("button", { name: "Palauta käyttöön" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toHaveCount(0);
  expect(await canLogIn(browser, EMAIL, PASSWORD)).toBe(true);
  // A session from before the lock doesn't come back with the account
  expect(await sessionWorks(before.page)).toBe(false);
  await before.context.close();
});

// Every revocation raises users.session_version; this changes only that, as
// the revocation time is compared in whole seconds and a login in the same
// second would pass it
test("a session ends when the account's session number changes", async ({ browser }) => {
  const member = await loggedInContext(browser, EMAIL, PASSWORD);
  expect(await sessionWorks(member.page)).toBe(true);
  await query("UPDATE users SET session_version = session_version + 1 WHERE id = $1", [userId]);
  expect(await sessionWorks(member.page)).toBe(false);
  await member.context.close();
});

test("a reset link sets a new password once, and ends the old sessions", async ({ page, browser }) => {
  const before = await loggedInContext(browser, EMAIL, PASSWORD);
  expect(await sessionWorks(before.page)).toBe(true);

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
  // Whoever was logged in before the reset is logged out
  expect(await sessionWorks(before.page)).toBe(false);
  await before.context.close();
});

test("a reset link made before a lock doesn't work after it", async ({ page, browser }) => {
  const link = await makeResetLink(page);
  await userRow(page).getByRole("button", { name: "Poista käytöstä" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toBeVisible();
  await userRow(page).getByRole("button", { name: "Palauta käyttöön" }).click();
  await expect(userRow(page).getByText("Poistettu käytöstä")).toHaveCount(0);

  const reset = await useResetLink(browser, link, PASSWORD);
  await expect(reset.page.getByText(/Linkki on vanhentunut tai jo käytetty/)).toBeVisible();
  await reset.context.close();
  expect(await canLogIn(browser, EMAIL, NEW_PASSWORD)).toBe(true);
});

test("changing the password ends an earlier reset link", async ({ page, browser }) => {
  const link = await makeResetLink(page);

  const member = await loggedInContext(browser, EMAIL, NEW_PASSWORD);
  await member.page.goto("/jasenalue/profiili");
  await member.page.getByRole("button", { name: "Vaihda salasana" }).click();
  await submitPasswordChange(member.page, NEW_PASSWORD, OWN_PASSWORD);
  await expect(member.page.getByText("Salasana vaihdettu")).toBeVisible();
  await member.context.close();

  const reset = await useResetLink(browser, link, PASSWORD);
  await expect(reset.page.getByText(/Linkki on vanhentunut tai jo käytetty/)).toBeVisible();
  await reset.context.close();
  expect(await canLogIn(browser, EMAIL, OWN_PASSWORD)).toBe(true);
});

// The same budget as logins, so a session left open somewhere can't be used
// to guess the password
test("changing the password allows ten wrong current passwords, then waits", async ({ browser }) => {
  const member = await loggedInContext(browser, EMAIL, OWN_PASSWORD);
  await member.page.goto("/jasenalue/profiili");
  await member.page.getByRole("button", { name: "Vaihda salasana" }).click();

  for (let n = 1; n <= 10; n++) {
    await submitPasswordChange(member.page, `Vaara-salasana${n}!`, NEW_PASSWORD);
    await expect(member.page.getByText("Nykyinen salasana on virheellinen.")).toBeVisible();
  }
  await submitPasswordChange(member.page, "Vaara-salasana11!", NEW_PASSWORD);
  await expect(
    member.page.getByText("Liian monta väärää salasanaa. Yritä uudelleen 15 minuutin kuluttua.")
  ).toBeVisible();
  await member.context.close();
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

  // Nothing left to do with it but delete it
  const row = page.getByRole("row").filter({ hasText: `poistettu-${userId}@salko.invalid` });
  await expect(row.getByText("Anonymisoitu")).toBeVisible();
  for (const name of ["Palauta käyttöön", "Muokkaa tietoja", "Anonymisoi"]) {
    await expect(row.getByRole("button", { name })).toHaveCount(0);
  }
});
