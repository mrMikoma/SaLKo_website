import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

// proxy.ts only redirects; it skips paths ending in an image extension and
// anything under /api. So every admin and member page and route must check the
// session and the permission itself.
const root = join(import.meta.dir, "../..");

// Pages that check access another way, and how
const EXCEPTIONS: Record<string, RegExp> = {
  // Reads only the logged-in member's own row (utilities/user.ts)
  "app/jasenalue/profiili/page.tsx": /getUserData\(\)/,
};

function entries(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return entries(path);
    return name === "page.tsx" || name === "route.ts" ? [relative(root, path)] : [];
  });
}

const guarded = [...entries(join(root, "app/admin")), ...entries(join(root, "app/jasenalue"))];

describe("admin and member pages", () => {
  test("are found", () => {
    expect(guarded.length).toBeGreaterThan(15);
  });

  for (const file of guarded) {
    test(`${file} checks the session and the permission itself`, () => {
      const source = readFileSync(join(root, file), "utf8");
      const exception = EXCEPTIONS[file];
      if (exception) {
        expect(source).toMatch(exception);
        return;
      }
      expect(source).toMatch(/\bauth\(\)/);
      expect(source).toMatch(/\bhasPermission\(/);
    });
  }
});
