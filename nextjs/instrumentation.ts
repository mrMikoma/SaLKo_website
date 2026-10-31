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
