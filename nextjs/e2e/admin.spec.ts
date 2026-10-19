import { test, expect } from "./fixtures";
import { accounts } from "./accounts";

const admin = accounts.admin;

test.skip(!admin, "no admin account: set E2E_ADMIN_* or use a local database");
test.use({ storageState: admin?.storageState });

for (const path of ["/admin", "/admin/users", "/admin/bulletins", "/admin/settings"]) {
  test(`${path} renders for admins`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

test("admin menu links to the admin pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await expect(page.getByRole("menuitem", { name: "Admin sivut" })).toBeVisible();
});
