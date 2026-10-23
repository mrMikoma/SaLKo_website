import contacts from "@/data/contacts.json";

/**
 * Mail settings from the environment, the dev environment's redirect, and
 * what to tell the admin when Google refuses. utilities/mail.ts does the
 * sending; the setup is in docs/MAIL_SETUP.md.
 */

type Env = Record<string, string | undefined>;

export type MailMode = "off" | "redirect" | "send";

const value = (text: string | undefined) => text?.trim() || null;

export const redirectAddress = (env: Env = process.env) => value(env.MAIL_REDIRECT_TO);

/**
 * MAIL_MODE: "send" in production; "redirect" in the dev environment, where
 * every message goes to MAIL_REDIRECT_TO instead of its recipient; anything
 * else is off, and messages are only stored in email_outbox. Off is the
 * default, so a local database or a test run never mails anyone.
 */
export function mailMode(env: Env = process.env): MailMode {
  if (env.MAIL_MODE === "send") return "send";
  if (env.MAIL_MODE === "redirect" && redirectAddress(env)) return "redirect";
  return "off";
}

export const SENDER_KEYS = ["billing"] as const;
export type SenderKey = (typeof SENDER_KEYS)[number];

export interface Sender {
  key: SenderKey;
  address: string;
  name: string;
  refreshToken: string | null;
}

export class MailConfigError extends Error {}

/**
 * The mailboxes the website sends from. Each one has authorised the website
 * to send as it (scripts/mail-authorize.ts) and has a token of its own. Bills
 * go from laskutus@, the address members already know and the treasurer
 * reads. Invitations and the chairman's letters get a sender of their own
 * (e.g. info@) when they come, so replies to them don't land in billing.
 */
export function getSender(key: string, env: Env = process.env): Sender {
  switch (key) {
    case "billing":
      return {
        key,
        address: value(env.MAIL_BILLING_FROM) ?? "laskutus@savonlinnanlentokerho.fi",
        name: contacts.general.name,
        refreshToken: value(env.MAIL_BILLING_REFRESH_TOKEN),
      };
    default:
      throw new MailConfigError(`Tuntematon lähettäjä: ${key}`);
  }
}

/** The OAuth client the senders authorised; one for all of them */
export const gmailClient = (env: Env = process.env) => ({
  clientId: value(env.MAIL_GMAIL_CLIENT_ID),
  clientSecret: value(env.MAIL_GMAIL_CLIENT_SECRET),
});

export function isSenderConfigured(key: SenderKey, env: Env = process.env): boolean {
  const { clientId, clientSecret } = gmailClient(env);
  return Boolean(clientId && clientSecret && getSender(key, env).refreshToken);
}

export interface MessageContent {
  to: { address: string; name?: string | null };
  subject: string;
  text: string;
  html?: string | null;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The dev environment's copy: to the redirect address, saying who it was for */
export function redirected(message: MessageContent, address: string): MessageContent {
  const notice = `Kehitysympäristö: tämä viesti olisi mennyt osoitteeseen ${message.to.address}.`;
  return {
    to: { address },
    subject: `[Kehitys → ${message.to.address}] ${message.subject}`,
    text: `${notice}\n\n${message.text}`,
    html: message.html
      ? `<p style="padding:8px;background:#fef3c7;border:1px solid #f59e0b">${escapeHtml(notice)}</p>${message.html}`
      : null,
  };
}

// googleapis (gaxios) errors carry the details in one of these
type GoogleError = {
  message?: string;
  status?: number;
  code?: number | string;
  response?: { status?: number; data?: { error?: string | { message?: string } } };
};

/** A failed send as what to do about it, in Finnish */
export function describeMailError(error: unknown, senderAddress: string): string {
  if (error instanceof MailConfigError) return error.message;
  const e = (error ?? {}) as GoogleError;
  const data = e.response?.data?.error;
  const message = [e.message, typeof data === "string" ? data : data?.message].filter(Boolean).join(" ");
  const status = Number(e.status ?? e.response?.status ?? e.code);

  if (/invalid_grant/i.test(message)) {
    return `Osoitteen ${senderAddress} lupa lähettää ei enää kelpaa: se on peruttu, tai tilin salasana on vaihdettu. Valtuuta osoite uudelleen (docs/MAIL_SETUP.md).`;
  }
  if (/invalid_client|unauthorized_client/i.test(message)) {
    return "OAuth-asiakkaan tunnus tai salaisuus on väärin (MAIL_GMAIL_CLIENT_ID, MAIL_GMAIL_CLIENT_SECRET).";
  }
  if (/has not been used in project|is disabled|accessNotConfigured/i.test(message)) {
    return "Gmail API ei ole käytössä Google Cloud -projektissa. Ota se käyttöön (docs/MAIL_SETUP.md).";
  }
  if (/insufficient.*scope|SCOPE_INSUFFICIENT/i.test(message)) {
    return `Osoitteen ${senderAddress} lupa ei kata lähettämistä. Valtuuta se uudelleen (docs/MAIL_SETUP.md).`;
  }
  if (status === 429 || /rate limit|quota/i.test(message)) {
    return "Gmailin lähetysraja tuli täyteen. Yritä myöhemmin uudelleen.";
  }
  if (/invalid to header|recipient address required|invalid.*address/i.test(message)) {
    return "Vastaanottajan osoite ei kelpaa.";
  }
  return `Lähetys epäonnistui: ${message || String(error)}`.slice(0, 300);
}
