import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionPool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_STRING,
});

export default connectionPool;
