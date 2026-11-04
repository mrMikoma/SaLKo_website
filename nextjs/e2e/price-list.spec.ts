import { Pool } from "pg";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// The price list: an admin adds a price, changes and hides it, and the public
// price page follows; the treasurer edits it too. It writes price_items, so
// local databases only, and it removes its row afterwards.
test.skip(!isLocalDatabase(), "writes the price list: local database only");
test.skip(!accounts.admin, "no admin account");
test.describe.configure({ mode: "serial" });

const NAME = "E2E-avainkortti";

const removeItem = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  try {
    await pool.query("DELETE FROM price_items WHERE name = $1", [NAME]);
  } finally {
    await pool.end();
  }
};
test.beforeAll(removeItem);
test.afterAll(removeItem);

test.describe("as an admin", () => {
  test.use({ storageState: accounts.admin?.storageState });

  test("the public pages read the price list", async ({ page }) => {
    await page.goto("/kerho/hinnasto");
    await expect(page.getByText(/^Voimassa \d+\.\d+\.\d{4} alkaen$/)).toBeVisible();
    const fee = page.getByRole("row").filter({ hasText: "Varsinainen jäsen" });
    await expect(fee).toContainText("60 €/vuosi");
    // OH-CON at 186 / 300 €/h, 3,10 / 5,00 €/min
    const aircraft = page.getByRole("row").filter({ hasText: "OH-CON" });
    await expect(aircraft).toContainText("3,10");
    await expect(aircraft).toContainText("186");
    await page.goto("/kerho/jasenyys");
    await expect(page.getByRole("row").filter({ hasText: "Varsinainen jäsen" })).toContainText("60 €/vuosi");
  });

  test("a new price shows on the price page, follows its edits and leaves when hidden or removed", async ({ page }) => {
    await page.goto("/admin/hinnasto");
    await expect(page.getByRole("heading", { level: 1, name: "Hinnasto" })).toBeVisible();
    const other = page.getByRole("region", { name: "Muut maksut" });
    await other.getByRole("button", { name: "+ Lisää rivi" }).click();
    await other.getByLabel("Nimi").fill(NAME);
    await other.getByLabel("Hinta €").fill("7,5");
    await other.getByRole("button", { name: "Tallenna" }).click();
    await expect(other.getByText(NAME)).toBeVisible();
    await expect(other.getByText("7,50 €")).toBeVisible();

    await page.goto("/kerho/hinnasto");
    await expect(page.getByRole("row").filter({ hasText: NAME })).toContainText("7,50 €");

    // A price that isn't one is refused
    await page.goto("/admin/hinnasto");
    await other.getByRole("button", { name: `Muokkaa: ${NAME}` }).click();
    await other.getByLabel("Hinta €").fill("seitsemän");
    await other.getByRole("button", { name: "Tallenna" }).click();
    await expect(other.getByRole("alert")).toContainText("Anna hinta euroina");
    await other.getByLabel("Hinta €").fill("8");
    await other.getByLabel("Näytetään sivuilla").uncheck();
    await other.getByRole("button", { name: "Tallenna" }).click();
    await expect(other.getByText("(piilotettu)")).toBeVisible();

    await page.goto("/kerho/hinnasto");
    await expect(page.getByText(NAME)).toHaveCount(0);

    await page.goto("/admin/hinnasto");
    page.once("dialog", (dialog) => dialog.accept());
    await other.getByRole("button", { name: `Poista: ${NAME}` }).click();
    await expect(other.getByText(NAME)).toHaveCount(0);
  });

  test("aircraft prices are on the same page", async ({ page }) => {
    await page.goto("/admin/hinnasto");
    const aircraft = page.getByRole("region", { name: "Koneiden tuntihinnat" });
    await expect(aircraft.getByRole("row").filter({ hasText: "OH-CON" }).first()).toContainText("186,00 €/h");
  });
});

test.describe("as the treasurer", () => {
  test.skip(!accounts.treasurer, "no treasurer account");
  test.use({ storageState: accounts.treasurer?.storageState });

  test("opens the price list from the admin nav", async ({ page }) => {
    await page.goto("/admin/lennot");
    const nav = page.getByRole("navigation", { name: "Ylläpito" });
    await nav.getByRole("link", { name: "Hinnasto" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Hinnasto" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Jäsenmaksut" })).toBeVisible();
  });
});
