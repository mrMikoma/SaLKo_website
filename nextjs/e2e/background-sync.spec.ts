import { Pool } from "pg";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// A stale copy of the flight sheet is shown at once and synced in the
// background (ensureFreshSync), instead of the page waiting for the sheet

test.skip(!isLocalDatabase(), "ages the sync runs: local database only");
test.skip(!accounts.admin, "no admin account");
test.use({ storageState: accounts.admin?.storageState });

async function query(sql: string, params: unknown[] = []) {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

test("a stale copy is shown at once, and the page catches up by itself", async ({ page }) => {
  test.setTimeout(90_000);
  // Make sure there is a copy, then make every run look an hour old
  await page.goto("/admin/lennot");
  await expect(page.getByText("Taulukosta synkronoitu")).toBeVisible();
  await query(
    `UPDATE sheet_sync_runs
     SET started_at = started_at - interval '1 hour',
         finished_at = finished_at - interval '1 hour'
     WHERE status <> 'running'`
  );

  await page.goto("/admin/lennot");
  const note = page.getByText("Taulukkoa luetaan parhaillaan");
  await expect(note).toBeVisible();
  // The sync ran after the response; the page refreshes itself until the copy
  // is fresh (every 10 s, so even a sync behind another test's lock is seen)
  await expect(note).toBeHidden({ timeout: 45_000 });
  // A sync finished since the runs were aged (another test's may be running now)
  const synced = await query(
    "SELECT count(*)::int AS n FROM sheet_sync_runs WHERE status = 'success' AND finished_at > now() - interval '5 minutes'"
  );
  expect(synced[0].n).toBeGreaterThan(0);
});
