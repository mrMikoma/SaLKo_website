// Runs once when the server starts (Next.js instrumentation hook). In the
// containers, where the logs are JSON for Loki, console.* from Next.js and the
// libraries goes through the app's logger too, so every line has a level and
// passes the same redaction (utilities/logger.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installConsoleBridge, logger } = await import("./utilities/logger");
  const format = process.env.LOG_FORMAT?.trim().toLowerCase();
  if (format === "json" || (!format && process.env.NODE_ENV === "production")) {
    installConsoleBridge();
  }
  logger.child({ module: "server" }).info("Server started", {
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || "default",
  });
}

// Next.js calls this for every request that fails on the server (a page, route
// handler, server action or proxy). One structured `error` record is written
// in addition to Next's own console line (which the bridge also logs, as
// module "console").
export async function onRequestError(
  err: unknown,
  request: { method: string; path: string },
  context: { routerKind: string; routePath: string; routeType: string; renderSource?: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ logger }, { logRequestError }] = await Promise.all([
    import("./utilities/logger"),
    import("./utilities/requestError"),
  ]);
  logRequestError(logger, err, request, context);
}
