import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";
import { pastePage } from "./paperPage";

// Server actions here wait for the sheet sync, which runs one at a time and
// queues up while the other flight-log specs run in parallel
const expect = baseExpect.configure({ timeout: 20_000 });
// Several page loads and server actions per test: slow under `next dev` with
// the whole suite running
test.describe.configure({ timeout: 90_000 });

// A billing period from start to end: flights typed in from a paper page,
// a pilot name matched to the e2e member, the equipment fee, closing, payment
// and the CSV. Each run uses a day in 2024 and a pilot name of its own; the
// flights stay in the dev server's copy of the fixture, and the database rows
// are removed afterwards. Local database only. Run as the treasurer, who
// does the whole job without the rest of the admin site.
test.skip(!isLocalDatabase(), "writes billing rows: local database only");
test.skip(!accounts.treasurer || !accounts.user, "needs the treasurer and member accounts");
test.use({ storageState: accounts.treasurer?.storageState });

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

const seconds = Math.floor(Date.now() / 1000);
const day = new Date(Date.UTC(2024, 0, 1 + (seconds % 366)));
const isoDay = day.toISOString().slice(0, 10);
const paperDay = `${day.getUTCDate()}.${day.getUTCMonth() + 1}.2024`;
const pilot = `Laskutus Testi ${seconds}`;
const period = `E2E-${seconds}`;

const cleanUp = async () => {
  await query("DELETE FROM billing_periods WHERE name LIKE 'E2E-%'");
  await query(
    `DELETE FROM equipment_fee_seasons
     WHERE season = 2024 AND user_id = (SELECT id FROM users WHERE email = $1)`,
    [accounts.user!.email]
  );
  await query("DELETE FROM pilot_aliases WHERE name_key LIKE 'laskutustesti%'");
};
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test("bills a period: minimum, unbilled flights, closing and payment", async ({ page, browser }) => {
  page.on("dialog", (dialog) => dialog.accept());

  // A local 20-minute flight (billed 30), someone's transfer flight in
  // between, and a 40-minute trip
  await page.goto("/admin/lennot/tuonti");
  await pastePage(page, [
    `${paperDay}\t${pilot}\t\t1\tEFSA\tEFSA\t10.00\t10.20\t2\tHAR`,
    `"\tP. Siirtäjä\t\t1\tEFSA\tEFSA\t11.00\t11.30\t1\tSII`,
    `"\t${pilot}\t\t1\tEFSA\tEFJO\t12.00\t12.40\t1\tMAT`,
  ]);
  await page.getByRole("button", { name: "Tarkista sivu" }).click();
  await expect(page.getByText("Uusi", { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Tallenna sivu taulukkoon" }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 uutta" })).toBeVisible();

  // A one-day period; the pilot's name isn't matched yet
  await page.goto("/admin/laskutus");
  await page.getByLabel("Nimi (myös taulukon Laskutusjakso)").fill(period);
  await page.getByLabel("Alkaa").fill(isoDay);
  await page.getByLabel("Päättyy").fill(isoDay);
  await page.getByRole("button", { name: "Luo jakso" }).click();
  // The first visit compiles the page under `next dev`, which takes a while
  await expect(page.getByRole("heading", { level: 1, name: `Laskutusjakso ${period}` })).toBeVisible({
    timeout: 30_000,
  });
  const periodUrl = page.url();
  await expect(page.getByText(`Nimeä "${pilot}" ei ole yhdistetty jäseneen`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sulje jakso" })).toBeDisabled();

  // The name is the e2e member, who paid the 2024 equipment fee
  await page.goto("/admin/lennot");
  const select = page.getByLabel(pilot, { exact: true });
  await select.selectOption({ label: "E2E user" });
  await page.getByRole("listitem").filter({ has: select }).getByRole("button", { name: "Yhdistä" }).click();
  await expect(page.getByLabel(pilot, { exact: true })).toHaveCount(0);
  await page.goto("/admin/laskutus/asetukset?kausi=2024");
  const fee = page.getByRole("checkbox", { name: /^E2E user/ });
  await fee.check();
  await expect(fee).toBeChecked();

  // 20 + 10 (minimum) + 40 minutes at 3,10 €/min
  await page.goto(periodUrl);
  await expect(page.getByText("Jakson voi sulkea")).toBeVisible();
  const payer = page.locator("summary").filter({ hasText: "E2E user" });
  await expect(payer).toContainText("2 lentoa");
  await expect(payer).toContainText("217,00 €");
  await payer.click();
  await expect(page.getByText("Minimilaskutus 30 min (lento 20 min)")).toBeVisible();
  await expect(page.getByText("Ei laskuteta: 1 lentoa, 0:30 h")).toBeVisible();

  await page.getByRole("button", { name: "Sulje jakso" }).click();
  // The page turns into the closed period
  await expect(page.getByText(/ · suljettu \d/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Yhteensä 217,00 €")).toBeVisible();
  const sheet = await query(
    `SELECT status, billing_period FROM sheet_flights
     WHERE flight_date = $1 AND missing_since IS NULL ORDER BY sheet_row`,
    [isoDay]
  );
  expect(sheet).toEqual([
    { status: "Laskutettu", billing_period: period },
    { status: "Ei laskuteta", billing_period: period },
    { status: "Laskutettu", billing_period: period },
  ]);

  await page.getByRole("button", { name: "Merkitse maksetuksi: E2E user" }).click();
  await expect(page.getByRole("button", { name: "Peru maksu: E2E user" })).toBeVisible();

  const csv = await (await page.request.get(`${periodUrl}/csv?taso=maksajat`)).text();
  expect(csv).toContain(`${period};E2E user;${accounts.user!.email};kyllä;2;60;3;217,00;`);

  // The member sees the bill
  const member = await browser.newContext({ storageState: accounts.user!.storageState });
  const memberPage = await member.newPage();
  await memberPage.goto("/jasenalue/lentopaivakirja");
  const bill = memberPage.locator("summary").filter({ hasText: `Jakso ${period}` });
  await expect(bill).toContainText("217,00 €");
  await expect(bill).toContainText("Maksettu");
  await member.close();
});
