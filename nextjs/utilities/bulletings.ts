"use server";
import connectionPool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { revalidatePath } from "next/cache";

export interface Bulletin {
  id: number;
  user_id: string;
  date: number; // Unix timestamp
  title: string;
  content: string;
  created_at: string;
  username?: string;
}

export async function fetchLatestFiveBulletings(): Promise<{
  status: string;
  result: Bulletin[] | null;
}> {
  try {
    const response = await connectionPool.query(
      `SELECT bullets.*, users.name as username
       FROM bullets
       JOIN users ON bullets.user_id = users.id
       ORDER BY bullets.date DESC
       LIMIT 5`
    );
    return { status: "success", result: response.rows as Bulletin[] };
  } catch (error) {
    console.error("Error fetching latest bulletins:", error);
    return { status: "error", result: null };
  }
}

export async function fetchAllBulletings(): Promise<{
  status: string;
  result: Bulletin[] | null;
}> {
  try {
    const response = await connectionPool.query(
      `SELECT bullets.*, users.name as username
       FROM bullets
       JOIN users ON bullets.user_id = users.id
       ORDER BY bullets.date DESC`
    );
    return { status: "success", result: response.rows as Bulletin[] };
  } catch (error) {
    console.error("Error fetching all bulletins:", error);
    return { status: "error", result: null };
  }
}

export async function createBulletin(data: {
  title: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !hasPermission(session.user.role, "ACCESS_ADMIN_SITE")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    if (!data.title || !data.content) {
      return { success: false, error: "Otsikko ja sisältö ovat pakollisia" };
    }

    const date = Math.floor(Date.now() / 1000);
    await connectionPool.query(
      `INSERT INTO bullets (user_id, date, title, content) VALUES ($1, $2, $3, $4)`,
      [session.user.id, date, data.title, data.content]
    );

    revalidatePath("/");
    revalidatePath("/admin/bulletins");
    return { success: true };
  } catch (error) {
    console.error("Error creating bulletin:", error);
    return { success: false, error: "Tiedotteen luonti epäonnistui" };
  }
}

export async function updateBulletin(
  id: number,
  data: { title?: string; content?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !hasPermission(session.user.role, "ACCESS_ADMIN_SITE")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const existing = await connectionPool.query(
      "SELECT id FROM bullets WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return { success: false, error: "Tiedotetta ei löytynyt" };
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
    let p = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${p++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${p++}`);
      values.push(data.content);
    }

    if (updates.length === 0) {
      return { success: false, error: "Ei muutettavia tietoja" };
    }

    values.push(id);
    await connectionPool.query(
      `UPDATE bullets SET ${updates.join(", ")} WHERE id = $${p}`,
      values
    );

    revalidatePath("/");
    revalidatePath("/admin/bulletins");
    return { success: true };
  } catch (error) {
    console.error("Error updating bulletin:", error);
    return { success: false, error: "Tiedotteen päivitys epäonnistui" };
  }
}

export async function deleteBulletin(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !hasPermission(session.user.role, "ACCESS_ADMIN_SITE")
    ) {
      return { success: false, error: "Ei oikeuksia" };
    }

    const existing = await connectionPool.query(
      "SELECT id FROM bullets WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return { success: false, error: "Tiedotetta ei löytynyt" };
    }

    await connectionPool.query("DELETE FROM bullets WHERE id = $1", [id]);

    revalidatePath("/");
    revalidatePath("/admin/bulletins");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bulletin:", error);
    return { success: false, error: "Tiedotteen poisto epäonnistui" };
  }
}
