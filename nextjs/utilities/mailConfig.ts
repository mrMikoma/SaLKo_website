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

/**
 * The club's one mail account, which sends everything: MAIL_FROM, with the
 * token it gave the website (scripts/mail-authorize.ts) and the OAuth client
 * it gave it to
 */
export function mailAccount(env: Env = process.env) {
  return {
    address: value(env.MAIL_FROM),
    refreshToken: value(env.MAIL_REFRESH_TOKEN),
    clientId: value(env.MAIL_GMAIL_CLIENT_ID),
    clientSecret: value(env.MAIL_GMAIL_CLIENT_SECRET),
  };
}

export function isMailConfigured(env: Env = process.env): boolean {
  const account = mailAccount(env);
  return Boolean(account.address && account.refreshToken && account.clientId && account.clientSecret);
}

export class MailConfigError extends Error {}

// "Savonlinnan Lentokerho r.y." → "Savonlinnan Lentokerho"
const CLUB = contacts.general.name.replace(/\s+r\.?\s?y\.?$/i, "");

/**
 * What a message is about sets the sender's name and where replies go. The
 * address it comes from is always the club's mail account.
 */
export const MAIL_PURPOSES = {
  billing: { name: `${CLUB}, laskutus`, replyTo: contacts.general.billingEmail },
  info: { name: CLUB, replyTo: contacts.general.email },
} as const;

export type MailPurpose = keyof typeof MAIL_PURPOSES;

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
export function describeMailError(error: unknown, accountAddress: string | null): string {
  if (error instanceof MailConfigError) return error.message;
  const account = accountAddress ?? "kerhon sähköpostitili";
  const e = (error ?? {}) as GoogleError;
  const data = e.response?.data?.error;
  const message = [e.message, typeof data === "string" ? data : data?.message].filter(Boolean).join(" ");
  const status = Number(e.status ?? e.response?.status ?? e.code);

  if (/invalid_grant/i.test(message)) {
    return `Tilin ${account} lupa lähettää ei enää kelpaa: se on peruttu, tai tilin salasana on vaihdettu. Valtuuta tili uudelleen (docs/MAIL_SETUP.md).`;
  }
  if (/invalid_client|unauthorized_client/i.test(message)) {
    return "OAuth-asiakkaan tunnus tai salaisuus on väärin (MAIL_GMAIL_CLIENT_ID, MAIL_GMAIL_CLIENT_SECRET).";
  }
  if (/has not been used in project|is disabled|accessNotConfigured/i.test(message)) {
    return "Gmail API ei ole käytössä Google Cloud -projektissa. Ota se käyttöön (docs/MAIL_SETUP.md).";
  }
  if (/insufficient.*scope|SCOPE_INSUFFICIENT/i.test(message)) {
    return `Tilin ${account} lupa ei kata lähettämistä. Valtuuta se uudelleen (docs/MAIL_SETUP.md).`;
  }
  if (status === 429 || /rate limit|quota/i.test(message)) {
    return "Gmailin lähetysraja tuli täyteen. Yritä myöhemmin uudelleen.";
  }
  if (/invalid to header|recipient address required|invalid.*address/i.test(message)) {
    return "Vastaanottajan osoite ei kelpaa.";
  }
  return `Lähetys epäonnistui: ${message || String(error)}`.slice(0, 300);
}
