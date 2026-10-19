import bcrypt from "bcrypt";
import { Pool } from "pg";

type Role = "user" | "admin";

export type Account = {
  role: Role;
  email: string;
  password: string;
  // Created by auth.setup.ts; false for accounts supplied through env vars
  seed: boolean;
  storageState: string;
};

// Only used for accounts this suite creates in a local database
const LOCAL_PASSWORD = "E2e-local-pass1!";

// Seeding writes to the users table, so it only ever runs against a database
// on this machine or on a Docker bridge network (172.16.0.0/12).
function isLocalDatabase(): boolean {
  const connectionString = process.env.DATABASE_CONNECTION_STRING;
  if (!connectionString) return false;
  const host = new URL(connectionString).hostname;
  return (
    ["localhost", "127.0.0.1", "[::1]"].includes(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function account(role: Role, envPrefix: string): Account | null {
  const storageState = `playwright/.auth/${role}.json`;
  const email = process.env[`${envPrefix}_EMAIL`];
  const password = process.env[`${envPrefix}_PASSWORD`];
  if (email && password) {
    return { role, email, password, seed: false, storageState };
  }
  if (isLocalDatabase()) {
    const localEmail = `e2e-${role}@salko.invalid`;
    return { role, email: localEmail, password: LOCAL_PASSWORD, seed: true, storageState };
  }
  return null;
}

export const accounts = {
  user: account("user", "E2E_USER"),
  admin: account("admin", "E2E_ADMIN"),
};

export async function seedAccount({ role, email, password }: Account) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
  });
  try {
    await pool.query(
      `INSERT INTO users (roles, name, full_name, email, password, auth_provider, email_verified)
       VALUES ($1, $2, $3, $4, $5, 'credentials', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET roles = EXCLUDED.roles, password = EXCLUDED.password`,
      [[role], `e2e-${role}`, `E2E ${role}`, email, await bcrypt.hash(password, 10)]
    );
  } finally {
    await pool.end();
  }
}
