import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Server actions here wait for the sheet sync, which runs one at a time and
// queues up while the other flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });
// Several page loads and server actions per test: slow under `next dev` with
// the whole suite running
test.describe.configure({ timeout: 90_000 });

// The biller compares flights with the paper book and sets Tila, which is
// written into the synthetic flight log (FLIGHT_SHEET_SOURCE=fixture). The
// test puts the statuses back and removes its flight_status_changes rows, so
// it only runs against a local database.
test.skip(!isLocalDatabase(), "writes flight_status_changes: local database only");
test.skip(!accounts.admin, "no admin account");
test.use({ storageState: accounts.admin?.storageState });

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

const cleanUp = () =>
  query(
    `DELETE FROM flight_status_changes
     WHERE changed_by = (SELECT id FROM users WHERE email = $1)`,
    [accounts.admin!.email]
  );
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

// Two flights of T. Testaaja on 5.9.2026, Kirjattu in the fixture
const rows = ["Valitse rivi 27", "Valitse rivi 28"];

test("marks flights checked, and refuses rows that changed meanwhile", async ({ page }) => {
  // The fixture lives in the dev server's memory, so start from what it has
  // now, and from Kirjattu in case an earlier run stopped halfway
  await page.goto("/admin/lennot?kuukausi=2026-09");
  await page.getByRole("button", { name: "Synkronoi nyt" }).click();
  await expect(page.getByText(/^Synkronoitu: /)).toBeVisible();
  for (const row of rows) await page.getByLabel(row, { exact: true }).check();
  await page.getByRole("button", { name: "Palauta kirjatuksi" }).click();
  await expect(page.getByRole("status").filter({ hasText: /kirjattu\.|jo tämä tila/ })).toBeVisible();

  await page.goto("/admin/lennot?nakyma=tarkistamatta");
  await expect(page.getByRole("link", { name: /^Tarkistamatta \(\d+\)$/ })).toHaveAttribute(
    "aria-current",
    "page"
  );
  for (const row of rows) await page.getByLabel(row, { exact: true }).check();
  await expect(page.getByText("2 valittu")).toBeVisible();

  // As if someone edited the rows in the sheet after the page was opened:
  // the hashes the page sends no longer match the sheet
  await page.route("**/admin/lennot**", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.continue({
        postData: (request.postData() ?? "").replace(
          /"inputHash":"[0-9a-f]+"/g,
          '"inputHash":"0000000000000000"'
        ),
      });
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "Merkitse tarkistetuksi" }).click();
  // (Next's route announcer is an alert too)
  const refusal = page.getByRole("alert").filter({ hasText: "Rivejä on muutettu taulukossa" });
  await expect(refusal).toContainText("27, 28");
  await page.unrouteAll();
  // The selection starts over, so changed rows get a second look
  await expect(page.getByText("2 valittu")).toHaveCount(0);

  // With what the sheet really has, the change goes through
  for (const row of rows) await page.getByLabel(row, { exact: true }).check();
  await page.getByRole("button", { name: "Merkitse tarkistetuksi" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 lentoa: tarkistettu." })).toBeVisible();
  for (const row of rows) await expect(page.getByLabel(row, { exact: true })).toHaveCount(0);

  // The month view shows who checked them; flights already billed can't be picked
  await page.goto("/admin/lennot?kuukausi=2026-09");
  const checked = page.getByRole("row").filter({ has: page.getByLabel(rows[0], { exact: true }) });
  await expect(checked).toContainText("Tarkistettu");
  await expect(checked).toContainText("E2E admin");

  // Back to Kirjattu, as the fixture had them
  for (const row of rows) await page.getByLabel(row, { exact: true }).check();
  await page.getByRole("button", { name: "Palauta kirjatuksi" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 lentoa: kirjattu." })).toBeVisible();
  await expect(checked).toContainText("Kirjattu");

  // Korjattava asks what to fix; the reason shows with the flight
  await page.getByLabel(rows[0], { exact: true }).check();
  await page.getByRole("button", { name: "Korjattava", exact: true }).click();
  await page.getByLabel(/Mikä on korjattava/).fill("laskuaika eroaa paperista");
  await page.getByRole("button", { name: "Merkitse korjattavaksi" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 lento: korjattava." })).toBeVisible();
  await expect(checked).toContainText("laskuaika eroaa paperista");
  await page.getByLabel(rows[0], { exact: true }).check();
  await page.getByRole("button", { name: "Palauta kirjatuksi" }).click();
  await expect(checked).toContainText("Kirjattu");
  // Once Tila changes again, the old reason no longer shows
  await expect(checked).not.toContainText("laskuaika eroaa paperista");

  await page.goto("/admin/lennot?kuukausi=2026-01");
  await expect(page.getByLabel("Valitse rivi 3", { exact: true })).toBeDisabled();
});
