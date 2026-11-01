/**
 * Server-side logging. Every record is one JSON object on one line of stdout,
 * which Docker keeps and the monitoring stack's agent ships to Loki:
 *
 *   {"time":"2026-10-31T12:00:00.000Z","level":"error","msg":"Sending the invoice failed",
 *    "module":"invoices","invoiceId":12,"err":{"type":"GaxiosError","message":"...","status":403}}
 *
 * Levels, lowest first, with the same names and numbers as pino and the
 * RFC 5424 severities they stand for:
 *
 *   trace (10)  step-by-step detail while hunting a bug; never on in production
 *   debug (20)  diagnostic detail: inputs, decisions, timings
 *   info  (30)  normal events worth keeping: a sync finished, a mail was sent
 *   warn  (40)  something unexpected that the code handled: a refused login,
 *               an upstream that answered 5xx, a missing optional setting
 *   error (50)  an operation failed and the user saw an error or got nothing
 *   fatal (60)  the process cannot go on (configuration, startup)
 *
 * LOG_LEVEL sets the lowest level written (default info in production, debug
 * elsewhere, warn under the unit tests; "silent" writes nothing). LOG_FORMAT
 * is json (default in production) or pretty (default elsewhere).
 *
 * No personal data or secrets in the logs: context fields whose names say
 * what they hold (email, password, token, phone, address, name...) are
 * replaced with "[REDACTED]", and every string, the message and error texts
 * included, has email addresses, bearer and JSON web tokens, URL credentials,
 * private keys and personal identity codes masked. Errors keep only their
 * type, message, code, status and stack: an error object can carry much more,
 * such as a database row in a pg error's `detail` or the whole request,
 * headers and all, in a Google API error. Still, log IDs (a user's, an
 * invoice's), not the people behind them.
 *
 * Use it on the server only. In a module: `const log = logger.child({ module: "billing" })`,
 * then `log.error("Closing the billing period failed", { err: error, periodId })`.
 */

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const SEVERITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export type LogContext = Record<string, unknown>;
export type LogFormat = "json" | "pretty";

export interface Logger {
  trace(msg: string, context?: LogContext | Error): void;
  debug(msg: string, context?: LogContext | Error): void;
  info(msg: string, context?: LogContext | Error): void;
  warn(msg: string, context?: LogContext | Error): void;
  error(msg: string, context?: LogContext | Error): void;
  fatal(msg: string, context?: LogContext | Error): void;
  /** A logger that adds these fields to every record, e.g. `{ module: "auth" }` */
  child(bindings: LogContext): Logger;
  isLevelEnabled(level: LogLevel): boolean;
}

export interface LoggerOptions {
  /** Lowest level written, or "silent" */
  level?: LogLevel | "silent";
  format?: LogFormat;
  /** Where finished lines go (default: stdout) */
  write?: (line: string) => void;
  /** For tests: the clock */
  now?: () => Date;
}

export const REDACTED = "[REDACTED]";

// ---------------------------------------------------------------------------
// Redaction

/**
 * Context keys whose values never reach the log, compared without case,
 * dashes or underscores ("set-cookie" is "setcookie"). A key also counts when
 * it ends in one of SENSITIVE_SUFFIXES, as `newPassword` and `toEmail` do.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "authorization",
  "auth",
  "cookie",
  "cookies",
  "credential",
  "credentials",
  "apikey",
  "privatekey",
  "jwt",
  "otp",
  "email",
  "phone",
  "phonenumber",
  "puhelin",
  "address",
  "osoite",
  "postalcode",
  "ip",
  "hetu",
  "ssn",
  "fullname",
  "firstname",
  "lastname",
  "displayname",
  "body",
  "bodytext",
  "bodyhtml",
]);

const SENSITIVE_SUFFIXES = [
  "password",
  "secret",
  "token",
  "apikey",
  "privatekey",
  "cookie",
  "email",
  "address",
  "phone",
  "fullname",
  "dsn",
  "connectionstring",
  "databaseurl",
];

export function isSensitiveKey(key: string): boolean {
  const normal = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SENSITIVE_KEYS.has(normal)) return true;
  return SENSITIVE_SUFFIXES.some((suffix) => normal.endsWith(suffix));
}

/** Patterns masked in every string that is logged: [pattern, replacement] */
const SCRUBBERS: [RegExp, string][] = [
  // PEM private keys, e.g. a service account's key file
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, "[private-key]"],
  // user:password@ in connection strings and URLs
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]*@/gi, "$1[REDACTED]@"],
  // Authorization header values
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, "$1 [REDACTED]"],
  // JSON web tokens (a session cookie, a Google ID token)
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[jwt]"],
  // Google OAuth access and refresh tokens, API keys
  [/\bya29\.[A-Za-z0-9._-]+/g, "[google-token]"],
  [/(^|[^A-Za-z0-9])1\/\/[A-Za-z0-9_-]{20,}/g, "$1[google-token]"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, "[google-key]"],
  // Secrets in query strings (a password reset link carries its token there)
  [/([?&](?:token|code|key|secret|password|signature|sig|access_token|refresh_token)=)[^&\s#"']+/gi, "$1[REDACTED]"],
  // Email addresses
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "[email]"],
  // Finnish personal identity codes (henkilötunnus)
  [/\b[0-3]\d[01]\d\d{2}[-+A-FU-Y]\d{3}[0-9A-FHJ-NPR-Y]\b/g, "[hetu]"],
];

const MAX_STRING = 2000;
const MAX_STACK_LINES = 20;
const MAX_DEPTH = 5;
const MAX_KEYS = 50;
const MAX_ITEMS = 50;

/** Masks secrets and personal data in a string, and cuts it to a sane length */
export function scrub(text: string): string {
  let out = text.length > MAX_STRING * 2 ? text.slice(0, MAX_STRING * 2) : text;
  for (const [pattern, replacement] of SCRUBBERS) {
    out = out.replace(pattern, replacement);
  }
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…[truncated]` : out;
}

/** What is kept of an error: never its data, request or response */
export function serializeError(error: unknown, depth = 0): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: scrub(String(error)) };
  }
  const e = error as Error & Record<string, unknown>;
  const ctorName = e.constructor?.name;
  const out: Record<string, unknown> = {
    type: ctorName && ctorName !== "Object" && ctorName !== "Error" ? ctorName : e.name || "Error",
    message: scrub(e.message ?? ""),
  };
  if (typeof e.code === "string" || typeof e.code === "number") out.code = e.code;
  const response = e.response as { status?: unknown } | undefined;
  if (typeof e.status === "number") out.status = e.status;
  else if (typeof response?.status === "number") out.status = response.status;
  // The digest a Next.js error page shows the user, to find the record
  if (typeof e.digest === "string") out.digest = e.digest;
  // node-postgres: which constraint or table, never `detail`, which can hold
  // the row's values (Key (email)=(...) already exists)
  for (const key of ["constraint", "table", "column", "routine"]) {
    if (typeof e[key] === "string") out[key] = e[key];
  }
  if (typeof e.stack === "string") {
    out.stack = scrub(e.stack.split("\n").slice(0, MAX_STACK_LINES).join("\n"));
  }
  if (e.cause !== undefined && depth < 3) {
    out.cause = serializeError(e.cause, depth + 1);
  }
  if (error instanceof AggregateError && depth < 3) {
    out.errors = error.errors.slice(0, 10).map((inner) => serializeError(inner, depth + 1));
  }
  return out;
}

/** A JSON-safe copy of a logged value, with sensitive keys redacted */
export function sanitize(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  switch (typeof value) {
    case "string":
      return scrub(value);
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "function":
      return "[Function]";
    case "symbol":
      return value.toString();
  }
  if (value instanceof Error) return serializeError(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value instanceof URL) return scrub(value.toString());
  if (ArrayBuffer.isView(value)) return `[binary ${value.byteLength} bytes]`;

  const object = value as object;
  if (seen.has(object)) return "[Circular]";
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? "[Array]" : "[Object]";
  seen.add(object);
  try {
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ITEMS).map((item) => sanitize(item, depth + 1, seen));
      if (value.length > MAX_ITEMS) items.push(`…(${value.length - MAX_ITEMS} more)`);
      return items;
    }
    if (value instanceof Map) {
      return sanitize(Object.fromEntries(value), depth, seen);
    }
    if (value instanceof Set) {
      return sanitize([...value], depth, seen);
    }
    const out: Record<string, unknown> = {};
    const keys = Object.keys(value);
    for (const key of keys.slice(0, MAX_KEYS)) {
      out[key] = isSensitiveKey(key) ? REDACTED : sanitize((value as Record<string, unknown>)[key], depth + 1, seen);
    }
    if (keys.length > MAX_KEYS) out["…"] = `${keys.length - MAX_KEYS} more keys`;
    return out;
  } finally {
    seen.delete(object);
  }
}

// ---------------------------------------------------------------------------
// Records and formats

// Fields every record has; context can't overwrite them
const RESERVED = new Set(["time", "level", "msg"]);

function buildRecord(level: LogLevel, msg: string, bindings: LogContext, context: LogContext | Error | undefined, now: Date) {
  const record: Record<string, unknown> = {
    time: now.toISOString(),
    level,
    msg: scrub(msg),
  };
  const fields = context instanceof Error ? { err: context } : context;
  for (const source of [bindings, fields]) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (RESERVED.has(key) || value === undefined) continue;
      if (key === "err") {
        record.err = serializeError(value);
      } else {
        record[key] = isSensitiveKey(key) ? REDACTED : sanitize(value, 1);
      }
    }
  }
  return record;
}

const COLORS: Record<LogLevel, string> = {
  trace: "\x1b[90m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[35m",
};

/** One readable line for the terminal under `bun dev`, the stack below it */
function pretty(record: Record<string, unknown>, color: boolean): string {
  const { time, level, msg, module, err, ...rest } = record as Record<string, unknown> & { level: LogLevel };
  const clock = String(time).slice(11, 23);
  const tag = level.toUpperCase().padEnd(5);
  const head = color ? `${COLORS[level]}${tag}\x1b[0m` : tag;
  const where = module ? ` [${module}]` : "";
  const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  let line = `${clock} ${head}${where} ${msg}${extra}`;
  if (err && typeof err === "object") {
    const { stack, type, message, ...details } = err as Record<string, unknown>;
    const more = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
    line += `\n  ${stack ?? `${type}: ${message}`}${more}`;
  }
  return line;
}

function safeStringify(record: Record<string, unknown>): string {
  try {
    return JSON.stringify(record);
  } catch {
    return JSON.stringify({ time: record.time, level: record.level, msg: record.msg, logError: "unserializable context" });
  }
}

// ---------------------------------------------------------------------------
// The logger

function envLevel(): LogLevel | "silent" {
  const wanted = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (wanted === "silent" || (LOG_LEVELS as readonly string[]).includes(wanted ?? "")) {
    return wanted as LogLevel | "silent";
  }
  if (process.env.NODE_ENV === "production") return "info";
  if (process.env.NODE_ENV === "test") return "warn";
  return "debug";
}

function envFormat(): LogFormat {
  const wanted = process.env.LOG_FORMAT?.trim().toLowerCase();
  if (wanted === "json" || wanted === "pretty") return wanted;
  return process.env.NODE_ENV === "production" ? "json" : "pretty";
}

// The console as it was before installConsoleBridge(), so that writing a log
// line never goes through the bridge again
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace,
};

function defaultWrite(line: string) {
  if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
    process.stdout.write(`${line}\n`);
  } else {
    originalConsole.log(line);
  }
}

export function createLogger(options: LoggerOptions = {}, bindings: LogContext = {}): Logger {
  const threshold = options.level ?? envLevel();
  const format = options.format ?? envFormat();
  const write = options.write ?? defaultWrite;
  const now = options.now ?? (() => new Date());
  const color = format === "pretty" && !options.write && typeof process !== "undefined" && !!process.stdout?.isTTY;
  const minimum = threshold === "silent" ? Infinity : SEVERITY[threshold];

  const emit = (level: LogLevel, msg: string, context?: LogContext | Error) => {
    if (SEVERITY[level] < minimum) return;
    try {
      const record = buildRecord(level, msg, bindings, context, now());
      write(format === "json" ? safeStringify(record) : pretty(record, color));
    } catch {
      // Logging must never break the request that logs
    }
  };

  return {
    trace: (msg, context) => emit("trace", msg, context),
    debug: (msg, context) => emit("debug", msg, context),
    info: (msg, context) => emit("info", msg, context),
    warn: (msg, context) => emit("warn", msg, context),
    error: (msg, context) => emit("error", msg, context),
    fatal: (msg, context) => emit("fatal", msg, context),
    child: (more) => createLogger(options, { ...bindings, ...more }),
    isLevelEnabled: (level) => SEVERITY[level] >= minimum,
  };
}

/** The app's logger; make one per module with `logger.child({ module })` */
export const logger: Logger = createLogger();

// ---------------------------------------------------------------------------
// console.* from Next.js and libraries

const CONSOLE_LEVELS: Record<keyof typeof originalConsole, LogLevel> = {
  trace: "trace",
  debug: "debug",
  log: "info",
  info: "info",
  warn: "warn",
  error: "error",
};

/** console.log("Saved %d rows for %s", 3, "x"): the printf-style placeholders */
function formatArgs(args: unknown[]): { msg: string; err?: unknown; data?: unknown[] } {
  let err: unknown;
  const parts: string[] = [];
  const data: unknown[] = [];
  let rest = args;
  if (typeof args[0] === "string" && /%[sdifjoOc%]/.test(args[0])) {
    let index = 1;
    const head = args[0].replace(/%([sdifjoOc%])/g, (match, kind: string) => {
      if (kind === "%") return "%";
      if (index >= args.length) return match;
      const value = args[index++];
      if (kind === "c") return "";
      if (kind === "d" || kind === "i") return String(Number.parseInt(String(value), 10));
      if (kind === "f") return String(Number(value));
      if (value instanceof Error) {
        err ??= value;
        return value.message;
      }
      return typeof value === "string" ? value : safeJson(value);
    });
    parts.push(head);
    rest = args.slice(index);
  }
  for (const arg of rest) {
    if (arg instanceof Error) {
      if (err === undefined) err = arg;
      else data.push(arg);
    } else if (typeof arg === "string") {
      parts.push(arg);
    } else if (arg === null || typeof arg !== "object") {
      parts.push(String(arg));
    } else {
      data.push(arg);
    }
  }
  const msg = parts.join(" ").trim() || (err instanceof Error ? err.message : "");
  return { msg, err, data: data.length ? data : undefined };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(sanitize(value));
  } catch {
    return String(value);
  }
}

let bridged = false;

/**
 * Sends console.* through the logger, so that what Next.js and libraries
 * print (Next's "⨯ Error: ..." for a failed request among them) is JSON with
 * a level and goes through the same redaction. instrumentation.ts installs it
 * when the format is json, i.e. in the containers; `bun dev` keeps the plain
 * console.
 */
export function installConsoleBridge(target: Logger = logger.child({ module: "console" })): () => void {
  if (bridged) return () => {};
  bridged = true;
  let busy = false;
  for (const method of Object.keys(CONSOLE_LEVELS) as (keyof typeof originalConsole)[]) {
    const level = CONSOLE_LEVELS[method];
    console[method] = (...args: unknown[]) => {
      if (busy) {
        originalConsole[method](...args);
        return;
      }
      busy = true;
      try {
        const { msg, err, data } = formatArgs(args);
        target[level](msg, { err, data });
      } finally {
        busy = false;
      }
    };
  }
  return () => {
    Object.assign(console, originalConsole);
    bridged = false;
  };
}
