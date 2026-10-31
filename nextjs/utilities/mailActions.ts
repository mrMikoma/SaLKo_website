"use server";

import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { deliverEmails, DeliveryStatus, queueEmail } from "@/utilities/mail";
import { MAIL_PURPOSES, mailMode, redirectAddress } from "@/utilities/mailConfig";

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

// Mail goes out from billing for now, so the treasurer looks after it
async function requireMailAdmin() {
  if (!isBillingEnabled()) {
    return { error: "Laskutus ei ole vielä käytössä" };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    return { error: "Ei oikeuksia" };
  }
  return { user: session.user };
}

const revalidateMail = () => {
  revalidatePath("/admin/laskutus/viestit");
  revalidatePath("/admin/laskutus/asetukset");
};

// MAIL_MODE as the settings page says it
const MODE_TEXT: Record<string, string> = {
  send: "käytössä",
  redirect: "kehitystilassa",
  off: "pois päältä",
};

const DELIVERY_TEXT: Record<Exclude<DeliveryStatus, "failed">, string> = {
  sent: "Lähetetty.",
  held: "Tallennettu, ei lähetetty: sähköposti ei ole käytössä (MAIL_MODE).",
  skipped: "Viesti on jo lähetetty tai lähdössä.",
};

/** Sends a test message, as a bill would go, to the admin themself */
export async function sendTestEmail(): Promise<ActionResult<{ text: string }>> {
  const access = await requireMailAdmin();
  if ("error" in access) return { status: "error", error: access.error };

  const user = await pool.query("SELECT email, full_name FROM users WHERE id = $1", [access.user.id]);
  const to = user.rows[0];
  if (!to?.email) return { status: "error", error: "Tililläsi ei ole sähköpostiosoitetta" };

  const { billing, info } = MAIL_PURPOSES;
  const mode = mailMode();
  const id = await queueEmail(pool, {
    purpose: "billing",
    kind: "test",
    to: { address: to.email, name: to.full_name },
    subject: "Testiviesti kerhon verkkosivuilta",
    text: [
      "Hei,",
      "",
      "tämä on testiviesti Savonlinnan Lentokerhon verkkosivuilta. Kaikki kerhon viestit lähtevät samalta tililtä.",
      `Laskuissa lähettäjänä näkyy "${billing.name}", ja vastaukset menevät osoitteeseen ${billing.replyTo}.`,
      `Muihin viesteihin vastaukset menevät osoitteeseen ${info.replyTo}.`,
      "",
      "Vastaa tähän viestiin, niin näet, minne vastaus menee. Jos viesti meni roskapostiin, katso docs/MAIL_SETUP.md (SPF, DKIM ja DMARC).",
    ].join("\n"),
    createdBy: access.user.id,
  });
  const [delivery] = await deliverEmails([id]);
  revalidateMail();
  if (delivery.status === "failed") {
    return { status: "error", error: delivery.error ?? "Lähetys epäonnistui" };
  }
  const where = mode === "redirect" ? redirectAddress() : to.email;
  return {
    status: "success",
    result: {
      text: delivery.status === "sent" ? `Lähetetty osoitteeseen ${where}.` : DELIVERY_TEXT[delivery.status],
    },
  };
}

/** Tries a failed message again */
export async function retryEmail(id: number): Promise<ActionResult<{ text: string }>> {
  const access = await requireMailAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Viestiä ei löytynyt" };
  // deliverEmails skips these too; this says why
  const stored = (
    await pool.query(
      `SELECT o.kind, o.queued_mode, i.status AS invoice_status
       FROM email_outbox o LEFT JOIN invoices i ON i.id = o.invoice_id
       WHERE o.id = $1`,
      [id]
    )
  ).rows[0];
  if (!stored) return { status: "error", error: "Viestiä ei löytynyt" };
  if (stored.invoice_status === "cancelled") {
    return { status: "error", error: "Lasku on mitätöity, joten viestiä ei lähetetä." };
  }
  if (stored.queued_mode !== mailMode()) {
    return {
      status: "error",
      error: `Viesti tallennettiin, kun sähköposti oli ${MODE_TEXT[stored.queued_mode] ?? "toisessa tilassa"}, ja nyt se on ${MODE_TEXT[mailMode()]}, joten sitä ei lähetetä. ${
        stored.kind === "invoice" ? "Lähetä lasku uudelleen laskun sivulta." : "Lähetä uusi viesti."
      }`,
    };
  }

  const [delivery] = await deliverEmails([id]);
  revalidateMail();
  if (delivery.status === "failed") {
    return { status: "error", error: delivery.error ?? "Lähetys epäonnistui" };
  }
  return { status: "success", result: { text: DELIVERY_TEXT[delivery.status] } };
}
