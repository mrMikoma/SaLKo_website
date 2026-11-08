import { describe, expect, test } from "bun:test";
import { errorDigest, failureKind } from "@/utilities/errorText";

class UnrecognizedActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnrecognizedActionError";
  }
}

describe("failureKind", () => {
  test("a server action from before the deploy is an outdated page", () => {
    expect(failureKind(new UnrecognizedActionError('Server Action "705f1c86" was not found on the server.'))).toBe(
      "outdated"
    );
    // The same message without the class, e.g. from a bundle that renamed it
    expect(failureKind(new Error('Server Action "abc" was not found on the server. \nRead more: …'))).toBe("outdated");
  });

  test("a script chunk that is gone after a deploy is an outdated page", () => {
    const chunk = new Error("Loading chunk 123 failed.");
    chunk.name = "ChunkLoadError";
    expect(failureKind(chunk)).toBe("outdated");
    expect(failureKind(new Error("Failed to load chunk /_next/static/chunks/abc.js"))).toBe("outdated");
  });

  test("a request without an answer is a lost connection, in every browser's words", () => {
    expect(failureKind(new TypeError("Failed to fetch"))).toBe("offline");
    expect(failureKind(new TypeError("NetworkError when attempting to fetch resource."))).toBe("offline");
    expect(failureKind(new TypeError("Load failed"))).toBe("offline");
  });

  test("anything else is a plain error", () => {
    expect(failureKind(new Error("An error occurred in the Server Components render."))).toBe("other");
    // A TypeError from a bug isn't a lost connection
    expect(failureKind(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe("other");
    expect(failureKind("thrown string")).toBe("other");
    expect(failureKind(null)).toBe("other");
  });
});

describe("errorDigest", () => {
  test("is Next's digest of a server error, when there is one", () => {
    expect(errorDigest(Object.assign(new Error("x"), { digest: "2914817351" }))).toBe("2914817351");
    expect(errorDigest(new Error("x"))).toBeNull();
    expect(errorDigest({ digest: 42 })).toBeNull();
    expect(errorDigest(undefined)).toBeNull();
  });
});
