import { NextResponse } from "next/server";
import pool from "@/utilities/db";

/**
 * For the monitoring's uptime probes (monitoring/blackbox/blackbox.yml): 200
 * when the app answers and its database does, 503 otherwise. Anyone can call
 * it, so it tells nothing more than that.
 */
const DATABASE_TIMEOUT_MS = 3000;

export async function GET() {
  const ok = await databaseAnswers();
  return NextResponse.json(
    { status: ok ? "ok" : "unavailable" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

async function databaseAnswers(): Promise<boolean> {
  if (!pool) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), DATABASE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([pool.query("SELECT 1").then(() => true), timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
