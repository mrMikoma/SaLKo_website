import { describe, expect, test } from "bun:test";
import { createLogger } from "@/utilities/logger";
import { logRequestError } from "@/utilities/requestError";

function run(err: unknown, path: string) {
  const lines: string[] = [];
  const log = createLogger({ level: "trace", format: "json", write: (l) => lines.push(l) });
  logRequestError(
    log,
    err,
    { method: "POST", path },
    { routerKind: "App Router", routePath: "/kalusto", routeType: "render", renderSource: "react-server-components" },
  );
  return lines.map((l) => JSON.parse(l));
}

describe("request errors", () => {
  test("are one error record with the route fields and the error", () => {
    const records = run(new TypeError("boom"), "/kalusto");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: "error",
      msg: "Request failed",
      module: "request",
      method: "POST",
      path: "/kalusto",
      routerKind: "App Router",
      routePath: "/kalusto",
      routeType: "render",
      renderSource: "react-server-components",
      err: { type: "TypeError", message: "boom" },
    });
  });

  test("leave out the query string", () => {
    const [record] = run(new Error("x"), "/auth/uusi-salasana?token=abc123&x=1");
    expect(record.path).toBe("/auth/uusi-salasana");
    expect(JSON.stringify(record)).not.toContain("abc123");
  });

  test("redact secrets in the error message", () => {
    const [record] = run(new Error("failed with Bearer abcdefghijklmnop for M.Meikalainen@example.com"), "/x");
    expect(record.err.message).not.toContain("abcdefghijklmnop");
    expect(record.err.message).not.toContain("example.com");
  });
});
