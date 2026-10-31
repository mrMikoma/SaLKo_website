import { afterEach, describe, expect, test } from "bun:test";
import {
  createLogger,
  installConsoleBridge,
  isSensitiveKey,
  REDACTED,
  scrub,
  serializeError,
  type LogLevel,
} from "@/utilities/logger";

const fixedNow = () => new Date("2026-10-31T12:00:00.000Z");

function capture(level: LogLevel | "silent" = "trace") {
  const lines: string[] = [];
  const log = createLogger({ level, format: "json", write: (line) => lines.push(line), now: fixedNow });
  const records = () => lines.map((line) => JSON.parse(line));
  return { log, lines, records };
}

describe("records", () => {
  test("are one JSON object per line with time, level and message first", () => {
    const { log, lines } = capture();
    log.info("Sync finished", { rows: 3 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('{"time":"2026-10-31T12:00:00.000Z","level":"info","msg":"Sync finished","rows":3}');
  });

  test("carry the child's bindings", () => {
    const { log, records } = capture();
    log.child({ module: "billing" }).child({ periodId: 4 }).warn("Nothing to bill");
    expect(records()[0]).toMatchObject({ level: "warn", module: "billing", periodId: 4, msg: "Nothing to bill" });
  });

  test("context can't overwrite time, level or message", () => {
    const { log, records } = capture();
    log.error("Real", { level: "info", msg: "fake", time: "x" });
    expect(records()[0]).toMatchObject({ level: "error", msg: "Real", time: "2026-10-31T12:00:00.000Z" });
  });

  test("an Error given as the context becomes err", () => {
    const { log, records } = capture();
    log.error("Failed", new TypeError("boom"));
    expect(records()[0].err).toMatchObject({ type: "TypeError", message: "boom" });
  });
});

describe("levels", () => {
  test("below the threshold are dropped", () => {
    const { log, records } = capture("warn");
    log.trace("t");
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    log.fatal("f");
    expect(records().map((r) => r.level)).toEqual(["warn", "error", "fatal"]);
  });

  test("silent writes nothing", () => {
    const { log, lines } = capture("silent");
    log.fatal("f");
    expect(lines).toHaveLength(0);
    expect(log.isLevelEnabled("fatal")).toBe(false);
  });

  test("isLevelEnabled follows the threshold", () => {
    const { log } = capture("info");
    expect(log.isLevelEnabled("debug")).toBe(false);
    expect(log.isLevelEnabled("info")).toBe(true);
  });
});

describe("redaction", () => {
  test("sensitive keys are recognised in any spelling", () => {
    for (const key of ["password", "newPassword", "client_secret", "Authorization", "set-cookie", "toEmail", "email", "phone", "refreshToken", "fullName", "DATABASE_URL", "ip"]) {
      expect(isSensitiveKey(key)).toBe(true);
    }
    for (const key of ["userId", "invoiceId", "status", "count", "module", "code", "sheet", "durationMs"]) {
      expect(isSensitiveKey(key)).toBe(false);
    }
  });

  test("sensitive context values are redacted, also nested", () => {
    const { log, records } = capture();
    log.info("Profile saved", {
      userId: 7,
      email: "pilot@example.com",
      changes: { phone: "040 123 4567", city: "Savonlinna", nested: { password: "hunter22" } },
      list: [{ token: "abc" }],
    });
    const record = records()[0];
    expect(record.userId).toBe(7);
    expect(record.email).toBe(REDACTED);
    expect(record.changes.phone).toBe(REDACTED);
    expect(record.changes.city).toBe("Savonlinna");
    expect(record.changes.nested.password).toBe(REDACTED);
    expect(record.list[0].token).toBe(REDACTED);
  });

  test("strings have personal data and secrets masked", () => {
    expect(scrub("Mail to matti.meikalainen@example.fi failed")).toBe("Mail to [email] failed");
    expect(scrub("postgresql://salko_app:s3cr3t@salko-postgres-prod:5432/salko")).toBe(
      "postgresql://[REDACTED]@salko-postgres-prod:5432/salko"
    );
    expect(scrub("Authorization: Bearer ya29.a0AfH6SMBxyz-123")).toBe("Authorization: Bearer [REDACTED]");
    expect(scrub("token ya29.a0AfH6SMBxyz-123 expired")).toBe("token [google-token] expired");
    expect(scrub("cookie eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF123_-x")).toBe("cookie [jwt]");
    expect(scrub("/auth/uusi-salasana?token=abcdef0123456789&x=1")).toBe("/auth/uusi-salasana?token=[REDACTED]&x=1");
    expect(scrub("hetu 131052-308T here")).toBe("hetu [hetu] here");
    expect(scrub('{"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"}')).toBe(
      '{"private_key":"[private-key]\\n"}'
    );
  });

  test("the message is scrubbed too", () => {
    const { log, records } = capture();
    log.warn("Login refused for pilot@example.com");
    expect(records()[0].msg).toBe("Login refused for [email]");
  });

  test("long strings are cut", () => {
    const out = scrub("x".repeat(5000));
    expect(out.length).toBeLessThan(2100);
    expect(out.endsWith("…[truncated]")).toBe(true);
  });

  test("circular and deep values don't break the record", () => {
    const { log, records } = capture();
    const loop: Record<string, unknown> = { id: 1 };
    loop.self = loop;
    log.info("Loop", { loop, deep: { a: { b: { c: { d: { e: { f: 1 } } } } } } });
    const record = records()[0];
    expect(record.loop.self).toBe("[Circular]");
    expect(JSON.stringify(record.deep)).toContain("[Object]");
  });
});

describe("errors", () => {
  test("keep type, message, code and stack, not the data they carry", () => {
    // Like node-postgres' DatabaseError on a unique violation
    class DatabaseError extends Error {
      code = "23505";
      constraint = "users_email_key";
      table = "users";
      detail = "Key (email)=(pilot@example.com) already exists.";
    }
    const out = serializeError(new DatabaseError('duplicate key value violates unique constraint "users_email_key"'));
    expect(out).toMatchObject({ type: "DatabaseError", code: "23505", constraint: "users_email_key", table: "users" });
    expect(out.stack).toBeString();
    expect(JSON.stringify(out)).not.toContain("pilot@example.com");
    expect(out).not.toHaveProperty("detail");
  });

  test("a Google API error keeps its status, never the request", () => {
    const error = Object.assign(new Error("Insufficient Permission"), {
      code: 403,
      response: { status: 403, data: { to: "pilot@example.com" } },
      config: { headers: { Authorization: "Bearer ya29.secret-token-value" }, data: "raw mime" },
    });
    const out = serializeError(error);
    expect(out).toMatchObject({ message: "Insufficient Permission", code: 403, status: 403 });
    const text = JSON.stringify(out);
    expect(text).not.toContain("ya29");
    expect(text).not.toContain("pilot@example.com");
    expect(text).not.toContain("raw mime");
  });

  test("causes are followed, and thrown non-errors are kept as text", () => {
    const out = serializeError(new Error("outer", { cause: new RangeError("inner") }));
    expect(out.cause).toMatchObject({ type: "RangeError", message: "inner" });
    expect(serializeError("plain string")).toEqual({ type: "string", message: "plain string" });
  });

  test("err in the context is serialized even when it isn't an Error", () => {
    const { log, records } = capture();
    log.error("Failed", { err: { response: { headers: { cookie: "x" } } } });
    expect(records()[0].err).toEqual({ type: "object", message: "[object Object]" });
  });
});

describe("pretty format", () => {
  test("is one readable line with the stack below", () => {
    const lines: string[] = [];
    const log = createLogger({ level: "trace", format: "pretty", write: (line) => lines.push(line), now: fixedNow });
    log.child({ module: "auth" }).error("Failed", { err: new Error("boom"), userId: 3 });
    expect(lines[0].split("\n")[0]).toBe('12:00:00.000 ERROR [auth] Failed {"userId":3}');
    expect(lines[0]).toContain("Error: boom");
  });
});

describe("console bridge", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  test("turns console calls into records with levels", () => {
    const { log, records } = capture();
    restore = installConsoleBridge(log);
    console.log("Ready in %dms", 120);
    console.warn("Careful", { email: "pilot@example.com", count: 2 });
    console.error("⨯ Error in route", new Error("db down"));
    restore();
    restore = undefined;
    const [ready, careful, failed] = records();
    expect(ready).toMatchObject({ level: "info", msg: "Ready in 120ms" });
    expect(careful).toMatchObject({ level: "warn", msg: "Careful", data: [{ email: REDACTED, count: 2 }] });
    expect(failed).toMatchObject({ level: "error", msg: "⨯ Error in route", err: { type: "Error", message: "db down" } });
  });

  test("is removed by the function it returns", () => {
    const before = console.error;
    const { log } = capture();
    restore = installConsoleBridge(log);
    expect(console.error).not.toBe(before);
    restore();
    restore = undefined;
    expect(console.error).toBe(before);
  });
});
