import { Pool } from "pg";

// Database connection pool with timeout settings
const connectionPool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_STRING,
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
  idleTimeoutMillis: 10000, // 10 seconds idle timeout
  max: 2, // Maximum 2 connections for cronjob
});

// Handle connection errors
connectionPool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

export default connectionPool;
