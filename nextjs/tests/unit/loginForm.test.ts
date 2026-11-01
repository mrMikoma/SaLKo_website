import { describe, expect, test } from "bun:test";
import { LoginFormSchema } from "@/utilities/definitions";

const password = "Oikea-salasana1!";

describe("the login form", () => {
  test("accepts an ordinary address", () => {
    expect(LoginFormSchema.safeParse({ email: "m.meikalainen@salko.invalid", password }).success).toBe(true);
  });

  // The failed-login counts keep the address, so its length must be bounded
  test("refuses an address longer than mail allows", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.${"e".repeat(60)}.fi`;
    expect(`${local}@${domain}`.length).toBeGreaterThan(254);
    expect(LoginFormSchema.safeParse({ email: `${local}@${domain}`, password }).success).toBe(false);
    expect(LoginFormSchema.safeParse({ email: `${"a".repeat(900_000)}@salko.invalid`, password }).success).toBe(false);
  });
});
