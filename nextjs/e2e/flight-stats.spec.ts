import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Statistics from the synthetic flight log. Other specs change flights at the
// same time, so the numbers checked here are ones they leave alone: the
// fixture's one intro-flight day in 2026. Typing in an earlier year writes
// aircraft_year_totals (for a made-up aircraft), so this runs only against a
// local database.
test.skip(!isLocalDatabase(), "writes aircraft_year_totals: local database only");
// One worker for the whole file: the clean-up below runs in every worker
// that takes tests from it, and would remove another test's row mid-way
test.describe.configure({ mode: "serial", timeout: 90_000 });
// Pages here wait for the sheet sync, which queues up while the other
// flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });

const removeYear = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    await pool.query("DELETE FROM aircraft_year_totals WHERE registration = 'OH-E2E'");
  } finally {
    await pool.end();
  }
};
test.beforeAll(removeYear);
test.afterAll(removeYear);

test.describe("treasurer", () => {
  test.skip(!accounts.treasurer, "no treasurer account");
  test.use({ storageState: accounts.treasurer?.storageState });

  test("sees a year's statistics and the Traficom report", async ({ page }) => {
    await page.goto("/admin/laskutus");
    await page.getByRole("link", { name: "Tilastot" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tilastot" })).toBeVisible();

    await page.getByLabel("Vuosi", { exact: true }).selectOption("2026");
    await page.getByRole("button", { name: "OH-CON" }).click();
    await expect(page).toHaveURL(/vuosi=2026&kone=OH-CON/);
    await expect(page.getByRole("heading", { name: "Lentotoimintailmoitus 2026" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "DTO-koulutus yhteensä" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Esittelylentopäivät 2026: 1 / 6" })).toBeVisible();

    const excel = await page.request.get("/admin/tilastot/xlsx?vuosi=2026&kone=OH-CON");
    expect(excel.status()).toBe(200);
    expect(excel.headers()["content-disposition"]).toContain("lentotilastot-2026-OH-CON.xlsx");
  });

  test("types in a year from before the flight log, and removes it", async ({ page }) => {
    await page.goto("/admin/tilastot");
    await page.getByLabel(/Aiemmat vuodet/).fill("Vuosi\tOH-E2E\n1999\t12:30");
    await page.getByRole("button", { name: "Tallenna vuodet" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tallennettu 1 vuoden tunnit." })).toBeVisible();
    const year = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "1999", exact: true }) });
    await expect(year).toContainText("12:30");

    await page.getByRole("button", { name: "Poista OH-E2E 1999" }).click();
    await expect(page.getByRole("columnheader", { name: "OH-E2E" })).toHaveCount(0);
  });
});

test.describe("admin", () => {
  test.skip(!accounts.admin, "no admin account");
  test.use({ storageState: accounts.admin?.storageState });

  test("the front page says what the flight log needs", async ({ page }) => {
    await page.goto("/admin");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Lentopäiväkirja" }) });
    await expect(panel.getByRole("link", { name: /Tarkistamatta/ })).toBeVisible();
    await expect(panel.getByRole("link", { name: /Esittelylentopäivät 2026/ })).toContainText("1 / 6 käytetty");
    await panel.getByRole("link", { name: /Laskutus/ }).click();
    await expect(page).toHaveURL(/\/admin\/laskutus/);
  });
});
