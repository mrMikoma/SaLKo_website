import { Pool } from "pg";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// Mail is off in tests (MAIL_MODE unset): a message is stored and shown, but
// never sent
test.skip(!accounts.treasurer, "no treasurer account: set E2E_TREASURER_* or use a local database");
test.use({ storageState: accounts.treasurer?.storageState });

test("a test message is stored, not sent, while mail is off", async ({ page }) => {
  await page.goto("/admin/laskutus/asetukset");
  await expect(page.getByText("Pois päältä: viestit tallentuvat vain tälle sivustolle")).toBeVisible();
  await page.getByRole("link", { name: "Lähetetyt viestit ja testiviesti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sähköpostit" })).toBeVisible();

  await page.getByRole("button", { name: "Lähetä testiviesti itselleni" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Tallennettu, ei lähetetty: sähköposti ei ole käytössä (MAIL_MODE)."
  );
  const latest = page.getByRole("listitem").filter({ hasText: "Testiviesti kerhon verkkosivuilta" }).first();
  await expect(latest).toContainText(`Testiviesti · E2E treasurer <${accounts.treasurer!.email}>`);
  await expect(latest).toContainText("Ei lähetetty");
  await latest.getByText("Näytä viesti").click();
  await expect(latest).toContainText(
    'Laskuissa lähettäjänä näkyy "Savonlinnan Lentokerho, laskutus", ja vastaukset menevät osoitteeseen laskutus@savonlinnanlentokerho.fi.'
  );
});

async function query(sql: string, params: unknown[] = []) {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

test("a failed invoice message is not tried again once the invoice is cancelled", async ({ page }) => {
  test.skip(!isLocalDatabase(), "writes an invoice: local database only");
  const subject = `E2E-lasku ${Date.now()} mitätöity`;
  // Issued, its message failed, then cancelled. Numbers far above any year's
  // real ones, so it can't take one
  const [invoice] = await query(
    `INSERT INTO invoices (number, reference, status, recipient_name, title, issue_date, due_date,
       cancelled_at, cancel_reason)
     VALUES (99990000 + (random() * 9999)::int, 'E2E-' || gen_random_uuid(), 'cancelled', 'E2E user',
       $1, CURRENT_DATE, CURRENT_DATE, NOW(), 'e2e')
     RETURNING id`,
    [subject]
  );
  const [message] = await query(
    `INSERT INTO email_outbox (from_name, kind, to_address, subject, body_text, status, invoice_id)
     VALUES ('E2E', 'invoice', 'e2e-user@salko.invalid', $1, 'e2e', 'failed', $2)
     RETURNING id`,
    [subject, invoice.id]
  );
  try {
    await page.goto("/admin/laskutus/viestit");
    const item = page.getByRole("listitem").filter({ hasText: subject });
    await item.getByRole("button", { name: `Yritä uudelleen: ${subject}` }).click();
    await expect(item.getByRole("alert")).toHaveText("Lasku on mitätöity, joten viestiä ei lähetetä.");
    const [after] = await query("SELECT status, attempts FROM email_outbox WHERE id = $1", [message.id]);
    expect(after).toEqual({ status: "failed", attempts: 0 });
  } finally {
    await query("DELETE FROM email_outbox WHERE id = $1", [message.id]);
    await query("DELETE FROM invoices WHERE id = $1", [invoice.id]);
  }
});
