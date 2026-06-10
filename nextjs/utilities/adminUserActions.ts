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
  roles: string[];
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
export async function getAllUsers(
  searchQuery?: string,
): Promise<User[] | null> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "VIEW_USER_LIST")
    ) {
      throw new Error("Ei oikeuksia");
    }

    let users;
    if (searchQuery && searchQuery.trim() !== "") {
      const query = `%${searchQuery.trim()}%`;
      users = await pool.query(
        `SELECT
          id, name, full_name, email, roles, phone, address, city, postal_code,
          auth_provider, google_id, avatar_url, email_verified, last_login, created_at
        FROM users
        WHERE
          name ILIKE $1 OR
          full_name ILIKE $1 OR
          email ILIKE $1
        ORDER BY created_at DESC`,
        [query],
      );
    } else {
      users = await pool.query(
        `SELECT
          id, name, full_name, email, roles, phone, address, city, postal_code,
          auth_provider, google_id, avatar_url, email_verified, last_login, created_at
        FROM users
        ORDER BY created_at DESC`,
      );
    }

    return users.rows as User[];
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
}

/**
 * Update user roles (admin only)
 */
export async function updateUserRoles(
  userId: string,
  newRoles: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "CHANGE_USER_ROLE")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Prevent changing own roles
    if (session.user.id === userId) {
      return { success: false, error: "Et voi muuttaa omaa rooliasi" };
    }

    // Validate roles
    const validRoles = ["admin", "user", "guest"];
    const filteredRoles = newRoles.filter((role) => validRoles.includes(role));
    if (filteredRoles.length === 0) {
      return {
        success: false,
        error: "Käyttäjällä täytyy olla vähintään yksi rooli",
      };
    }

    await pool.query("UPDATE users SET roles = $1 WHERE id = $2", [
      filteredRoles,
      userId,
    ]);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user roles:", error);
    return { success: false, error: "Roolien päivitys epäonnistui" };
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "DELETE_USER")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Prevent deleting own account
    if (session.user.id === userId) {
      return { success: false, error: "Et voi poistaa omaa tiliäsi" };
    }

    // Check if user is a system user (e.g., vieras@savonlinnanlentokerho.fi)
    const userResult = await pool.query(
      "SELECT email, auth_provider FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (
        user.auth_provider === "system" ||
        user.email === "vieras@savonlinnanlentokerho.fi"
      ) {
        return { success: false, error: "Järjestelmäkäyttäjää ei voi poistaa" };
      }
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

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

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "VIEW_USER_LIST")
    ) {
      throw new Error("Ei oikeuksia");
    }

    const result = await pool.query(
      `SELECT
        id, name, full_name, email, roles, phone, address, city, postal_code,
        auth_provider, google_id, avatar_url, email_verified, last_login, created_at
      FROM users
      WHERE id = $1`,
      [userId],
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
 * Password is optional for guest-only users (they cannot log in anyway)
 */
export async function createCredentialUser(formData: {
  email: string;
  password?: string;
  name: string;
  full_name: string;
  roles: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "CREATE_USER")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Validate roles first
    const validRoles = ["admin", "user", "guest"];
    const filteredRoles = formData.roles.filter((role) =>
      validRoles.includes(role),
    );
    if (filteredRoles.length === 0) {
      return {
        success: false,
        error: "Käyttäjällä täytyy olla vähintään yksi rooli",
      };
    }

    // Check if this is a guest-only user (cannot log in, password not needed)
    const isGuestOnly =
      filteredRoles.length === 1 && filteredRoles[0] === "guest";

    // Validate inputs
    if (!formData.email || !formData.name || !formData.full_name) {
      return {
        success: false,
        error: "Sähköposti, nimi ja koko nimi ovat pakollisia",
      };
    }

    // Password is required for users who can log in (not guest-only)
    if (!isGuestOnly) {
      if (!formData.password || formData.password.length < 8) {
        return {
          success: false,
          error: "Salasanan tulee olla vähintään 8 merkkiä pitkä",
        };
      }
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [formData.email],
    );

    if (existingUser.rows.length > 0) {
      return {
        success: false,
        error: "Käyttäjä tällä sähköpostilla on jo olemassa",
      };
    }

    // Hash password if provided, otherwise null for guest-only users
    const hashedPassword = formData.password
      ? await bcrypt.hash(formData.password, 10)
      : null;

    // Create user
    await pool.query(
      `INSERT INTO users (email, password, name, full_name, roles, auth_provider, email_verified, phone, address, city, postal_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '', '', '', '')`,
      [
        formData.email,
        hashedPassword,
        formData.name,
        formData.full_name,
        filteredRoles,
        "credentials",
        true,
      ],
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
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "EDIT_USER")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: "Salasanan tulee olla vähintään 8 merkkiä pitkä",
      };
    }

    // Verify user exists and uses credentials auth
    const userResult = await pool.query(
      "SELECT auth_provider FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: "Käyttäjää ei löytynyt" };
    }

    if (userResult.rows[0].auth_provider !== "credentials") {
      return {
        success: false,
        error: "Salasanan voi vaihtaa vain salasanakäyttäjille",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Salasanan vaihto epäonnistui" };
  }
}

/**
 * Update guest user info (admin only)
 * Only allows editing users with "guest" role
 */
export async function updateGuestUserInfo(
  userId: string,
  data: {
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (
      !session?.user?.roles ||
      !hasPermission(session.user.roles, "EDIT_USER")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    // Verify user exists and has guest role
    const userResult = await pool.query(
      "SELECT roles, email, auth_provider FROM users WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: "Käyttäjää ei löytynyt" };
    }

    const user = userResult.rows[0];

    // Only allow editing guest role users
    if (!user.roles.includes("guest")) {
      return {
        success: false,
        error: "Vain vieraskäyttäjien tietoja voi muokata",
      };
    }

    // Prevent editing system guest user
    if (
      user.auth_provider === "system" ||
      user.email === "vieras@savonlinnanlentokerho.fi"
    ) {
      return {
        success: false,
        error: "Järjestelmäkäyttäjän tietoja ei voi muokata",
      };
    }

    // If email is being changed, check for uniqueness
    if (data.email && data.email !== user.email) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [data.email, userId],
      );
      if (existingUser.rows.length > 0) {
        return { success: false, error: "Sähköpostiosoite on jo käytössä" };
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(data.address);
    }
    if (data.city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(data.city);
    }
    if (data.postal_code !== undefined) {
      updates.push(`postal_code = $${paramIndex++}`);
      values.push(data.postal_code);
    }

    if (updates.length === 0) {
      return { success: false, error: "Ei muutettavia tietoja" };
    }

    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values,
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating guest user info:", error);
    return { success: false, error: "Käyttäjän tietojen päivitys epäonnistui" };
  }
}
