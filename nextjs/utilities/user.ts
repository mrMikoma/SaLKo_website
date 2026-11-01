import { auth } from "@/auth";
import { UserData } from "./definitions";
import connectionPool from "./db";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "user" });

/**
 * Get complete user data from the database
 * Uses NextAuth session for authentication
 */
export async function getUserData(): Promise<UserData | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const userData = await connectionPool.query(
      "SELECT name, email, roles, full_name, phone, address, postal_code, city, auth_provider FROM users WHERE id = $1",
      [session.user.id]
    );

    if (userData.rowCount === 0) {
      return null;
    }
    const user = userData.rows[0];
    return {
      name: user.name,
      email: user.email,
      roles: user.roles,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      postalCode: user.postal_code,
      city: user.city,
      auth_provider: user.auth_provider,
    };
  } catch (error) {
    log.error("Fetching user info failed", { err: error });
    return null;
  }
}

/**
 * Get user roles from NextAuth session
 * This is more efficient than querying the database
 */
export async function getUserRoles(): Promise<string[] | null> {
  try {
    const session = await auth();
    if (!session?.user?.roles) {
      return null;
    }
    return session.user.roles;
  } catch (error) {
    log.error("Fetching user roles failed", { err: error });
    return null;
  }
}

/**
 * Get user name from NextAuth session
 * This is more efficient than querying the database
 */
export async function getUserName(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.name) {
      return null;
    }
    return session.user.name;
  } catch (error) {
    log.error("Fetching user name failed", { err: error });
    return null;
  }
}

/**
 * Get user ID from NextAuth session
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user.id;
  } catch (error) {
    log.error("Fetching user ID failed", { err: error });
    return null;
  }
}
