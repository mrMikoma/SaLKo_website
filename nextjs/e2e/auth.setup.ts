import { test as setup, expect } from "@playwright/test";
import { accounts, seedAccount } from "./accounts";

// Logs in once per account and saves the session cookie, so the member and
// admin specs (and `playwright-cli state-load`) can start logged in.
for (const account of Object.values(accounts)) {
  if (!account) continue;

  setup(`log in as ${account.role}`, async ({ page }) => {
    if (account.seed) await seedAccount(account);

    await page.goto("/");
    await page.getByRole("button", { name: "Jäsenalue" }).click();
    await page.getByRole("textbox", { name: "Sähköposti" }).fill(account.email);
    await page.getByRole("textbox", { name: "Salasana" }).fill(account.password);
    await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
    await expect(page.getByText("Et ole kirjautunut jäsenalueelle")).toBeHidden();

    await page.context().storageState({ path: account.storageState });
  });
}
