"use server";

import { auth } from "@/auth";
import pool from "@/utilities/db";
import { hasPermission } from "@/utilities/roles";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcrypt";

export interface User {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: "admin" | "user" | "guest";
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  auth_provider: string;
  google_id: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(searchQuery?: string): Promise<User[] | null> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "VIEW_USER_LIST")) {
      throw new Error("Ei oikeuksia");
    }

    let users;
    if (searchQuery && searchQuery.trim() !== "") {
      const query = `%${searchQuery.trim()}%`;
      users = await pool.query(
        `SELECT
          id, name, full_name, email, role, phone, address, city, postal_code,
          auth_provider, google_id, avatar_url, email_verified, last_login, created_at
        FROM users
        WHERE
          name ILIKE $1 OR
          full_name ILIKE $1 OR
          email ILIKE $1
        ORDER BY created_at DESC`,
        [query]
      );
    } else {
      users = await pool.query(
        `SELECT
          id, name, full_name, email, role, phone, address, city, postal_code,
          auth_provider, google_id, avatar_url, email_verified, last_login, created_at
        FROM users
        ORDER BY created_at DESC`
      );
    }

    return users.rows as User[];
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: "admin" | "user" | "guest"
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "CHANGE_USER_ROLE")) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Prevent changing own role
    if (session.user.id === userId) {
      return { success: false, error: "Et voi muuttaa omaa rooliasi" };
    }

    await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2",
      [newRole, userId]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Roolin päivitys epäonnistui" };
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "DELETE_USER")) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Prevent deleting own account
    if (session.user.id === userId) {
      return { success: false, error: "Et voi poistaa omaa tiliäsi" };
    }

    // Check if user is a system user (e.g., vieras@savonlinnanlentokerho.fi)
    const userResult = await pool.query(
      "SELECT email, auth_provider FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (user.auth_provider === "system" || user.email === "vieras@savonlinnanlentokerho.fi") {
        return { success: false, error: "Järjestelmäkäyttäjää ei voi poistaa" };
      }
    }

    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [userId]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Käyttäjän poisto epäonnistui" };
  }
}

/**
 * Get single user details (admin only)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "VIEW_USER_LIST")) {
      throw new Error("Ei oikeuksia");
    }

    const result = await pool.query(
      `SELECT
        id, name, full_name, email, role, phone, address, city, postal_code,
        auth_provider, google_id, avatar_url, email_verified, last_login, created_at
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Create new user with credentials (admin only)
 */
export async function createCredentialUser(formData: {
  email: string;
  password: string;
  name: string;
  full_name: string;
  role: "admin" | "user" | "guest";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "VIEW_USER_LIST")) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Validate inputs
    if (!formData.email || !formData.password || !formData.name || !formData.full_name) {
      return { success: false, error: "Kaikki kentät ovat pakollisia" };
    }

    if (formData.password.length < 8) {
      return { success: false, error: "Salasanan tulee olla vähintään 8 merkkiä pitkä" };
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [formData.email]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, error: "Käyttäjä tällä sähköpostilla on jo olemassa" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(formData.password, 10);

    // Create user
    await pool.query(
      `INSERT INTO users (email, password, name, full_name, role, auth_provider, email_verified, phone, address, city, postal_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '', '', '', '')`,
      [
        formData.email,
        hashedPassword,
        formData.name,
        formData.full_name,
        formData.role,
        "credentials",
        true,
      ]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Käyttäjän luonti epäonnistui" };
  }
}

/**
 * Reset password for credential user (admin only)
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.role || !hasPermission(session.user.role, "VIEW_USER_LIST")) {
      return { success: false, error: "Ei oikeuksia" };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Salasanan tulee olla vähintään 8 merkkiä pitkä" };
    }

    // Verify user exists and uses credentials auth
    const userResult = await pool.query(
      "SELECT auth_provider FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: "Käyttäjää ei löytynyt" };
    }

    if (userResult.rows[0].auth_provider !== "credentials") {
      return { success: false, error: "Salasanan voi vaihtaa vain salasanakäyttäjille" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Salasanan vaihto epäonnistui" };
  }
}
