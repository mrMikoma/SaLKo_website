"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import pool from "@/utilities/db";
import { hasPermission, PERMISSIONS, validateRoles } from "@/utilities/roles";
import { PasswordSchema } from "@/utilities/definitions";
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
  deactivated_at: string | null;
  // Bookings and bulletins that keep the user from being deleted outright
  booking_count: number;
  bulletin_count: number;
}

type ActionResult = { success: boolean; error?: string };

const SYSTEM_GUEST_EMAIL = "vieras@savonlinnanlentokerho.fi";
const RESET_LINK_HOURS = 24;

const USER_COLUMNS = `
  id, name, full_name, email, roles, phone, address, city, postal_code,
  auth_provider, google_id, avatar_url, email_verified, last_login, created_at,
  deactivated_at,
  (SELECT count(*)::int FROM bookings b WHERE b.user_id = users.id) AS booking_count,
  (SELECT count(*)::int FROM bullets bl WHERE bl.user_id = users.id) AS bulletin_count`;

const isSystemUser = (user: { auth_provider: string; email: string }) =>
  user.auth_provider === "system" || user.email === SYSTEM_GUEST_EMAIL;

/**
 * The session user, when they hold the permission. Admin actions call this
 * before touching the database.
 */
async function requirePermission(permission: keyof typeof PERMISSIONS) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, permission)) {
    return null;
  }
  return session.user;
}

/**
 * Loads the target of an admin action and refuses the actions nobody may do:
 * on the system guest account, and (unless allowed) on your own account
 */
async function loadTarget(
  userId: string,
  actorId: string,
  { allowSelf = false } = {}
): Promise<{ user: User } | { error: string }> {
  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
  if (result.rows.length === 0) {
    return { error: "Käyttäjää ei löytynyt" };
  }
  const user = result.rows[0] as User;
  if (isSystemUser(user)) {
    return { error: "Järjestelmäkäyttäjää ei voi muuttaa" };
  }
  if (!allowSelf && user.id === actorId) {
    return { error: "Et voi tehdä tätä omalle tilillesi" };
  }
  return { user };
}

/**
 * Get all users (admin only); deactivated users come last
 */
export async function getAllUsers(searchQuery?: string): Promise<User[] | null> {
  try {
    if (!(await requirePermission("VIEW_USER_LIST"))) {
      throw new Error("Ei oikeuksia");
    }

    const search = searchQuery?.trim();
    const users = await pool.query(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE $1::text IS NULL OR name ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1
       ORDER BY deactivated_at IS NOT NULL, created_at DESC`,
      [search ? `%${search}%` : null]
    );

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
  newRoles: string[]
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("CHANGE_USER_ROLE");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    if (actor.id === userId) {
      return { success: false, error: "Et voi muuttaa omaa rooliasi" };
    }

    const checked = validateRoles(newRoles);
    if ("error" in checked) {
      return { success: false, error: checked.error };
    }
    const filteredRoles = checked.roles;

    const target = await loadTarget(userId, actor.id);
    if ("error" in target) {
      return { success: false, error: target.error };
    }

    await pool.query("UPDATE users SET roles = $1 WHERE id = $2", [filteredRoles, userId]);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user roles:", error);
    return { success: false, error: "Roolien päivitys epäonnistui" };
  }
}

/**
 * Deactivate a user, or bring them back (admin only). A deactivated user can't
 * log in and their open session ends, but bookings and bulletins stay.
 */
export async function setUserActive(
  userId: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("DELETE_USER");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const target = await loadTarget(userId, actor.id);
    if ("error" in target) {
      return { success: false, error: target.error };
    }

    await pool.query(
      `UPDATE users SET deactivated_at = ${active ? "NULL" : "COALESCE(deactivated_at, NOW())"}
       WHERE id = $1`,
      [userId]
    );

    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error changing user status:", error);
    return { success: false, error: "Käyttäjän tilan muutos epäonnistui" };
  }
}

/**
 * Anonymise a user who asked to be erased (admin only): the personal details
 * go, the account is deactivated, and their bookings stay as "Poistettu
 * käyttäjä". This can't be undone.
 */
export async function anonymizeUser(userId: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("DELETE_USER");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const target = await loadTarget(userId, actor.id);
    if ("error" in target) {
      return { success: false, error: target.error };
    }

    await pool.query(
      `UPDATE users SET
         name = 'poistettu',
         full_name = 'Poistettu käyttäjä',
         email = 'poistettu-' || id || '@salko.invalid',
         phone = '', address = '', city = '', postal_code = '',
         password = NULL, google_id = NULL, avatar_url = NULL,
         deactivated_at = COALESCE(deactivated_at, NOW())
       WHERE id = $1`,
      [userId]
    );
    await pool.query(
      "DELETE FROM verification_tokens WHERE identifier = $1",
      [`password-reset:${userId}`]
    );

    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error anonymizing user:", error);
    return { success: false, error: "Anonymisointi epäonnistui" };
  }
}

/**
 * Delete a user for good (admin only). Only for accounts without bookings or
 * bulletins; anyone with history is deactivated or anonymised instead.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission("DELETE_USER");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const target = await loadTarget(userId, actor.id);
    if ("error" in target) {
      return { success: false, error: target.error };
    }

    const { booking_count, bulletin_count } = target.user;
    if (booking_count > 0 || bulletin_count > 0) {
      return {
        success: false,
        error: `Käyttäjällä on ${booking_count} varausta ja ${bulletin_count} tiedotetta. Poista käyttäjä käytöstä tai anonymisoi hänet.`,
      };
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    revalidatePath("/admin/users");
    revalidatePath("/admin");
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
    if (!(await requirePermission("VIEW_USER_LIST"))) {
      throw new Error("Ei oikeuksia");
    }

    const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
      userId,
    ]);
    return result.rows.length === 0 ? null : (result.rows[0] as User);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Virheellinen sähköpostiosoite")
  .max(254, "Sähköposti on liian pitkä");

const createUserSchema = z.object({
  email: emailField,
  password: z.string().optional(),
  name: z.string().trim().min(1, "Nimi vaaditaan").max(100, "Nimi on liian pitkä"),
  full_name: z
    .string()
    .trim()
    .min(1, "Koko nimi vaaditaan")
    .max(150, "Koko nimi on liian pitkä"),
  roles: z.array(z.string()),
});

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
}): Promise<ActionResult> {
  try {
    if (!(await requirePermission("CREATE_USER"))) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const parsed = createUserSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { email, name, full_name } = parsed.data;

    const checked = validateRoles(parsed.data.roles);
    if ("error" in checked) {
      return { success: false, error: checked.error };
    }
    const filteredRoles = checked.roles;

    // Guest-only users can't log in, so they need no password. Everyone else
    // needs one that passes the login rules.
    const isGuestOnly = filteredRoles.length === 1 && filteredRoles[0] === "guest";
    let hashedPassword: string | null = null;
    if (!isGuestOnly || parsed.data.password) {
      const password = PasswordSchema.safeParse(parsed.data.password ?? "");
      if (!password.success) {
        return { success: false, error: password.error.issues[0].message };
      }
      hashedPassword = await bcrypt.hash(password.data, 10);
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE lower(email) = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return {
        success: false,
        error: "Käyttäjä tällä sähköpostilla on jo olemassa",
      };
    }

    await pool.query(
      `INSERT INTO users (email, password, name, full_name, roles, auth_provider, email_verified, phone, address, city, postal_code)
       VALUES ($1, $2, $3, $4, $5, 'credentials', true, '', '', '', '')`,
      [email, hashedPassword, name, full_name, filteredRoles]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Käyttäjän luonti epäonnistui" };
  }
}

/**
 * A one-time link for a credentials user to choose a new password, valid for
 * a day (admin only). The site sends no email: the admin passes the link on.
 * Only a hash of the token is stored.
 */
export async function createPasswordResetLink(
  userId: string
): Promise<ActionResult & { url?: string }> {
  try {
    const actor = await requirePermission("EDIT_USER");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const target = await loadTarget(userId, actor.id, { allowSelf: true });
    if ("error" in target) {
      return { success: false, error: target.error };
    }
    if (target.user.auth_provider !== "credentials") {
      return {
        success: false,
        error: "Google-käyttäjät kirjautuvat Google-tilillä, heillä ei ole salasanaa",
      };
    }
    if (target.user.deactivated_at) {
      return { success: false, error: "Käyttäjä on poistettu käytöstä" };
    }

    const token = randomBytes(32).toString("base64url");
    const identifier = `password-reset:${userId}`;
    await pool.query("DELETE FROM verification_tokens WHERE identifier = $1", [identifier]);
    await pool.query(
      `INSERT INTO verification_tokens (identifier, token, expires)
       VALUES ($1, $2, NOW() + make_interval(hours => $3))`,
      [identifier, createHash("sha256").update(token).digest("hex"), RESET_LINK_HOURS]
    );

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const url = new URL(`/auth/uusi-salasana?token=${token}`, base).toString();
    return { success: true, url };
  } catch (error) {
    console.error("Error creating password reset link:", error);
    return { success: false, error: "Linkin luonti epäonnistui" };
  }
}

const userInfoSchema = z.object({
  name: z.string().trim().min(1, "Nimi vaaditaan").max(100, "Nimi on liian pitkä"),
  full_name: z
    .string()
    .trim()
    .min(1, "Koko nimi vaaditaan")
    .max(150, "Koko nimi on liian pitkä"),
  email: emailField,
  phone: z.string().trim().max(30, "Puhelinnumero on liian pitkä"),
  address: z.string().trim().max(200, "Osoite on liian pitkä"),
  city: z.string().trim().max(100, "Kaupunki on liian pitkä"),
  postal_code: z.string().trim().max(10, "Postinumero on liian pitkä"),
});

/**
 * Update a user's contact details (admin only). Members can still edit their
 * own in Profiili. A Google user's email stays as it is: Google sign-in finds
 * the account by it.
 */
export async function updateUserInfo(
  userId: string,
  data: z.input<typeof userInfoSchema>
): Promise<ActionResult> {
  try {
    const actor = await requirePermission("EDIT_USER");
    if (!actor) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const parsed = userInfoSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const target = await loadTarget(userId, actor.id, { allowSelf: true });
    if ("error" in target) {
      return { success: false, error: target.error };
    }

    const { name, full_name, phone, address, city, postal_code } = parsed.data;
    let { email } = parsed.data;
    if (target.user.auth_provider === "google") {
      email = target.user.email;
    }

    if (email !== target.user.email.toLowerCase()) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE lower(email) = $1 AND id <> $2",
        [email, userId]
      );
      if (existingUser.rows.length > 0) {
        return { success: false, error: "Sähköpostiosoite on jo käytössä" };
      }
    }

    await pool.query(
      `UPDATE users
       SET name = $1, full_name = $2, email = $3, phone = $4, address = $5, city = $6, postal_code = $7
       WHERE id = $8`,
      [name, full_name, email, phone, address, city, postal_code, userId]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user info:", error);
    return { success: false, error: "Käyttäjän tietojen päivitys epäonnistui" };
  }
}
