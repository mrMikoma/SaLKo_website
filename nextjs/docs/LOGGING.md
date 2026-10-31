# Logging

Server code logs through `utilities/logger.ts`. In the containers each record
is one JSON line on stdout. The monitoring agent ships it to Loki, and Grafana
shows it by level (`monitoring/README.md`).

```json
{"time":"2026-10-31T12:00:00.000Z","level":"error","msg":"Sending an invoice failed","module":"invoices","invoiceId":12,"err":{"type":"GaxiosError","message":"Insufficient Permission","code":403,"status":403,"stack":"..."}}
```

## Writing a log line

```ts
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "billing" });

log.info("Billing period closed", { periodId, payers: rows.length });
log.error("Closing billing period failed", { err: error, periodId });
```

- The message is a fixed sentence: `"Sending an invoice failed"`, not `` `Error sending invoice ${id}` ``. Values go in the context object, so that Grafana can count and filter by message.
- Put errors in `err`. The logger keeps only the type, message, code, HTTP status, Next.js digest, pg constraint/table and the stack.
- Log IDs (`userId`, `invoiceId`, `emailId`), never names, email addresses, phone numbers, addresses, IP addresses, passwords, tokens or message bodies.
- `no-console` is an ESLint error in `utilities/`, `app/api/`, `auth.ts`, `proxy.ts` and `instrumentation.ts`. Client components and the CLI scripts in `scripts/` still use `console`, because their output never reaches the server log.

## Levels

The names and numbers match pino, and through it the RFC 5424 severities.

| Level | Number | Use it for | Examples |
|---|---|---|---|
| `fatal` | 60 | The process cannot go on | missing required configuration at startup |
| `error` | 50 | An operation failed: the user got an error or nothing | a database query, a Google API call or a mail send failed |
| `warn` | 40 | Something unexpected that the code handled | a login refused for too many attempts, Umami answered 5xx, a Google login from outside the Workspace |
| `info` | 30 | Normal events worth keeping | server started, a login, a mail sent, a flight log sync finished |
| `debug` | 20 | Diagnostic detail | a session ended because its token had no user ID |
| `trace` | 10 | Step-by-step detail while hunting a bug | (none in the code; never on in production) |

`LOG_LEVEL` sets the lowest level written: `info` by default in production, `debug` under `bun dev`, `warn` in the unit tests, or `silent`. It can be set per environment through the app container's environment (`docker-compose.{dev,prod}.yaml`). `LOG_FORMAT` is `json` by default in production and `pretty` (one coloured line, with the stack below) under `bun dev`.

## Redaction

The logger works as a safety net. The call sites are still meant not to pass personal data in the first place.

- **Keys:** context values are replaced with `[REDACTED]` at any depth when the key, compared without case, `-` and `_`, is one of: `password`, `secret`, `token`, `authorization`, `cookie`, `apiKey`, `privateKey`, `email`, `phone`, `address`, `ip`, `fullName`, `body`, `hetu` and the like, or ends in `password`, `secret`, `token`, `email`, `address`, `phone`, `fullName`, `dsn`, `connectionString` or `databaseUrl`.
- **Values:** every string, including the message, error messages and stacks, has these masked: email addresses, `Bearer`/`Basic` credentials, JSON web tokens, Google access/refresh tokens and API keys, `user:password@` in URLs, secret query parameters (`?token=`, `?code=`…), PEM private keys and Finnish personal identity codes.
- **Size:** strings are cut at 2000 characters, stacks at 20 lines, objects at 5 levels, 50 keys and 50 array items.

## Console output from Next.js and libraries

In JSON mode, `instrumentation.ts` sends `console.*` through the logger as well (`installConsoleBridge`). Next's own `⨯ Error: …` for a failed request, and anything a library prints, therefore becomes a JSON record with a level (`log`/`info` → info, `warn` → warn, `error` → error) and `"module":"console"`, and goes through the same redaction. Only the few lines Next prints before `register()` runs stay plain text (`▲ Next.js 16…`, `✓ Ready`).

## Tests

`tests/unit/logger.test.ts` covers levels, the record shape, key and value redaction, error serialization (pg and Google API errors) and the console bridge.
