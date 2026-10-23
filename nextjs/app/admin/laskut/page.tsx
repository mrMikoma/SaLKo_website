export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { getInvoices, InvoiceSummary, InvoiceView, VIEW_STATUS } from "@/utilities/invoiceData";
import { getBillingPeriod } from "@/utilities/billingData";
import { mailMode } from "@/utilities/mailConfig";
import { euros } from "@/utilities/billing";
import { formatFullDate } from "@/utilities/flightFormat";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceDocument";
import { SendDraftsButton } from "@/components/invoices/InvoiceActions";

export const metadata = {
  title: "Laskut | Ylläpito",
};

const VIEWS: { key: InvoiceView; label: string }[] = [
  { key: "luonnokset", label: "Luonnokset" },
  { key: "avoimet", label: "Avoimet" },
  { key: "maksetut", label: "Maksetut" },
  { key: "mitatoidyt", label: "Mitätöidyt" },
  { key: "kaikki", label: "Kaikki" },
];

// The newest attempt to email it, when it didn't simply go
function deliveryNote(invoice: InvoiceSummary): { text: string; tone: string } | null {
  if (invoice.status === "draft") return invoice.recipientEmail ? null : { text: "ei sähköpostia", tone: "text-amber-800" };
  if (!invoice.delivery) return invoice.recipientEmail ? null : { text: "tulostettava", tone: "text-gray-600" };
  if (invoice.delivery.status === "failed") return { text: "lähetys epäonnistui", tone: "text-red-700" };
  if (invoice.delivery.status === "held") return { text: "ei lähetetty", tone: "text-amber-800" };
  return null;
}

interface PageProps {
  searchParams: Promise<{ nakyma?: string; jakso?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }

  const params = await searchParams;
  const periodId = Number(params.jakso);
  const period = Number.isInteger(periodId) ? await getBillingPeriod(periodId) : null;
  const requested = VIEWS.find((v) => v.key === params.nakyma)?.key;
  let view: InvoiceView = requested ?? "luonnokset";
  let data = await getInvoices(view, period?.id ?? null);
  // Without a choice: the drafts while there are some, then the open ones
  if (!requested && data.counts.draft === 0) {
    view = "avoimet";
    data = await getInvoices(view, period?.id ?? null);
  }
  const { invoices, counts } = data;
  const sendable = invoices.filter((i) => i.status === "draft" && i.totalCents > 0).map((i) => i.id);
  const total = invoices.reduce((sum, i) => sum + i.totalCents, 0);
  const query = (key: InvoiceView) => `?nakyma=${key}${period ? `&jakso=${period.id}` : ""}`;

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Laskut</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Lentolaskut syntyvät suljetusta laskutusjaksosta; jäsen-, kalusto- ja hallimaksut
            ja muut tehdään täältä. Luonnos saa numeron, viitteen ja eräpäivän, kun se lähetetään.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            href="/admin/laskut/uusi"
            className="min-h-11 inline-flex items-center px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
          >
            Uusi lasku
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a CSV download, not a page */}
          <a
            href="/admin/laskut/csv"
            className="min-h-11 inline-flex items-center px-4 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
          >
            CSV kirjanpitoon
          </a>
        </div>
      </div>

      {period && (
        <p className="flex flex-wrap items-center gap-3">
          <span>
            Jakson <strong>{period.name}</strong> laskut
          </span>
          <Link href={`?nakyma=${view}`} className="text-sblue hover:underline">
            Näytä kaikki laskut
          </Link>
        </p>
      )}

      <nav aria-label="Laskujen tila" className="flex flex-wrap gap-2">
        {VIEWS.map(({ key, label }) => {
          const status = VIEW_STATUS[key];
          const count = status ? counts[status] : null;
          return (
            <Link
              key={key}
              href={query(key)}
              aria-current={key === view ? "page" : undefined}
              className={`min-h-11 inline-flex items-center px-4 rounded-lg border font-medium ${
                key === view
                  ? "border-sblue bg-sblue text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {label}
              {count !== null && ` (${count})`}
            </Link>
          );
        })}
      </nav>

      {/* In every view, so it can still say how sending went once the drafts are gone */}
      <SendDraftsButton ids={view === "luonnokset" ? sendable : []} mailOn={mailMode() !== "off"} />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {invoices.length === 0 ? (
          <p className="p-6 text-gray-600">Ei laskuja tässä näkymässä.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Numero</th>
                <th scope="col" className="px-4 py-2 font-medium">Vastaanottaja</th>
                <th scope="col" className="px-4 py-2 font-medium">Otsikko</th>
                <th scope="col" className="px-4 py-2 font-medium">Eräpäivä</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Summa</th>
                <th scope="col" className="px-4 py-2 font-medium">Tila</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const note = deliveryNote(invoice);
                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <Link href={`/admin/laskut/${invoice.id}`} className="font-medium text-sblue hover:underline">
                        {invoice.number ?? "Luonnos"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{invoice.recipientName}</td>
                    <td className="px-4 py-3">{invoice.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {invoice.dueDate ? formatFullDate(invoice.dueDate) : "–"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{euros(invoice.totalCents)}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <InvoiceStatusBadge status={invoice.status} overdue={invoice.overdue} />
                        {note && <span className={`text-sm ${note.tone}`}>{note.text}</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={4}>
                  Yhteensä {invoices.length} laskua
                </td>
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{euros(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
