import { Pool, PoolClient } from "pg";

let connectionPool: Pool | null = null;

/**
 * Creates a fresh database connection pool for each cronjob run.
 * This ensures no stale connections or cached data are used.
 */
export function createConnectionPool(): Pool {
  // Close existing pool if it exists
  if (connectionPool) {
    connectionPool.removeAllListeners();
    connectionPool.end().catch((err) => {
      console.error("Error closing previous pool:", err);
    });
  }

  // Create a new pool with fresh connections
  connectionPool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
    connectionTimeoutMillis: 5000, // 5 seconds connection timeout
    idleTimeoutMillis: 5000, // 5 seconds idle timeout (short for cronjobs)
    max: 2, // Maximum 2 connections for cronjob
    allowExitOnIdle: true, // Allow process to exit when connections are idle
  });

  // Handle connection errors
  connectionPool.on("error", (err) => {
    console.error("Unexpected database error:", err);
  });

  return connectionPool;
}

/**
 * Gets the current connection pool or creates a new one if none exists.
 * Always creates fresh connections for cronjob execution.
 */
export function getConnectionPool(): Pool {
  if (!connectionPool) {
    return createConnectionPool();
  }
  return connectionPool;
}

/**
 * Closes the database connection pool and cleans up all connections.
 * Should be called at the end of cronjob execution.
 */
export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    connectionPool.removeAllListeners();
    await connectionPool.end();
    connectionPool = null;
    console.log("Database connection pool closed successfully");
  }
}
