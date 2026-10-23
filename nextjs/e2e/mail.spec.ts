import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

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
  await expect(latest).toContainText("Laskut lähtevät osoitteesta laskutus@savonlinnanlentokerho.fi");
});
