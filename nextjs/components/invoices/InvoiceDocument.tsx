import type { Invoice, InvoiceStatus } from "@/utilities/invoiceData";
import { euros } from "@/utilities/billing";
import { formatFullDate } from "@/utilities/flightFormat";
import {
  formatIban,
  formatQuantity,
  formatReference,
  ISSUER,
  virtualBarcode,
} from "@/utilities/invoices";

const STATUS: Record<InvoiceStatus | "overdue", { label: string; tone: string }> = {
  draft: { label: "Luonnos", tone: "bg-gray-200 text-gray-800" },
  open: { label: "Avoin", tone: "bg-blue-100 text-blue-900" },
  overdue: { label: "Erääntynyt", tone: "bg-red-100 text-red-900" },
  paid: { label: "Maksettu", tone: "bg-green-100 text-green-900" },
  cancelled: { label: "Mitätöity", tone: "bg-gray-200 text-gray-700" },
};

export const InvoiceStatusBadge = ({ status, overdue }: { status: InvoiceStatus; overdue: boolean }) => {
  const { label, tone } = STATUS[overdue ? "overdue" : status];
  return <span className={`rounded-full px-2 py-0.5 text-sm font-medium whitespace-nowrap ${tone}`}>{label}</span>;
};

const price = (cents: number | null) => (cents === null ? "" : euros(cents));

/**
 * An invoice as the member gets it: the club, the recipient, the lines and
 * how to pay. Prints on its own page; the rest of the site hides in print.
 */
const InvoiceDocument = ({
  invoice,
  contactEmail,
  footer,
}: {
  invoice: Invoice;
  contactEmail: string;
  footer: string;
}) => {
  const issued = invoice.status !== "draft";
  const barcode =
    issued && invoice.reference
      ? virtualBarcode({
          iban: ISSUER.iban,
          cents: invoice.totalCents,
          reference: invoice.reference,
          dueDate: invoice.dueDate,
        })
      : null;
  const meta: [string, string][] = [
    ["Laskun numero", invoice.number ? String(invoice.number) : "annetaan lähetettäessä"],
    ["Päiväys", invoice.issueDate ? formatFullDate(invoice.issueDate) : "–"],
    ["Eräpäivä", invoice.dueDate ? formatFullDate(invoice.dueDate) : "–"],
    ["Viitenumero", invoice.reference ? formatReference(invoice.reference) : "–"],
  ];
  const payment: [string, string][] = [
    ["Saaja", ISSUER.name],
    ["Tilinumero", formatIban(ISSUER.iban)],
    ["BIC", ISSUER.bic],
    ["Viitenumero", invoice.reference ? formatReference(invoice.reference) : "–"],
    ["Eräpäivä", invoice.dueDate ? formatFullDate(invoice.dueDate) : "–"],
    ["Summa", euros(invoice.totalCents)],
  ];

  return (
    <article className="bg-white rounded-lg shadow p-5 sm:p-8 text-gray-900 print:shadow-none print:rounded-none print:p-0">
      {invoice.status === "cancelled" && (
        <p className="mb-6 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3" role="status">
          <strong>Lasku on mitätöity, eikä sitä tarvitse maksaa.</strong>
          {invoice.cancelReason && ` ${invoice.cancelReason}`}
        </p>
      )}
      <header className="flex flex-col sm:flex-row sm:justify-between gap-6 border-b border-gray-300 pb-6">
        <div>
          <p className="text-xl font-bold">{ISSUER.name}</p>
          <p className="text-gray-700">
            {ISSUER.address}
            <br />
            {ISSUER.postalCode} {ISSUER.city}
          </p>
          <p className="text-sm text-gray-700 mt-1">Y-tunnus {ISSUER.businessId}</p>
          <p className="text-sm text-gray-700 break-words">{contactEmail}</p>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-wide sm:text-right">LASKU</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {meta.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-gray-600">{label}</dt>
                <dd className="font-medium tabular-nums sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="py-6" aria-label="Vastaanottaja">
        <p className="font-semibold">{invoice.recipientName}</p>
        {invoice.recipientAddress && <p className="whitespace-pre-line text-gray-800">{invoice.recipientAddress}</p>}
        {invoice.recipientEmail && <p className="text-gray-700 break-words">{invoice.recipientEmail}</p>}
      </section>

      <h2 className="text-xl font-semibold">{invoice.title}</h2>
      {invoice.message && <p className="mt-1 whitespace-pre-line text-gray-700">{invoice.message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600 border-b border-gray-300">
            <tr>
              <th scope="col" className="px-2 py-1 font-medium">Päivä</th>
              <th scope="col" className="px-2 py-1 font-medium">Selite</th>
              <th scope="col" className="px-2 py-1 font-medium text-right">Määrä</th>
              <th scope="col" className="px-2 py-1 font-medium text-right hidden sm:table-cell print:table-cell">
                À-hinta
              </th>
              <th scope="col" className="px-2 py-1 font-medium text-right">Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-2 py-1 whitespace-nowrap tabular-nums">
                  {line.lineDate ? formatFullDate(line.lineDate) : ""}
                </td>
                <td className="px-2 py-1">{line.description}</td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums">
                  {formatQuantity(line.quantity, line.unit)}
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums hidden sm:table-cell print:table-cell">
                  {price(line.unitCents)}
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums">{euros(line.amountCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-semibold border-t border-gray-300">
            <tr>
              {/* The unit price column is hidden on phones */}
              <td className="px-2 py-2 sm:hidden print:hidden" colSpan={3}>
                Yhteensä
              </td>
              <td className="px-2 py-2 hidden sm:table-cell print:table-cell" colSpan={4}>
                Yhteensä
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{euros(invoice.totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {issued && invoice.status !== "cancelled" && (
        <section className="mt-6 rounded-lg border border-gray-300 p-4 break-inside-avoid" aria-label="Maksutiedot">
          <h3 className="font-semibold">Maksutiedot</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {payment.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-gray-600">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {barcode && (
            <div className="mt-3 text-sm">
              <p className="text-gray-600">Virtuaaliviivakoodi (liitä pankin sovellukseen)</p>
              <p className="font-mono break-all">{barcode}</p>
            </div>
          )}
          <p className="mt-3 text-sm text-gray-700">Käytä maksaessa viitenumeroa.</p>
        </section>
      )}

      {footer && <p className="mt-6 text-sm text-gray-600 whitespace-pre-line">{footer}</p>}
    </article>
  );
};

export default InvoiceDocument;
