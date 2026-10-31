import { Pool } from "pg";
import { test, expect as baseExpect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

const expect = baseExpect.configure({ timeout: 15_000 });
// Several page loads and server actions: slow under `next dev`. In order, in
// one worker: each worker would otherwise clean up the other's invoices.
test.describe.configure({ mode: "serial", timeout: 90_000 });

// An invoice that isn't a flight bill, from the price list to paid: the
// treasurer writes it, sends it (mail is off in tests, so it is only stored)
// and marks it paid; the member sees it with the payment details. Local
// database only; the invoices are removed afterwards.
test.skip(!isLocalDatabase(), "writes invoices: local database only");
test.skip(!accounts.treasurer || !accounts.user, "needs the treasurer and member accounts");
test.use({ storageState: accounts.treasurer?.storageState });

async function query(sql: string, params: unknown[] = []) {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

const title = `E2E-lasku ${Date.now()}`;
const cleanUp = async () => {
  await query(
    "DELETE FROM email_outbox WHERE invoice_id IN (SELECT id FROM invoices WHERE title LIKE 'E2E-lasku %')"
  );
  await query("DELETE FROM invoices WHERE title LIKE 'E2E-lasku %'");
};
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test("a membership fee from the price list: written, sent, seen and paid", async ({ page, browser }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/admin/laskut");
  await page.getByRole("link", { name: "Uusi lasku" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Uusi lasku" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Otsikko").fill(title);

  // A line from the price list; its price fills in
  const preset = page.getByLabel("Valmis rivi hinnastosta");
  const value = await preset.locator("option", { hasText: "Jäsenmaksu, varsinainen jäsen" }).getAttribute("value");
  await preset.selectOption(value!);
  await expect(page.getByLabel("À-hinta €")).toHaveValue("60,00");
  await page.getByRole("button", { name: "Lisää rivi" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Yhteensä / lasku" })).toContainText("60,00 €");

  await page.getByLabel("Hae nimellä tai sähköpostilla").fill(accounts.user!.email);
  await page.getByRole("checkbox", { name: /E2E user/ }).check();
  await page.getByRole("button", { name: "Luo 1 luonnos" }).click();

  // The draft: no number yet
  await expect(page.getByRole("heading", { level: 1, name: "Luonnos: E2E user" })).toBeVisible({ timeout: 30_000 });
  const invoiceUrl = page.url();
  const id = Number(invoiceUrl.split("/").pop());
  await expect(page.getByRole("article")).toContainText("annetaan lähetettäessä");

  await page.getByRole("button", { name: "Viimeistele lasku (sähköposti ei käytössä)" }).click();
  const heading = page.getByRole("heading", { level: 1, name: /^Lasku \d{8}$/ });
  await expect(heading).toBeVisible();
  const number = (await heading.textContent())!.replace("Lasku ", "");
  expect(number.slice(0, 4)).toBe(String(new Date().getFullYear()));

  // Stored for sending, with the payment details
  const [invoice] = await query("SELECT reference, status, total_cents FROM invoices WHERE id = $1", [id]);
  expect(invoice).toMatchObject({ status: "open", total_cents: 6000 });
  expect(invoice.reference.slice(0, 8)).toBe(number);
  const outbox = await query(
    "SELECT status, from_name, reply_to, to_address, subject, body_text FROM email_outbox WHERE invoice_id = $1",
    [id]
  );
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({
    status: "held",
    // From the club's mail account as billing; replies to the treasurer
    from_name: "Savonlinnan Lentokerho, laskutus",
    reply_to: "laskutus@savonlinnanlentokerho.fi",
    to_address: accounts.user!.email,
    subject: `Lasku ${number}: ${title}`,
  });
  expect(outbox[0].body_text).toContain("FI51 4108 0011 8965 14");
  expect(outbox[0].body_text).toMatch(/Virtuaaliviivakoodi: 4\d{53}/);
  await expect(page.getByText("Ei lähetetty (sähköposti ei käytössä)")).toBeVisible();

  // The member sees it, unpaid, with how to pay
  const member = await browser.newContext({ storageState: accounts.user!.storageState });
  const memberPage = await member.newPage();
  await memberPage.goto("/jasenalue/laskut");
  const row = memberPage.getByRole("link").filter({ hasText: title });
  await expect(row).toContainText("60,00 €");
  await expect(row).toContainText("Avoin");
  await row.click();
  const payment = memberPage.getByRole("region", { name: "Maksutiedot" });
  await expect(payment).toContainText("FI51 4108 0011 8965 14");
  await expect(payment).toContainText(`${invoice.reference.slice(0, 4)} ${invoice.reference.slice(4)}`);
  await expect(payment.locator(".font-mono")).toHaveText(/^4\d{53}$/);

  // Paid
  await page.getByRole("button", { name: "Merkitse maksetuksi" }).click();
  await expect(page.getByRole("button", { name: "Peru maksu" })).toBeVisible();
  await memberPage.goto("/jasenalue/laskut");
  await expect(memberPage.getByRole("link").filter({ hasText: title })).toContainText("Maksettu");

  // A member can't open someone else's or a made-up invoice
  const missing = await memberPage.goto(`/jasenalue/laskut/${id + 100000}`);
  expect(missing?.status()).toBe(404);
  await member.close();

  const csv = await (await page.request.get("/admin/laskut/csv")).text();
  expect(csv).toContain(`${number};`);
  expect(csv).toContain(`;${title};;60,00;maksettu;`);
});

test("drafts sent together from the list; one without email is issued for printing", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  const batch = `${title} erä`;

  await page.goto("/admin/laskut/uusi");
  await page.getByLabel("Otsikko").fill(batch);
  await page.getByLabel("Selite").fill("Avain yhdistyksen tiloihin");
  await page.getByLabel("À-hinta €").fill("25");
  await page.getByRole("button", { name: "Lisää rivi" }).click();
  await page.getByLabel("Hae nimellä tai sähköpostilla").fill(accounts.user!.email);
  await page.getByRole("checkbox", { name: /E2E user/ }).check();
  // Someone outside the member list, with no email address
  await page.getByRole("checkbox", { name: /Joku muu kuin jäsenlistalla oleva/ }).check();
  await page.getByLabel("Nimi", { exact: true }).fill("Hallin Vuokralainen");
  await page.getByRole("textbox", { name: "Postiosoite" }).fill("Testitie 1\n57310 Savonlinna");
  await page.getByRole("button", { name: "Luo 2 luonnosta" }).click();

  await expect(page).toHaveURL(/nakyma=luonnokset/, { timeout: 30_000 });
  const drafts = page.getByRole("row").filter({ hasText: batch });
  await expect(drafts).toHaveCount(2);
  await expect(drafts.filter({ hasText: "Hallin Vuokralainen" })).toContainText("ei sähköpostia");

  // Only this test's drafts: other specs may have left none, but be sure
  const others = await query("SELECT count(*)::int AS n FROM invoices WHERE status = 'draft' AND title <> $1", [batch]);
  test.skip(others[0].n > 0, "other drafts in the database would be sent too");

  await page.getByRole("button", { name: "Viimeistele kaikki luonnokset (2)" }).click();
  // The drafts are gone, and the result still shows
  const result = page.getByRole("status");
  await expect(result).toContainText("1 tallennettu, ei lähetetty");
  await expect(result).toContainText("1 ilman sähköpostiosoitetta: tulosta ne laskun sivulta.");
  await page.getByRole("link", { name: /^Avoimet/ }).click();
  const issued = page.getByRole("row").filter({ hasText: batch });
  await expect(issued).toHaveCount(2);
  await expect(issued.filter({ hasText: "Hallin Vuokralainen" })).toContainText("tulostettava");
  const numbers = await query("SELECT number FROM invoices WHERE title = $1 ORDER BY number", [batch]);
  expect(numbers[1].number - numbers[0].number).toBe(1);
});

test("a period's draft is not sent once its payer is marked paid", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  const seconds = Math.floor(Date.now() / 1000);
  // A one-day period of its own, years before any real one, and named so the
  // billing spec's clean-up leaves it alone
  const [period] = await query(
    `INSERT INTO billing_periods (name, starts_on, ends_on, closed_at)
     VALUES ($1, DATE '1990-01-01' + $2::int, DATE '1990-01-01' + $2::int, NOW())
     RETURNING id`,
    [`e2e-maksettu-${seconds}`, seconds % 3650]
  );
  try {
    await query(
      `INSERT INTO billing_payers (period_id, payer_key, payer_name, total_cents, paid_at)
       VALUES ($1, 'name:e2emaksaja', 'E2E Maksaja', 2500, NOW())`,
      [period.id]
    );
    // Made before the payment was marked, so it is still a draft
    const [draft] = await query(
      `INSERT INTO invoices (recipient_name, title, period_id, payer_key, total_cents)
       VALUES ('E2E Maksaja', $1, $2, 'name:e2emaksaja', 2500)
       RETURNING id`,
      [`${title} maksettu`, period.id]
    );
    await query(
      `INSERT INTO invoice_lines (invoice_id, position, description, amount_cents, unit_cents)
       VALUES ($1, 1, 'Lennot', 2500, 2500)`,
      [draft.id]
    );

    await page.goto(`/admin/laskut/${draft.id}`);
    await page.getByRole("button", { name: "Viimeistele lasku tulostettavaksi" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "E2E Maksaja: jakson lasku on jo merkitty maksetuksi, ei lähetetty."
    );
    const [after] = await query("SELECT status, number FROM invoices WHERE id = $1", [draft.id]);
    expect(after).toEqual({ status: "draft", number: null });
  } finally {
    await query("DELETE FROM invoices WHERE period_id = $1", [period.id]);
    await query("DELETE FROM billing_periods WHERE id = $1", [period.id]);
  }
});

