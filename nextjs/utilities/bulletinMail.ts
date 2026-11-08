"use server";

import { revalidatePath } from "next/cache";
import connectionPool from "@/utilities/db";
import { auth } from "@/auth";
import { SESSION_ENDED } from "@/utilities/errorText";
import { hasPermission } from "@/utilities/roles";
import { deliverEmails, queueEmail } from "@/utilities/mail";
import { isMailConfigured, mailMode, redirectAddress } from "@/utilities/mailConfig";
import { renderBulletinEmail } from "@/utilities/bulletinEmail";
import { logger } from "@/utilities/logger";
import type { ActionResult } from "@/utilities/actionResult";

const log = logger.child({ module: "bulletin-mail" });

/**
 * Sending a published bulletin to the members by email. Members are the
 * active users with the role user or admin who have not turned bulletin
 * emails off on their profile. Each message goes through email_outbox like
 * the bills (utilities/mail.ts); sending again only reaches those who have
 * not got it, so a half-failed send is finished by pressing the button again.
 */

const siteUrl = () => (process.env.NEXTAUTH_URL || "https://savonlinnanlentokerho.fi").replace(/\/+$/, "");

const RECIPIENTS = `FROM users
  WHERE deactivated_at IS NULL AND bulletin_emails AND email <> ''
    AND roles && ARRAY['user', 'admin']::text[]`;

async function requireBulletinAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: SESSION_ENDED };
  if (!hasPermission(session.user.roles, "MANAGE_BULLETINS")) return { error: "Ei oikeuksia" };
  return { user: session.user };
}

/** How many members a bulletin goes to, for the admin's confirmation */
export async function countBulletinRecipients(): Promise<number> {
  const response = await connectionPool.query(`SELECT COUNT(*)::int AS count ${RECIPIENTS}`);
  return response.rows[0].count;
}

export interface BulletinSendResult {
  text: string;
}

/** Sends a published bulletin to the members who have not got it yet */
export async function sendBulletinEmail(id: number): Promise<ActionResult<BulletinSendResult>> {
  const access = await requireBulletinAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Tiedotetta ei löytynyt" };

  const mode = mailMode();
  if (mode === "off" || !isMailConfigured()) {
    return { status: "error", error: "Sähköposti ei ole käytössä, joten tiedotetta ei voi lähettää." };
  }

  // One send of a bulletin at a time: a double click or two admins would otherwise queue it twice
  const lock = await connectionPool.connect();
  let locked = false;
  try {
    locked = (await lock.query("SELECT pg_try_advisory_lock(42, $1) AS locked", [id])).rows[0].locked;
    if (!locked) return { status: "error", error: "Tiedotteen lähetys on jo käynnissä." };

    const bulletin = (
      await connectionPool.query("SELECT title, content, status FROM bullets WHERE id = $1", [id])
    ).rows[0];
    if (!bulletin) return { status: "error", error: "Tiedotetta ei löytynyt" };
    if (bulletin.status !== "published") {
      return { status: "error", error: "Vain julkaistun tiedotteen voi lähettää. Julkaise se ensin." };
    }

    const message = renderBulletinEmail(bulletin, {
      bulletinUrl: `${siteUrl()}/tiedotteet`,
      profileUrl: `${siteUrl()}/jasenalue/profiili`,
    });
    const members = (
      await connectionPool.query(`SELECT email, full_name ${RECIPIENTS} ORDER BY full_name, email`)
    ).rows;
    if (members.length === 0) return { status: "error", error: "Tiedotteella ei ole vastaanottajia." };

    // What each address already has for this bulletin, in this mail mode
    const stored = (
      await connectionPool.query(
        `SELECT DISTINCT ON (lower(to_address)) id, lower(to_address) AS address, status
         FROM email_outbox
         WHERE bulletin_id = $1 AND queued_mode = $2
         ORDER BY lower(to_address), (status = 'sent') DESC, id DESC`,
        [id, mode]
      )
    ).rows;
    const byAddress = new Map<string, { id: number; status: string }>(stored.map((row) => [row.address, row]));

    let sent = 0;
    let already = 0;
    const failures: string[] = [];
    for (const member of members) {
      const existing = byAddress.get(String(member.email).toLowerCase());
      if (existing?.status === "sent") {
        already++;
        continue;
      }
      const emailId =
        existing?.id ??
        (await queueEmail(connectionPool, {
          purpose: "info",
          kind: "bulletin",
          to: { address: member.email, name: member.full_name },
          ...message,
          createdBy: access.user.id,
          bulletinId: id,
        }));
      const [delivery] = await deliverEmails([emailId]);
      if (delivery.status === "sent") sent++;
      else if (delivery.status === "failed") failures.push(delivery.error ?? "Lähetys epäonnistui");
      // Nothing has gone out and the same reason will hit everyone: stop early
      if (failures.length >= 3 && sent === 0) break;
    }

    if (sent > 0) {
      await connectionPool.query("UPDATE bullets SET emailed_at = COALESCE(emailed_at, NOW()) WHERE id = $1", [id]);
      revalidatePath("/admin/bulletins");
    }
    log.info("Bulletin emailed", { bulletinId: id, mode, sent, already, failed: failures.length, userId: access.user.id });

    const where = mode === "redirect" ? ` (kehitystila: kaikki menivät osoitteeseen ${redirectAddress()})` : "";
    const parts = [`Lähetetty ${sent} jäsenelle${where}.`];
    if (already > 0) parts.push(`${already} oli jo saanut tiedotteen.`);
    if (failures.length > 0) {
      parts.push(`${failures.length} lähetystä epäonnistui: ${failures[0]} Paina nappia uudelleen, kun syy on korjattu.`);
      return { status: "error", error: parts.join(" ") };
    }
    return { status: "success", result: { text: parts.join(" ") } };
  } catch (error) {
    log.error("Emailing a bulletin failed", { err: error, bulletinId: id });
    return { status: "error", error: "Tiedotteen lähetys epäonnistui" };
  } finally {
    if (locked) await lock.query("SELECT pg_advisory_unlock(42, $1)", [id]).catch(() => {});
    lock.release();
  }
}
