import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE, hasCredentials } from "./fixtures";

// Logs in once with a credentials account and saves the session cookie, so
// member-area specs (and `playwright-cli state-load`) can start logged in.
setup("log in with credentials", async ({ page }) => {
  setup.skip(!hasCredentials, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");

  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await page
    .getByRole("textbox", { name: "Sähköposti" })
    .fill(process.env.E2E_USER_EMAIL!);
  await page
    .getByRole("textbox", { name: "Salasana" })
    .fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
  await expect(page.getByText("Et ole kirjautunut jäsenalueelle")).toBeHidden();

  await page.context().storageState({ path: STORAGE_STATE });
});
