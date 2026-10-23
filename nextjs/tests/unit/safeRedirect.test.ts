import { describe, expect, test } from "bun:test";
import { safeRedirect } from "@/utilities/safeRedirect";

describe("the page to return to after logging in", () => {
  test("is a path on this site, with its query", () => {
    expect(safeRedirect("/kalusto/varauskalenteri?paiva=2026-10-23&view=month")).toBe(
      "/kalusto/varauskalenteri?paiva=2026-10-23&view=month"
    );
    expect(safeRedirect("/")).toBe("/");
  });

  test("is the front page for anything else", () => {
    for (const value of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "kalusto", "/a\nb", 42]) {
      expect(safeRedirect(value)).toBe("/");
    }
  });
});
