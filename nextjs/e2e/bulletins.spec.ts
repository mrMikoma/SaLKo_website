import { Pool } from "pg";
import type { Browser } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Writes a bulletin, so it only runs against a local database and deletes it
// afterwards
test.skip(!isLocalDatabase(), "writes bulletins: local database only");
test.skip(!accounts.admin, "no admin account");
test.describe.configure({ mode: "serial" });
test.use({ storageState: accounts.admin?.storageState });

const TITLE = "E2E-tiedote luonnoksesta julkaisuun";

const removeBulletin = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    await pool.query("DELETE FROM bullets WHERE title = $1", [TITLE]);
  } finally {
    await pool.end();
  }
};
test.beforeAll(removeBulletin);
test.afterAll(removeBulletin);

// What an anonymous visitor sees on the home page and in the archive
async function publicTitles(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto("/tiedotteet");
    const archive = await page.getByText(TITLE).count();
    await page.goto("/");
    const home = await page.getByText(TITLE).count();
    return { archive, home };
  } finally {
    await context.close();
  }
}

test("a new bulletin is a draft until it is published", async ({ page, browser }) => {
  await page.goto("/admin/bulletins");
  await page.getByRole("button", { name: "+ Luo uusi tiedote" }).click();
  await page.getByLabel("Otsikko *").fill(TITLE);
  await page.getByLabel("Sisältö *").fill("Tämä on **testitiedote**.");

  // The preview shows the bulletin as members see it
  await page.getByRole("button", { name: "Esikatselu" }).click();
  await expect(page.locator("strong", { hasText: "testitiedote" })).toBeVisible();
  await page.getByRole("button", { name: "Muokkaa" }).first().click();

  await page.getByRole("button", { name: "Tallenna luonnoksena" }).click();
  await expect(page.getByText("Tiedote tallennettu luonnoksena")).toBeVisible();

  const card = page.locator("div.p-4").filter({ hasText: TITLE });
  await expect(card.getByText("Luonnos", { exact: true })).toBeVisible();
  expect(await publicTitles(browser)).toEqual({ archive: 0, home: 0 });

  await card.getByRole("button", { name: "Julkaise" }).click();
  await expect(page.getByText("Tiedote julkaistu")).toBeVisible();
  await expect(card.getByText(/^Julkaistu/)).toBeVisible();
  // On the home page the list is rendered for both desktop and mobile layouts
  const visible = await publicTitles(browser);
  expect(visible.archive).toBe(1);
  expect(visible.home).toBeGreaterThan(0);

  await card.getByRole("button", { name: "Palauta luonnokseksi" }).click();
  await expect(page.getByText("Tiedote palautettu luonnokseksi")).toBeVisible();
  expect(await publicTitles(browser)).toEqual({ archive: 0, home: 0 });
});

test("an empty title is refused", async ({ page }) => {
  await page.goto("/admin/bulletins");
  const card = page.locator("div.p-4").filter({ hasText: TITLE });
  await card.getByRole("button", { name: "Muokkaa", exact: true }).click();
  await page.getByLabel("Otsikko", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(page.getByText("Otsikko vaaditaan")).toBeVisible();
});
