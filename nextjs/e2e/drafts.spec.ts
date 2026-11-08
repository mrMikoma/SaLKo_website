import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

// A long form's unsaved input survives a reload in the same tab (useDraft),
// and can be let go

test.describe("admin", () => {
  test.skip(!accounts.admin, "no admin account");
  test.use({ storageState: accounts.admin?.storageState });

  test("a bulletin being written comes back after a reload", async ({ page }) => {
    await page.goto("/admin/bulletins");
    await page.getByRole("button", { name: "+ Luo uusi tiedote" }).click();
    await page.getByLabel("Otsikko *").fill("E2E-luonnos, ei tallenneta");
    await page.getByLabel("Sisältö *").fill("Pitkä teksti, joka säilyy.");

    await page.reload();
    await expect(page.getByText("Palautettiin tallentamaton luonnos")).toBeVisible();
    await expect(page.getByLabel("Otsikko *")).toHaveValue("E2E-luonnos, ei tallenneta");
    await expect(page.getByLabel("Sisältö *")).toHaveValue("Pitkä teksti, joka säilyy.");

    // Let go, it stays gone
    await page.getByRole("button", { name: "Hylkää luonnos" }).click();
    await expect(page.getByLabel("Otsikko *")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "+ Luo uusi tiedote" })).toBeVisible();
    await expect(page.getByText("Palautettiin tallentamaton luonnos")).toHaveCount(0);
  });
});

test.describe("member", () => {
  test.skip(!accounts.user, "no member account");
  test.use({ storageState: accounts.user?.storageState });

  test("a flight being entered comes back after a reload", async ({ page }) => {
    await page.goto("/jasenalue/lentopaivakirja/uusi");
    await page.getByLabel("Lentoonlähtö", { exact: true }).fill("10.05");
    await page.getByLabel("Lasku", { exact: true }).fill("10.50");

    await page.reload();
    await expect(page.getByText("Palautettiin tallentamaton luonnos")).toBeVisible();
    await expect(page.getByLabel("Lentoonlähtö", { exact: true })).toHaveValue("10.05");
    await expect(page.getByLabel("Lasku", { exact: true })).toHaveValue("10.50");

    await page.getByRole("button", { name: "Hylkää luonnos" }).click();
    await expect(page.getByLabel("Lentoonlähtö", { exact: true })).toHaveValue("");
  });
});
