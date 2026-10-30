"use server";

import { createHash } from "crypto";
import { z } from "zod";
import * as bcrypt from "bcrypt";
import pool from "@/utilities/db";
import { PasswordSchema } from "@/utilities/definitions";

export type ResetPasswordState =
  | { status: "success" }
  | { status: "error"; error: string }
  | undefined;

const IDENTIFIER_PREFIX = "password-reset:";

const resetSchema = z
  .object({
    token: z.string().min(20, "Linkki on virheellinen").max(200, "Linkki on virheellinen"),
    password: PasswordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Salasanat eivät täsmää",
    path: ["confirm"],
  });

/**
 * Sets a new password with a link made by createPasswordResetLink. Open to
 * anyone on purpose: the token in the link is the proof. Each link works
 * once, for a day.
 */
export async function resetPasswordWithToken(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Using the link deletes it, whether it still works or not
    const found = await client.query(
      `DELETE FROM verification_tokens
       WHERE token = $1 AND identifier LIKE $2
       RETURNING identifier, expires > NOW() AS valid`,
      [tokenHash, `${IDENTIFIER_PREFIX}%`]
    );
    if (found.rowCount === 0 || !found.rows[0].valid) {
      await client.query("COMMIT");
      return {
        status: "error",
        error: "Linkki on vanhentunut tai jo käytetty. Pyydä uusi linkki ylläpitäjältä.",
      };
    }

    const userId = found.rows[0].identifier.slice(IDENTIFIER_PREFIX.length);
    const updated = await client.query(
      `UPDATE users SET password = $1, sessions_revoked_at = NOW()
       WHERE id = $2 AND auth_provider = 'credentials' AND deactivated_at IS NULL`,
      [await bcrypt.hash(parsed.data.password, 10), userId]
    );
    if (updated.rowCount === 0) {
      // Keeps the link deleted: it must not work later if the account is restored
      await client.query("COMMIT");
      return { status: "error", error: "Käyttäjätiliä ei voi enää käyttää" };
    }

    await client.query("COMMIT");
    return { status: "success" };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error resetting password:", error);
    return { status: "error", error: "Salasanan vaihto epäonnistui" };
  } finally {
    client.release();
  }
}
