import { test, expect } from "./fixtures";
import planes from "@/data/planes.json";

const publicPages = [
  "/",
  "/kerho",
  "/kerho/hallit",
  "/kerho/hinnasto",
  "/kerho/historiaa",
  "/kerho/jasenyys",
  "/kerho/kentta",
  "/kalusto",
  "/kalusto/varauskalenteri",
  "/koulutus",
  "/esittelylennot",
  "/yhteystiedot",
  "/tiedotteet",
  ...planes.map((plane) => `/kalusto/${plane.registeration}`),
];

for (const path of publicPages) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

for (const path of ["/jasenalue/profiili", "/jasenalue/lentopaivakirja", "/admin"]) {
  test(`${path} redirects anonymous visitors to /`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL("/");
  });
}

test("login dialog opens from the navbar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jäsenalue" }).click();
  await expect(
    page.getByRole("heading", { name: "Kirjaudu jäsenalueelle" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Sähköposti" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Salasana" })).toBeVisible();
});
