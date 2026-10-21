import { Pool } from "pg";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { accounts, isLocalDatabase } from "./accounts";

// These tests create bookings, so they only run against a local database and
// remove everything titled "E2E-…" afterwards. They use dates in 2027, away
// from the seed data, and run one after another so they don't overlap.
test.skip(!isLocalDatabase(), "creates bookings: local database only");
test.describe.configure({ mode: "serial" });

// Booking times are club time, whatever zone the browser runs in
test.use({ timezoneId: "UTC" });

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
  });
  try {
    return (await pool.query(sql, params)).rows;
  } finally {
    await pool.end();
  }
}

test.afterAll(async () => {
  await query("DELETE FROM bookings WHERE title LIKE 'E2E-%'");
});

async function openNewBooking(page: Page, date: string, plane: string, hour: string) {
  await page.goto(`/kalusto/varauskalenteri?paiva=${date}&view=day`);
  await page
    .getByRole("button", { name: `Luo varaus koneelle ${plane} kello ${hour}` })
    .click();
  const dialog = page.getByRole("dialog", { name: "Uusi varaus" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("member", () => {
  test.skip(!accounts.user, "no member account");
  test.use({ storageState: accounts.user?.storageState });

  test("creates and deletes a booking", async ({ page }) => {
    const dialog = await openNewBooking(page, "2027-03-10", "OH-CON", "10:00");
    await dialog.getByLabel("Otsikko *").fill("E2E-yksi");
    await dialog.getByRole("button", { name: "Tallenna" }).click();
    await expect(dialog).toBeHidden();

    const booking = page.getByRole("button", { name: /^Varaus: E2E-yksi/ });
    await expect(booking).toBeVisible();

    await booking.click();
    await page
      .getByRole("dialog", { name: "Päivitä varaustietoja" })
      .getByRole("button", { name: "Poista" })
      .click();
    await page
      .getByRole("dialog", { name: "Vahvista poisto" })
      .getByRole("button", { name: "Poista varaus" })
      .click();
    await expect(booking).toHaveCount(0);
  });

  test("warns about an overlap and saves after confirming", async ({ page }) => {
    let dialog = await openNewBooking(page, "2027-03-11", "OH-386", "10:00");
    await dialog.getByLabel("Otsikko *").fill("E2E-ensin");
    await dialog.getByRole("button", { name: "Tallenna" }).click();
    await expect(dialog).toBeHidden();

    // 09–11 overlaps the 10–11 booking
    dialog = await openNewBooking(page, "2027-03-11", "OH-386", "9:00");
    await dialog.getByLabel("Lopetusaika *").fill("2027-03-11T11:00");
    await dialog.getByLabel("Otsikko *").fill("E2E-päälle");
    await dialog.getByRole("button", { name: "Tallenna" }).click();

    await expect(dialog.getByText("OH-386 on jo varattu tähän aikaan")).toBeVisible();
    await expect(dialog.getByText(/E2E-ensin/)).toBeVisible();
    await dialog.getByRole("button", { name: "Varaa silti" }).click();
    await expect(dialog).toBeHidden();

    // Both bookings show in the 10:00 slot
    await expect(page.getByRole("button", { name: /^Varaus: E2E-ensin/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Varaus: E2E-päälle/ }).first()).toBeVisible();
  });

  test("keeps a recurring booking at the same time across the DST change", async ({ page }) => {
    // EU summer time starts on Sunday 28.3.2027
    const dialog = await openNewBooking(page, "2027-03-26", "OH-816", "10:00");
    await dialog.getByLabel("Otsikko *").fill("E2E-toisto");
    await dialog.getByLabel("Toistuva varaus").check();
    await dialog.getByLabel("Toiston lopetuspäivä *").fill("2027-03-29");
    await dialog.getByRole("button", { name: "Tallenna" }).click();
    await expect(dialog).toBeHidden();

    const rows = await query<{ day: string; start: string; end: string }>(
      `SELECT to_char(start_time AT TIME ZONE 'Europe/Helsinki', 'YYYY-MM-DD') AS day,
              to_char(start_time AT TIME ZONE 'Europe/Helsinki', 'HH24:MI') AS start,
              to_char(end_time AT TIME ZONE 'Europe/Helsinki', 'HH24:MI') AS end
       FROM bookings WHERE title = 'E2E-toisto' ORDER BY start_time`
    );
    expect(rows).toEqual(
      ["2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29"].map((day) => ({
        day,
        start: "10:00",
        end: "11:00",
      }))
    );
  });

  test("turning repeat off again saves a one-day booking", async ({ page }) => {
    const dialog = await openNewBooking(page, "2027-03-15", "OH-829", "12:00");
    await dialog.getByLabel("Otsikko *").fill("E2E-ei-toistoa");
    await dialog.getByLabel("Toistuva varaus").check();
    await dialog.getByLabel("Toiston lopetuspäivä *").fill("2027-03-20");
    await dialog.getByLabel("Toistuva varaus").uncheck();
    await dialog.getByRole("button", { name: "Tallenna" }).click();
    await expect(dialog).toBeHidden();

    const rows = await query<{ start: string; end: string }>(
      `SELECT to_char(start_time AT TIME ZONE 'Europe/Helsinki', 'YYYY-MM-DD HH24:MI') AS start,
              to_char(end_time AT TIME ZONE 'Europe/Helsinki', 'YYYY-MM-DD HH24:MI') AS end
       FROM bookings WHERE title = 'E2E-ei-toistoa'`
    );
    expect(rows).toEqual([{ start: "2027-03-15 12:00", end: "2027-03-15 13:00" }]);
  });
});

test.describe("anonymous visitor", () => {
  test("makes a guest booking and sees it only as taken", async ({ page }) => {
    const dialog = await openNewBooking(page, "2027-03-12", "OH-CON", "14:00");
    await expect(dialog.getByLabel("Toistuva varaus")).toHaveCount(0);

    await dialog.getByLabel("Otsikko *").fill("E2E-vieras");
    await dialog.getByLabel("Nimi *").fill("Testi Vieras");
    await dialog.getByLabel("Sähköposti *").fill("vieras@salko.invalid");
    await dialog.getByLabel("Puhelinnumero *").fill("040 000 0000");
    await dialog.getByRole("button", { name: "Tallenna" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("button", { name: /^Varaus: Varattu/ })).toBeVisible();
    await expect(page.getByText("Testi Vieras")).toHaveCount(0);

    const rows = await query<{ contact_name: string }>(
      `SELECT gb.contact_name FROM guest_bookings gb
       JOIN bookings b ON b.id = gb.booking_id
       WHERE b.title = 'E2E-vieras (Testi Vieras)'`
    );
    expect(rows).toEqual([{ contact_name: "Testi Vieras" }]);
  });
});
