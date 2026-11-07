import { describe, expect, test } from "bun:test";
import { callAction, isActionFailure } from "@/utilities/callAction";

describe("callAction", () => {
  test("passes the action's own answer through, errors included", async () => {
    expect(await callAction(async () => ({ status: "success", result: 1 }))).toEqual({ status: "success", result: 1 });
    const own = await callAction(async () => ({ status: "error", error: "Ei oikeuksia" }));
    expect(own).toEqual({ status: "error", error: "Ei oikeuksia" });
    expect(isActionFailure(own)).toBe(false);
  });

  test("answers for a call that lost its connection", async () => {
    const answer = await callAction(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(answer).toMatchObject({ status: "error", failure: "offline" });
    expect(isActionFailure(answer) && answer.error).toContain("Tarkista verkkoyhteys");
  });

  test("answers for an action the deployed site no longer has", async () => {
    const stale = new Error('Server Action "705f" was not found on the server.');
    stale.name = "UnrecognizedActionError";
    const answer = await callAction(async () => {
      throw stale;
    });
    expect(answer).toMatchObject({ status: "error", failure: "outdated" });
    expect(isActionFailure(answer) && answer.error).toContain("Lataa sivu uudelleen");
  });

  test("lets Next's redirects through, like the one after a login", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/;307;" });
    await expect(
      callAction(async () => {
        throw redirect;
      })
    ).rejects.toBe(redirect);
  });
});
