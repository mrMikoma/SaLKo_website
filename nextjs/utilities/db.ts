import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

// Only create pool if we have a valid connection string and we're not in CI
const shouldCreatePool =
  process.env.DATABASE_CONNECTION_STRING && !process.env.CI;

const connectionPool = shouldCreatePool
  ? new Pool({
      connectionString: process.env.DATABASE_CONNECTION_STRING,
    })
  : null;

export default connectionPool;
