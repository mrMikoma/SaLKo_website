import { Pool } from "pg";
import * as dotenv from "dotenv";

// quiet: dotenv 17 otherwise prints a tip line on every load, in every request log
dotenv.config({ quiet: true });

// Only create pool if we have a valid connection string and we're not in CI
const shouldCreatePool =
  process.env.DATABASE_CONNECTION_STRING && !process.env.CI;

const connectionPool = shouldCreatePool
  ? new Pool({
      connectionString: process.env.DATABASE_CONNECTION_STRING,
      // When every connection is busy, fail the request after a while
      // instead of leaving it waiting with no end
      connectionTimeoutMillis: 15_000,
      // Nor wait forever for a query stuck behind a lock (Postgres cancels it)
      // or a database that stopped answering (the client gives up). Above the
      // longest lock wait the code sets itself, the flight sync's 30 s.
      statement_timeout: 60_000,
      query_timeout: 65_000,
    })
  : null;

export default connectionPool;
