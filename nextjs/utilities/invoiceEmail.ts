import { euros } from "@/utilities/billing";
import { formatFullDate } from "@/utilities/flightFormat";
import {
  formatIban,
  formatQuantity,
  formatReference,
  Issuer,
  virtualBarcode,
} from "@/utilities/invoices";

/**
 * The email that sends an invoice, as plain text and HTML. Every value from
 * the database is escaped in the HTML: names and flight descriptions come
 * from the sheet and from people.
 */

export interface InvoiceForEmail {
  number: number;
  reference: string;
  title: string;
  message: string;
  recipientName: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  lines: {
    lineDate: string | null;
    description: string;
    quantity: number;
    unit: string;
    amountCents: number;
  }[];
}

export interface InvoiceEmailContext {
  issuer: Issuer;
  contactEmail: string; // where questions go: the billing address
  footer: string; // the treasurer's note at the end, e.g. about late payment
  url: string | null; // the invoice on the website, for members
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Line breaks the treasurer typed, kept in HTML
const htmlText = (text: string) => escapeHtml(text).replace(/\r?\n/g, "<br>");

export function renderInvoiceEmail(invoice: InvoiceForEmail, context: InvoiceEmailContext) {
  const { issuer } = context;
  const barcode = virtualBarcode({
    iban: issuer.iban,
    cents: invoice.totalCents,
    reference: invoice.reference,
    dueDate: invoice.dueDate,
  });
  const payment: [string, string][] = [
    ["Saaja", issuer.name],
    ["Tilinumero", `${formatIban(issuer.iban)} (BIC ${issuer.bic})`],
    ["Viitenumero", formatReference(invoice.reference)],
    ["Eräpäivä", formatFullDate(invoice.dueDate)],
    ["Summa", euros(invoice.totalCents)],
    ...(barcode ? [["Virtuaaliviivakoodi", barcode] as [string, string]] : []),
  ];
  const lineText = (line: InvoiceForEmail["lines"][number]) =>
    [
      line.lineDate ? formatFullDate(line.lineDate) : null,
      line.description,
      formatQuantity(line.quantity, line.unit),
      euros(line.amountCents),
    ]
      .filter(Boolean)
      .join("  ");
  const sender = [
    issuer.name,
    `${issuer.address}, ${issuer.postalCode} ${issuer.city}`,
    `Y-tunnus ${issuer.businessId}`,
  ];

  const subject = `Lasku ${invoice.number}: ${invoice.title}`;

  const text = [
    "Hei,",
    "",
    `tässä ${issuer.name}:n lasku ${invoice.number}, päivätty ${formatFullDate(invoice.issueDate)}.`,
    "",
    invoice.title,
    ...(invoice.message ? [invoice.message] : []),
    "",
    ...invoice.lines.map(lineText),
    `Yhteensä ${euros(invoice.totalCents)}`,
    "",
    "Maksutiedot",
    ...payment.map(([label, value]) => `${label}: ${value}`),
    "",
    "Käytä maksaessa viitenumeroa. Virtuaaliviivakoodin voi liittää pankin sovellukseen, jolloin tiedot täyttyvät itse.",
    ...(context.url ? ["", `Lasku kerhon sivuilla: ${context.url}`] : []),
    "",
    `Kysyttävää laskusta? Vastaa tähän viestiin tai kirjoita osoitteeseen ${context.contactEmail}.`,
    "",
    ...sender,
    ...(context.footer ? ["", context.footer] : []),
  ].join("\n");

  const cell = "padding:4px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top";
  const right = `${cell};text-align:right;white-space:nowrap`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:640px">
<p>Hei,</p>
<p>tässä ${escapeHtml(issuer.name)}:n lasku <strong>${invoice.number}</strong>, päivätty ${formatFullDate(invoice.issueDate)}.</p>
<h2 style="font-size:18px;margin:16px 0 4px">${escapeHtml(invoice.title)}</h2>
${invoice.message ? `<p style="margin:0 0 8px">${htmlText(invoice.message)}</p>` : ""}
<table style="border-collapse:collapse;width:100%;font-size:14px">
<thead><tr>
<th style="${cell};text-align:left">Päivä</th><th style="${cell};text-align:left">Selite</th>
<th style="${right}">Määrä</th><th style="${right}">Summa</th>
</tr></thead>
<tbody>
${invoice.lines
  .map(
    (line) =>
      `<tr><td style="${cell};white-space:nowrap">${line.lineDate ? formatFullDate(line.lineDate) : ""}</td>` +
      `<td style="${cell}">${escapeHtml(line.description)}</td>` +
      `<td style="${right}">${escapeHtml(formatQuantity(line.quantity, line.unit))}</td>` +
      `<td style="${right}">${euros(line.amountCents)}</td></tr>`
  )
  .join("\n")}
</tbody>
<tfoot><tr><td colspan="3" style="${cell};font-weight:bold">Yhteensä</td><td style="${right};font-weight:bold">${euros(invoice.totalCents)}</td></tr></tfoot>
</table>
<h3 style="font-size:16px;margin:20px 0 4px">Maksutiedot</h3>
<table style="border-collapse:collapse;font-size:14px">
${payment
  .map(
    ([label, value]) =>
      `<tr><td style="padding:2px 12px 2px 0;color:#4b5563;white-space:nowrap">${label}</td>` +
      `<td style="padding:2px 0;font-weight:bold;word-break:break-all">${escapeHtml(value)}</td></tr>`
  )
  .join("\n")}
</table>
<p style="color:#4b5563;font-size:14px">Käytä maksaessa viitenumeroa. Virtuaaliviivakoodin voi liittää pankin sovellukseen, jolloin tiedot täyttyvät itse.</p>
${context.url ? `<p><a href="${escapeHtml(context.url)}">Lasku kerhon sivuilla</a></p>` : ""}
<p>Kysyttävää laskusta? Vastaa tähän viestiin tai kirjoita osoitteeseen ${escapeHtml(context.contactEmail)}.</p>
<p style="color:#4b5563;font-size:13px">${sender.map(escapeHtml).join("<br>")}</p>
${context.footer ? `<p style="color:#4b5563;font-size:13px">${htmlText(context.footer)}</p>` : ""}
</div>`;

  return { subject, text, html };
}
