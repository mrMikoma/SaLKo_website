import { test, expect } from "./fixtures";

// Too many failed logins for one email address: the login is refused for a
// while, with the wait in the message. The address has no account, which is
// counted the same way, so the limit doesn't reveal who has an account.
test("ten failed logins for an address make it wait", async ({ page }) => {
  const email = `e2e-limit-${Date.now()}@salko.invalid`;
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  const emailField = page.getByRole("textbox", { name: "Sähköposti" });
  const password = page.getByRole("textbox", { name: "Salasana" });
  const submit = page.getByRole("button", { name: "Kirjaudu sisään" });
  const wrong = page.getByText("Virheellinen sähköpostiosoite tai salasana.");

  // One attempt: the login form's POST and its answer
  const attempt = async (n: number) => {
    await emailField.fill(email);
    await password.fill(`Vaara-salasana${n}!`);
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST"),
      submit.click(),
    ]);
  };

  for (let n = 1; n <= 10; n++) {
    await attempt(n);
    await expect(wrong).toBeVisible();
    // The typed email stays for the next try
    await expect(emailField).toHaveValue(email);
  }

  await attempt(11);
  await expect(page.getByText("Liian monta epäonnistunutta kirjautumista. Yritä uudelleen 15 minuutin kuluttua.")).toBeVisible();
});
