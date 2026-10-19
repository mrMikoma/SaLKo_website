import { test, expect, STORAGE_STATE, hasCredentials } from "./fixtures";

test.skip(!hasCredentials, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
test.use({ storageState: STORAGE_STATE });

for (const path of ["/jasenalue/profiili", "/jasenalue/lentopaivakirja"]) {
  test(`${path} is reachable when logged in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}
