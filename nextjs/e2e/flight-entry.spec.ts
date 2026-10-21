import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Server actions here wait for the sheet sync, which runs one at a time and
// queues up while the other flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });
// Several page loads and server actions per test: slow under `next dev` with
// the whole suite running
test.describe.configure({ timeout: 90_000 });

// Logs two flights into the synthetic flight log (FLIGHT_SHEET_SOURCE=fixture)
// and undoes them. They go to OH-TST, a test aircraft with a tab of its own in
// the fixture: undo only works while a flight is the last row of its tab, and
// other specs add rows to OH-CON's tab at the same time. Logging gives the
// pilot a sheet name in pilot_aliases, so this only runs against a local
// database and cleans up after itself. It logs in as the admin:
// flight-log.spec.ts matches and unmatches the member's name at the same
// time, in another worker.
test.skip(!isLocalDatabase(), "writes pilot_aliases: local database only");
test.skip(!accounts.admin, "no admin account");
test.use({ storageState: accounts.admin?.storageState });
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

const cleanUp = async () => {
  const user = "(SELECT id FROM users WHERE email = $1)";
  const entries = `SELECT id FROM flight_log_web_entries WHERE user_id = ${user}`;
  const email = accounts.admin!.email;
  await query(`DELETE FROM sheet_flight_issues WHERE flight_id IN (${entries})`, [email]);
  await query(`DELETE FROM sheet_flights WHERE id IN (${entries})`, [email]);
  await query(`DELETE FROM flight_log_web_entries WHERE user_id = ${user}`, [email]);
  // "E2E admin" is written E.admin, or in full when that is taken
  await query("DELETE FROM pilot_aliases WHERE name_key IN ('eadmin', 'e2eadmin')");
};
test.beforeAll(async () => {
  await cleanUp();
  await query(
    `INSERT INTO aircraft_sheets (registration, sheet_name)
     VALUES ('OH-TST', 'OH-TST Matkapäiväkirja') ON CONFLICT DO NOTHING`
  );
});
test.afterAll(async () => {
  await cleanUp();
  await query("DELETE FROM sheet_flights WHERE registration = 'OH-TST'");
  await query("DELETE FROM aircraft_sheets WHERE registration = 'OH-TST'");
});

test("won't take a name that is already in the log", async ({ page }) => {
  // Both of the admin's names belong to pilots who aren't matched to anyone
  await query(
    `INSERT INTO pilot_aliases (name_key, name, user_id)
     VALUES ('eadmin', 'E.admin', NULL), ('e2eadmin', 'E2E admin', NULL)`
  );
  await page.goto("/jasenalue/lentopaivakirja/uusi");
  await page.getByLabel("Lentopäivä").fill("2025-06-14");
  await page.getByLabel("Lentoonlähtö", { exact: true }).fill("10.00");
  await page.getByLabel("Lasku", { exact: true }).fill("10.30");
  await page.getByRole("button", { name: "Tallenna lento" }).click();
  await expect(page.getByText(/ei ole yhdistetty sinuun/)).toBeVisible();
  await expect(page.getByText("Tallennettu lentopäiväkirjaan")).toHaveCount(0);
  await cleanUp();
});

test("logs a day's flights and undoes them", async ({ page, context }) => {
  // From the user menu to the form
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await page.getByRole("menuitem", { name: "Lentopäiväkirja" }).click();
  await page.getByRole("link", { name: "+ Kirjaa lento" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kirjaa lento" })).toBeVisible();

  await page.getByRole("button", { name: "OH-TST" }).click();
  await page.getByLabel("Lentopäivä").fill("2025-06-14");

  const first = page.getByRole("group", { name: "Lento", exact: true });
  await first.getByLabel("Minne").fill("EFJO");
  await first.getByLabel("Lentoonlähtö", { exact: true }).fill("1005");
  await first.getByLabel("Lasku", { exact: true }).fill("10.45");
  await first.getByRole("button", { name: "MAT", exact: true }).click();
  await expect(first.getByText("Ilmassa 0:40")).toBeVisible();

  // The next leg starts where the last one landed, with the same purpose
  await page.getByRole("button", { name: "+ Seuraava lento samana päivänä" }).click();
  const second = page.getByRole("group", { name: "Lento 2" });
  await expect(second.getByLabel("Mistä")).toHaveValue("EFJO");
  await second.getByLabel("Minne").fill("EFSA");
  await second.getByLabel("Lentoonlähtö", { exact: true }).fill("11:10");
  await second.getByLabel("Lasku", { exact: true }).fill("11,50");
  await expect(page.getByText("1:20", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tallenna 2 lentoa" }).click();
  const saved = page.getByRole("status");
  await expect(saved.getByText("Tallennettu lentopäiväkirjaan")).toBeVisible();
  await expect(saved.getByText("E.admin")).toBeVisible();
  await expect(page.getByText("EFSA–EFJO 10:05–10:45 MAT")).toBeVisible();
  await expect(page.getByText("EFJO–EFSA 11:10–11:50 MAT")).toBeVisible();

  // Synced right away: the flights are in the pilot's own list
  const ownFlights = await context.newPage();
  await ownFlights.goto("/jasenalue/lentopaivakirja");
  const june = ownFlights.getByRole("heading", { name: /kesäkuu 2025/i });
  await expect(june).toContainText("2 lentoa · 1:20");
  await ownFlights.close();

  // Undo removes the last flight first, then the one before it
  await page.getByRole("button", { name: "Kumoa viimeisin" }).click();
  await expect(page.getByText("EFJO–EFSA 11:10–11:50 MAT")).toHaveCount(0);
  await expect(page.getByText("EFSA–EFJO 10:05–10:45 MAT")).toBeVisible();
  await page.getByRole("button", { name: "Kumoa viimeisin" }).click();
  await expect(page.getByRole("button", { name: "Tallenna lento" })).toBeVisible();

  await page.goto("/jasenalue/lentopaivakirja");
  await expect(page.getByRole("heading", { name: /kesäkuu 2025/i })).toHaveCount(0);
});
