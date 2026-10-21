"use server";
import connectionPool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { revalidatePath } from "next/cache";
import { bulletinSchema, BulletinInput } from "@/schemas/bulletinSchema";

export type BulletinStatus = "draft" | "published";

// What the public sees
export interface Bulletin {
  id: number;
  title: string;
  content: string;
  publishedAt: string; // ISO
  author: string | null;
}

// What the admin sees: drafts too
export interface AdminBulletin {
  id: number;
  title: string;
  content: string;
  status: BulletinStatus;
  createdAt: string; // ISO
  publishedAt: string | null;
  author: string | null;
}

type ActionResult = { success: boolean; error?: string };

const toIso = (value: Date | string | null) =>
  value === null ? null : new Date(value).toISOString();

function revalidateBulletinPages() {
  revalidatePath("/");
  revalidatePath("/tiedotteet");
  revalidatePath("/admin/bulletins");
}

async function canManageBulletins() {
  const session = await auth();
  return session?.user?.id && hasPermission(session.user.roles, "MANAGE_BULLETINS")
    ? session.user
    : null;
}

/*
 * Published bulletins, newest first: the five newest for the home page, or
 * all of them for the archive. Drafts never leave the admin.
 */
export async function fetchPublishedBulletins(limit?: number): Promise<{
  status: "success" | "error";
  result: Bulletin[];
}> {
  try {
    const response = await connectionPool.query(
      `SELECT b.id, b.title, b.content, b.published_at, u.full_name AS author
       FROM bullets b
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.status = 'published'
       ORDER BY b.published_at DESC, b.id DESC
       LIMIT $1`,
      [limit ?? null]
    );
    return {
      status: "success",
      result: response.rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        publishedAt: toIso(row.published_at)!,
        author: row.author,
      })),
    };
  } catch (error) {
    console.error("Error fetching bulletins:", error);
    return { status: "error", result: [] };
  }
}

/*
 * Every bulletin with its status (admin only)
 */
export async function fetchAllBulletinsForAdmin(): Promise<{
  status: "success" | "error";
  result: AdminBulletin[];
}> {
  try {
    if (!(await canManageBulletins())) {
      return { status: "error", result: [] };
    }

    const response = await connectionPool.query(
      `SELECT b.id, b.title, b.content, b.status, b.created_at, b.published_at,
              u.full_name AS author
       FROM bullets b
       LEFT JOIN users u ON u.id = b.user_id
       ORDER BY b.status = 'published', COALESCE(b.published_at, b.created_at) DESC`
    );
    return {
      status: "success",
      result: response.rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        status: row.status,
        createdAt: toIso(row.created_at)!,
        publishedAt: toIso(row.published_at),
        author: row.author,
      })),
    };
  } catch (error) {
    console.error("Error fetching bulletins for admin:", error);
    return { status: "error", result: [] };
  }
}

/*
 * Create a bulletin (admin only): as a draft, or published right away
 */
export async function createBulletin(
  data: BulletinInput,
  publish = false
): Promise<ActionResult> {
  try {
    const user = await canManageBulletins();
    if (!user) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const parsed = bulletinSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await connectionPool.query(
      `INSERT INTO bullets (user_id, date, title, content, status, published_at)
       VALUES ($1, extract(epoch FROM NOW())::bigint, $2, $3, $4, ${
         publish ? "NOW()" : "NULL"
       })`,
      [user.id, parsed.data.title, parsed.data.content, publish ? "published" : "draft"]
    );

    revalidateBulletinPages();
    return { success: true };
  } catch (error) {
    console.error("Error creating bulletin:", error);
    return { success: false, error: "Tiedotteen luonti epäonnistui" };
  }
}

/*
 * Update a bulletin's title and content (admin only)
 */
export async function updateBulletin(
  id: number,
  data: BulletinInput
): Promise<ActionResult> {
  try {
    if (!(await canManageBulletins())) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const parsed = bulletinSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const response = await connectionPool.query(
      "UPDATE bullets SET title = $1, content = $2 WHERE id = $3",
      [parsed.data.title, parsed.data.content, id]
    );
    if (response.rowCount === 0) {
      return { success: false, error: "Tiedotetta ei löytynyt" };
    }

    revalidateBulletinPages();
    return { success: true };
  } catch (error) {
    console.error("Error updating bulletin:", error);
    return { success: false, error: "Tiedotteen päivitys epäonnistui" };
  }
}

/*
 * Publish a draft, or take a bulletin back to drafts (admin only). The public
 * date is the first publication, so taking a bulletin down for a fix and
 * publishing it again doesn't move it to the top.
 */
export async function setBulletinPublished(
  id: number,
  published: boolean
): Promise<ActionResult> {
  try {
    if (!(await canManageBulletins())) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const response = await connectionPool.query(
      published
        ? `UPDATE bullets SET status = 'published', published_at = COALESCE(published_at, NOW())
           WHERE id = $1`
        : "UPDATE bullets SET status = 'draft' WHERE id = $1",
      [id]
    );
    if (response.rowCount === 0) {
      return { success: false, error: "Tiedotetta ei löytynyt" };
    }

    revalidateBulletinPages();
    return { success: true };
  } catch (error) {
    console.error("Error publishing bulletin:", error);
    return { success: false, error: "Julkaisun muutos epäonnistui" };
  }
}

/*
 * Delete a bulletin (admin only)
 */
export async function deleteBulletin(id: number): Promise<ActionResult> {
  try {
    if (!(await canManageBulletins())) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const response = await connectionPool.query("DELETE FROM bullets WHERE id = $1", [id]);
    if (response.rowCount === 0) {
      return { success: false, error: "Tiedotetta ei löytynyt" };
    }

    revalidateBulletinPages();
    return { success: true };
  } catch (error) {
    console.error("Error deleting bulletin:", error);
    return { success: false, error: "Tiedotteen poisto epäonnistui" };
  }
}
