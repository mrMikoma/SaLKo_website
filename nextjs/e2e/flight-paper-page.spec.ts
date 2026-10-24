import { Pool } from "pg";
import type { Page } from "@playwright/test";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";
import { pastePage } from "./paperPage";

// Server actions here wait for the sheet sync, which runs one at a time and
// queues up while the other flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });
// Several page loads and server actions per test: slow under `next dev` with
// the whole suite running
test.describe.configure({ timeout: 90_000 });

// The biller types a page of the paper journey log into the synthetic flight
// log (FLIGHT_SHEET_SOURCE=fixture). The page confirms row 12, corrects row 13
// and adds a flight; row 13 is put back afterwards. The added flight stays in
// the dev server's copy of the fixture until it restarts, so it goes on a day
// of its own each run. Writes flight_status_changes: local database only.
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

// T. Testaaja on 18.4.2026 in the fixture: rows 12 and 13
const ROW_12 = "18.4.2026\tT. Testaaja\t\t1\tEFSA\tEFVR\t08.45\t09.20\t1\tMAT";
const ROW_13 = (landing: string) => `18.4.2026\tT. Testaaja\t\t1\tEFVR\tEFSA\t10.30\t${landing}\t1\tMAT`;

// A day in January–May 2025 and a half hour between 6 and 20 that earlier
// runs are unlikely to have used
const seconds = Math.floor(Date.now() / 1000);
const day = new Date(Date.UTC(2025, 0, 2 + (seconds % 150)));
const newDate = `${day.getUTCDate()}.${day.getUTCMonth() + 1}.2025`;
const slot = Math.floor(seconds / 150) % 28;
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}.${String(minutes % 60).padStart(2, "0")}`;
const takeoff = clock(6 * 60 + slot * 30);
const landing = clock(6 * 60 + slot * 30 + 30);

async function savePage(page: Page, lines: string[]) {
  await page.goto("/admin/lennot/tuonti");
  await pastePage(page, lines);
  await page.getByRole("button", { name: "Tarkista sivu" }).click();
  await expect(page.getByRole("button", { name: "Tallenna sivu taulukkoon" })).toBeEnabled();
  await page.getByRole("button", { name: "Tallenna sivu taulukkoon" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tallennettu" })).toBeVisible();
}

test("types a paper page, matching what pilots already entered", async ({ page }) => {
  // Row 13 as the fixture has it, in case an earlier run stopped halfway
  await savePage(page, [ROW_13("11.03")]);

  await page.goto("/admin/lennot");
  await page.getByRole("link", { name: "Kirjaa paperisivu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Paperisivun kirjaus" })).toBeVisible();
  await page.getByLabel("Sivunumero").fill("9001");
  await pastePage(page, [
    ROW_12,
    // Ditto marks for the date, the pilot and the purpose
    '"\t"\t\t1\tEFVR\tEFSA\t10.30\t11.05\t1\t"',
    `${newDate}\tP. Paperi\t\t1\tEFSA\tEFSA\t${takeoff}\t${landing}\t3\tHAR`,
  ]);
  await expect(page.getByLabel("Rivi 2: Päivä")).toHaveValue('"');
  await expect(page.getByText("3 lentoa", { exact: true })).toBeVisible();

  // The page's printed totals
  await page.getByLabel("Sivun summa paperilla").fill("1:38");
  await page.getByLabel("Laskut paperilla").fill("5");
  await expect(page.getByText("Aika eroaa 0:02.")).toBeVisible();
  await page.getByLabel("Sivun summa paperilla").fill("1:40");
  await expect(page.getByText("Täsmää paperin kanssa.")).toBeVisible();

  await expect(page.getByRole("button", { name: "Tallenna sivu taulukkoon" })).toBeDisabled();
  await page.getByRole("button", { name: "Tarkista sivu" }).click();
  await expect(page.getByText("Sama (rivi 12)")).toBeVisible();
  await expect(page.getByText("Eroaa (rivi 13)")).toBeVisible();
  await expect(page.getByText("lasku 11:03 → 11:05")).toBeVisible();
  await expect(page.getByLabel("Rivi 2: mitä tehdään")).toHaveValue("correct");
  await expect(page.getByText("Uusi", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tallenna sivu taulukkoon" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tallennettu" })).toHaveText(
    /Sivu 9001 tallennettu: 1 uutta, 1 vahvistettu, 1 korjattu\./
  );
  // Ready for the next page
  await expect(page.getByLabel("Sivunumero")).toHaveValue("9002");

  // The correction is in the sheet, checked, and the review log says why
  await page.goto("/admin/lennot?kuukausi=2026-04");
  const row13 = page.getByRole("row").filter({ has: page.getByLabel("Valitse rivi 13", { exact: true }) });
  await expect(row13).toContainText("10.30–11.05");
  await expect(row13).toContainText("Tarkistettu");
  await expect(row13.getByText("Paperisivu 9001, korjattu: lasku 11:03 → 11:05")).toBeVisible();

  // Put row 13 back; row 12, on the same day, is not on that page
  await page.goto("/admin/lennot/tuonti");
  await pastePage(page, [ROW_13("11.03")]);
  await page.getByRole("button", { name: "Tarkista sivu" }).click();
  await expect(page.getByText("Eroaa (rivi 13)")).toBeVisible();
  await expect(page.getByText(/^Rivi 12: 18\.4\.2026 T\. Testaaja/)).toBeVisible();
  await page.getByRole("button", { name: "Tallenna sivu taulukkoon" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tallennettu" })).toContainText(
    "0 uutta, 0 vahvistettu, 1 korjattu"
  );
});
