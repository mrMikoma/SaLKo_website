import { randomBytes } from "crypto";

/**
 * Builds an email as raw MIME text for the Gmail API (utilities/mail.ts):
 * a plain-text body and an optional HTML one, in UTF-8. Header values lose
 * their line breaks, so a name or subject can't add headers of its own.
 */

export interface Mailbox {
  address: string;
  name?: string | null;
}

export interface MimeMessage {
  from: Mailbox;
  to: Mailbox;
  replyTo?: Mailbox;
  subject: string;
  text: string;
  html?: string | null;
  date?: Date;
}

const CRLF = "\r\n";

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

// Printable ASCII that needs no encoding in a header
const isPlainAscii = (value: string) => /^[\x20-\x7e]*$/.test(value);

/** Splits text into pieces of at most `maxBytes` UTF-8 bytes, whole characters only */
function utf8Chunks(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of text) {
    const size = Buffer.byteLength(char);
    if (bytes + size > maxBytes && current) {
      chunks.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * A header value as RFC 2047 encoded words when it isn't plain ASCII. Each
 * word stays under 76 characters: 45 bytes become 60 base64 characters.
 */
export function encodeHeaderText(value: string): string {
  const text = oneLine(value);
  if (isPlainAscii(text)) return text;
  return utf8Chunks(text, 45)
    .map((chunk) => `=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`)
    .join(`${CRLF} `);
}

/** `Name <address>`, with the name quoted or encoded as needed */
export function formatMailbox({ address, name }: Mailbox): string {
  const cleanAddress = oneLine(address).replace(/[<>",\s]/g, "");
  const cleanName = name ? oneLine(name) : "";
  if (!cleanName) return cleanAddress;
  const displayName = isPlainAscii(cleanName)
    ? `"${cleanName.replace(/(["\\])/g, "\\$1")}"`
    : encodeHeaderText(cleanName);
  return `${displayName} <${cleanAddress}>`;
}

/** Base64 in lines of 76 characters */
function base64Body(text: string): string {
  const encoded = Buffer.from(text.replace(/\r?\n/g, CRLF)).toString("base64");
  return encoded.match(/.{1,76}/g)?.join(CRLF) ?? "";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (value: number) => String(value).padStart(2, "0");

/** RFC 5322 date in UTC: "Fri, 23 Oct 2026 08:05:00 +0000" */
export function formatMailDate(date: Date): string {
  return (
    `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ` +
    `${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:` +
    `${pad(date.getUTCSeconds())} +0000`
  );
}

export function buildMime(
  message: MimeMessage,
  boundary = `salko-${randomBytes(12).toString("hex")}`
): string {
  const headers = [
    `From: ${formatMailbox(message.from)}`,
    `To: ${formatMailbox(message.to)}`,
    ...(message.replyTo ? [`Reply-To: ${formatMailbox(message.replyTo)}`] : []),
    `Subject: ${encodeHeaderText(message.subject)}`,
    `Date: ${formatMailDate(message.date ?? new Date())}`,
    "MIME-Version: 1.0",
  ];
  const part = (type: string, body: string) =>
    [
      `Content-Type: ${type}; charset=UTF-8`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Body(body),
    ].join(CRLF);

  if (!message.html) {
    return [...headers, part("text/plain", message.text)].join(CRLF) + CRLF;
  }
  return (
    [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      part("text/plain", message.text),
      `--${boundary}`,
      part("text/html", message.html),
      `--${boundary}--`,
    ].join(CRLF) + CRLF
  );
}
