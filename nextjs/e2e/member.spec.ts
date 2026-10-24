import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

const user = accounts.user;

test.skip(!user, "no member account: set E2E_USER_* or use a local database");
test.use({ storageState: user?.storageState });

for (const path of ["/jasenalue/profiili", "/jasenalue/lentopaivakirja"]) {
  test(`${path} is reachable when logged in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

test("member menu has no admin link and logs out", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await expect(page.getByRole("menuitem", { name: "Omat tiedot" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Admin sivut" })).toHaveCount(0);

  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await expect(page.getByText("Et ole kirjautunut jäsenalueelle")).toBeVisible();
});

test("/admin redirects members to /", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
});
