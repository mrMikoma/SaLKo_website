import { describe, expect, test } from "bun:test";
import { returnPath, safeRedirect } from "@/utilities/safeRedirect";

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

describe("the page the login page returns to", () => {
  test("is the path it was given", () => {
    expect(returnPath("/jasenalue/lentopaivakirja/uusi")).toBe("/jasenalue/lentopaivakirja/uusi");
    expect(returnPath("/admin/laskut?nakyma=luonnokset")).toBe("/admin/laskut?nakyma=luonnokset");
  });

  test("is only the path and query of Auth.js's full address", () => {
    expect(returnPath("http://localhost:3000/admin?x=1")).toBe("/admin?x=1");
    // Another site's address keeps only its path, on this site
    expect(returnPath("https://evil.example/jasenalue/profiili")).toBe("/jasenalue/profiili");
  });

  test("is the front page for the login pages themselves and anything unsafe", () => {
    for (const value of ["/auth/kirjaudu?paluu=/x", "/auth/virhe", "/auth", "//evil.example", "https://", null, undefined]) {
      expect(returnPath(value)).toBe("/");
    }
  });
});
