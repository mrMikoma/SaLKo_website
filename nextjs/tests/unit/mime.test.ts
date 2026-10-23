import { describe, expect, test } from "bun:test";
import { buildMime, encodeHeaderText, formatMailbox, formatMailDate } from "@/utilities/mime";

// Reads encoded words back, as a mail program would
const decodeHeader = (value: string) =>
  value
    .replace(/\r\n /g, "")
    .replace(/=\?UTF-8\?B\?([^?]*)\?=/g, (_, data) => Buffer.from(data, "base64").toString("utf8"));

const headerOf = (mime: string, name: string) =>
  mime.match(new RegExp(`^${name}: (.*(?:\\r\\n .*)*)`, "m"))?.[1] ?? null;

// The base64 body of the part with this content type
const partBody = (mime: string, type: string) => {
  const match = mime.match(
    new RegExp(`Content-Type: ${type}; charset=UTF-8\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+)`)
  );
  return match ? Buffer.from(match[1].replace(/\r\n/g, ""), "base64").toString("utf8") : null;
};

const message = {
  from: { address: "laskutus@example.fi", name: "Savonlinnan Lentokerho ry" },
  to: { address: "matti@example.fi", name: "Matti Meikäläinen" },
  subject: "Lasku 20260001: jäsenmaksu 2027",
  text: "Hei,\nohessa lasku.\n\nSumma 60,00 €",
  html: "<p>Hei,</p><p>Summa 60,00&nbsp;€</p>",
  date: new Date(Date.UTC(2026, 9, 23, 8, 5, 0)),
};

describe("headers", () => {
  test("plain ASCII stays as it is; anything else is encoded and reads back the same", () => {
    expect(encodeHeaderText("Hello there")).toBe("Hello there");
    const encoded = encodeHeaderText("Lentolasku 2026-10: Jääskeläinen");
    expect(encoded).toStartWith("=?UTF-8?B?");
    expect(decodeHeader(encoded)).toBe("Lentolasku 2026-10: Jääskeläinen");
  });

  test("a long subject is split into short encoded words, never inside a character", () => {
    const subject = "Ääkkösiä ".repeat(20).trim();
    const encoded = encodeHeaderText(subject);
    for (const line of encoded.split("\r\n")) {
      expect(line.trim().length).toBeLessThanOrEqual(75);
    }
    expect(decodeHeader(encoded)).toBe(subject);
  });

  test("line breaks can't add headers", () => {
    expect(encodeHeaderText("Lasku\r\nBcc: someone@example.com")).toBe("Lasku Bcc: someone@example.com");
    const mailbox = formatMailbox({ address: "a@example.fi", name: "Evil\nBcc: x@example.com" });
    expect(mailbox).not.toContain("\n");
    expect(formatMailbox({ address: "a@example.fi>\r\nBcc: x@example.com" })).not.toMatch(/[\r\n<>]/);
  });

  test("names are quoted or encoded, addresses kept bare", () => {
    expect(formatMailbox({ address: "a@example.fi" })).toBe("a@example.fi");
    expect(formatMailbox({ address: "a@example.fi", name: 'Lentokerho "SaLKo"' })).toBe(
      '"Lentokerho \\"SaLKo\\"" <a@example.fi>'
    );
    expect(decodeHeader(formatMailbox(message.to))).toBe("Matti Meikäläinen <matti@example.fi>");
  });

  test("the date is in RFC 5322 form", () => {
    expect(formatMailDate(message.date)).toBe("Fri, 23 Oct 2026 08:05:00 +0000");
  });
});

describe("the message", () => {
  test("has a text and an HTML part that read back as given", () => {
    const mime = buildMime(message, "BOUNDARY");
    expect(decodeHeader(headerOf(mime, "Subject")!)).toBe(message.subject);
    expect(headerOf(mime, "From")).toBe('"Savonlinnan Lentokerho ry" <laskutus@example.fi>');
    expect(headerOf(mime, "Content-Type")).toBe('multipart/alternative; boundary="BOUNDARY"');
    expect(partBody(mime, "text/plain")).toBe(message.text.replace(/\n/g, "\r\n"));
    expect(partBody(mime, "text/html")).toBe(message.html);
    expect(mime.trimEnd()).toEndWith("--BOUNDARY--");
  });

  test("uses CRLF line ends and short lines throughout", () => {
    const mime = buildMime({ ...message, text: "x".repeat(5000) });
    expect(mime.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of mime.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(998);
    }
  });

  test("without HTML is a single text part", () => {
    const mime = buildMime({ ...message, html: null, replyTo: { address: "rahastonhoitaja@example.fi" } });
    expect(mime).not.toContain("multipart");
    expect(headerOf(mime, "Reply-To")).toBe("rahastonhoitaja@example.fi");
    expect(partBody(mime, "text/plain")).toContain("Summa 60,00 €");
  });
});
