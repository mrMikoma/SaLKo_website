import { describe, expect, test } from "bun:test";
import { renderInvoiceEmail } from "@/utilities/invoiceEmail";
import { ISSUER, referenceNumber } from "@/utilities/invoices";

const invoice = {
  number: 20260013,
  reference: referenceNumber(20260013),
  title: "Lentolasku 2026-10",
  message: "Lennot 1.–31.10.2026.\nKiitos!",
  recipientName: "Matti Meikäläinen",
  issueDate: "2026-11-02",
  dueDate: "2026-11-16",
  totalCents: 21700,
  lines: [
    { lineDate: "2026-10-03", description: "OH-CON HAR EFSA–EFSA 10:00–10:20", quantity: 20, unit: "min", amountCents: 6200 },
    { lineDate: "2026-10-03", description: "OH-CON Minimilaskutus 30 min (lento 20 min)", quantity: 10, unit: "min", amountCents: 3100 },
    { lineDate: "2026-10-03", description: "OH-CON MAT EFSA–EFJO 12:00–12:40", quantity: 40, unit: "min", amountCents: 12400 },
  ],
};
const context = {
  issuer: ISSUER,
  contactEmail: "laskutus@savonlinnanlentokerho.fi",
  footer: "Viivästyskorko korkolain mukaan.",
  url: "https://savonlinnanlentokerho.fi/jasenalue/laskut/7",
};
// euros() writes a no-break space before €
const plain = (text: string) => text.replace(/ /g, " ");

describe("the invoice email", () => {
  test("has the number in the subject and everything needed to pay in the text", () => {
    const { subject, text } = renderInvoiceEmail(invoice, context);
    expect(subject).toBe("Lasku 20260013: Lentolasku 2026-10");
    const body = plain(text);
    expect(body).toContain("Tilinumero: FI51 4108 0011 8965 14 (BIC ITELFIHH)");
    expect(body).toContain(`Viitenumero: ${invoice.reference.slice(0, 4)} ${invoice.reference.slice(4)}`);
    expect(body).toContain("Eräpäivä: 16.11.2026");
    expect(body).toContain("Summa: 217,00 €");
    expect(body).toMatch(/Virtuaaliviivakoodi: 4\d{53}\n/);
    expect(body).toContain("3.10.2026  OH-CON Minimilaskutus 30 min (lento 20 min)  10 min  31,00 €");
    expect(body).toContain("Yhteensä 217,00 €");
    expect(body).toContain(context.url);
    expect(body).toContain("Y-tunnus 0481856-3");
    expect(body).toEndWith("Viivästyskorko korkolain mukaan.");
  });

  test("escapes what came from people and the sheet", () => {
    const { html } = renderInvoiceEmail(
      {
        ...invoice,
        title: "<script>alert(1)</script>",
        lines: [{ ...invoice.lines[0], description: 'A & B <img src=x onerror="y">' }],
      },
      { ...context, footer: "Rivi 1\nRivi 2" }
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("A &amp; B &lt;img");
    expect(html).toContain("Rivi 1<br>Rivi 2");
    expect(html).toContain('<a href="https://savonlinnanlentokerho.fi/jasenalue/laskut/7">');
  });

  test("leaves out the link for someone who can't log in", () => {
    const { text, html } = renderInvoiceEmail(invoice, { ...context, url: null });
    expect(text).not.toContain("Lasku kerhon sivuilla");
    expect(html).not.toContain("<a ");
  });
});
