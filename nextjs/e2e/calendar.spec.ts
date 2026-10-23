import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

// The booking calendar's controls, for a visitor who isn't logged in

test("a visitor logs in from the calendar and comes back to the same day", async ({ page }) => {
  test.skip(!accounts.user, "no member account: set E2E_USER_* or use a local database");
  await page.goto("/kalusto/varauskalenteri?paiva=2027-03-10&view=day");
  await expect(page.getByText("Et ole kirjautunut.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  const login = page.locator("#calendar-login");
  await login.getByRole("textbox", { name: "Sähköposti" }).fill(accounts.user!.email);
  await login.getByRole("textbox", { name: "Salasana" }).fill(accounts.user!.password);
  await login.getByRole("button", { name: "Kirjaudu sisään" }).click();

  await expect(page).toHaveURL(/\/kalusto\/varauskalenteri\?paiva=2027-03-10&view=day$/, { timeout: 20_000 });
  await expect(page.getByText("Et ole kirjautunut.", { exact: true })).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the month calendar has its own arrows to the next and previous month", async ({ page }) => {
    await page.goto("/kalusto/varauskalenteri?paiva=2027-03-10&view=month");
    // The date picker's arrows come first; the calendar's are the second pair
    const next = page.getByRole("button", { name: "Seuraava kuukausi" });
    await expect(next).toHaveCount(2);
    await next.last().click();
    await expect(page).toHaveURL(/paiva=2027-04-10/);
    await page.getByRole("button", { name: "Edellinen kuukausi" }).last().click();
    await expect(page).toHaveURL(/paiva=2027-03-10/);
  });

  test("Tänään is a button of its own under the arrows", async ({ page }) => {
    await page.goto("/kalusto/varauskalenteri?paiva=2027-03-10&view=day");
    const today = page.getByRole("button", { name: "Siirry tähän päivään" });
    await expect(today).toHaveCount(1);
    const next = await page.getByRole("button", { name: "Seuraava päivä" }).boundingBox();
    const box = await today.boundingBox();
    expect(box!.y).toBeGreaterThan(next!.y + next!.height);
    await today.click();
    await expect(page).toHaveURL(new RegExp(`paiva=${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Helsinki" })}`));
  });
});
