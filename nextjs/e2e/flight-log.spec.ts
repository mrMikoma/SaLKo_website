import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Server actions here wait for the sheet sync, which runs one at a time and
// queues up while the other flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });

// Reads the synthetic flight log (e2e/fixtures/flight-sheet.json, see
// FLIGHT_SHEET_SOURCE in playwright.config.ts). Matching a pilot name writes
// pilot_aliases, so this only runs against a local database and removes the
// match afterwards.
test.skip(!isLocalDatabase(), "matches pilot names: local database only");
test.describe.configure({ mode: "serial" });

async function query(sql: string, params: unknown[] = []) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
  });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

const removeMatch = () => query("DELETE FROM pilot_aliases WHERE name_key = 'e2euser'");
test.beforeAll(removeMatch);
test.afterAll(removeMatch);

test.describe("admin", () => {
  test.skip(!accounts.admin, "no admin account");
  test.use({ storageState: accounts.admin?.storageState });

  test("sees the synced flights and what to check", async ({ page }) => {
    await page.goto("/admin/lennot");
    await expect(page.getByRole("heading", { level: 1, name: "Lennot" })).toBeVisible();
    await expect(page.getByText(/testiaineisto, ei oikea taulukko/)).toBeVisible();

    // Problems planted in the fixture
    await expect(page.getByText("Tuntematon lennon tarkoitus XYZ")).toBeVisible();
    await expect(page.getByText(/Sama lähtöaika kuin rivillä/)).toBeVisible();

    // The latest month is shown first: two flights in October 2026
    await expect(page.getByLabel("Kuukausi")).toHaveValue("2026-10");
    await expect(page.getByText("Yhteensä 2 lentoa")).toBeVisible();
  });

  test("syncs on demand", async ({ page }) => {
    await page.goto("/admin/lennot");
    await page.getByRole("button", { name: "Synkronoi nyt" }).click();
    await expect(page.getByText(/^Synkronoitu: \d+ muuttunutta riviä/)).toBeVisible();
  });

  test("matches a pilot name to a member", async ({ page }) => {
    await page.goto("/admin/lennot");
    // Each sheet name labels its own member select (whose options are members)
    const select = page.getByLabel("E2E user", { exact: true });
    await select.selectOption({ label: "E2E user" });
    await page
      .getByRole("listitem")
      .filter({ has: select })
      .getByRole("button", { name: "Yhdistä" })
      .click();

    await expect(page.getByText(/Yhdistetyt nimet \(\d+\)/)).toBeVisible();
    await expect(page.getByLabel("E2E user", { exact: true })).toHaveCount(0);
  });
});

test.describe("member", () => {
  test.skip(!accounts.user, "no member account");
  test.use({ storageState: accounts.user?.storageState });

  test("sees their own flights once the name is matched", async ({ page }) => {
    await page.goto("/jasenalue/lentopaivakirja");
    await expect(page.getByText("Vuonna 2026")).toBeVisible();
    // Five flights as PIC and one as the student, 4 h 33 min in all
    await expect(page.getByText("6 lentoa · 4:33 h")).toBeVisible();
    await expect(page.getByText(/oppilaana \/ SIC/)).toHaveCount(1);
  });
});
