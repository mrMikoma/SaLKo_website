import { auth } from "@/auth";
import { UserData } from "./definitions";
import connectionPool from "./db";

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
      "SELECT name, email, role, full_name, phone, address, postal_code, city FROM users WHERE id = $1",
      [session.user.id]
    );

    if (userData.rowCount === 0) {
      return null;
    }
    const user = userData.rows[0];
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      postalCode: user.postal_code,
      city: user.city,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

/**
 * Get user role from NextAuth session
 * This is more efficient than querying the database
 */
export async function getUserRole(): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.role) {
      return null;
    }
    return session.user.role;
  } catch (error) {
    console.error("Error fetching user role:", error);
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
    console.error("Error fetching user name:", error);
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
    console.error("Error fetching user ID:", error);
    return null;
  }
}
