import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

// The treasurer (laskuttaja) opens the flight log and billing, and nothing
// else of the admin site
test.skip(!accounts.treasurer, "no treasurer account: set E2E_TREASURER_* or use a local database");
test.use({ storageState: accounts.treasurer?.storageState });

test("the member menu leads to billing, not to the admin site", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await expect(page.getByRole("menuitem", { name: "Laskutus" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Admin sivut" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Laskutus" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Laskutus" })).toBeVisible();

  // Their own sections only
  const nav = page.getByRole("navigation").filter({ hasText: "Takaisin sivustolle" });
  await expect(nav.getByRole("link", { name: "Lennot" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Laskutus" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Käyttäjät" })).toHaveCount(0);
  await expect(nav).toContainText("Laskuttaja");
});

test("opens the flight log and billing settings", async ({ page }) => {
  await page.goto("/admin/lennot");
  await expect(page.getByRole("heading", { level: 1, name: "Lennot" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kirjaa paperisivu" })).toBeVisible();
  await page.goto("/admin/laskutus/asetukset");
  await expect(page.getByRole("heading", { level: 1, name: "Laskutuksen asetukset" })).toBeVisible();
});

// The flight log first: it is on before billing is (FEATURE_BILLING)
for (const path of ["/admin", "/admin/users", "/admin/bulletins"]) {
  test(`${path} sends them to the flight log`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL("/admin/lennot");
  });
}
