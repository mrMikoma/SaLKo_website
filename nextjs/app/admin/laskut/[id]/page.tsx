export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { getInvoice, getInvoiceSettings, InvoiceDelivery } from "@/utilities/invoiceData";
import { invoicePresets } from "@/utilities/invoices";
import { getSender, mailMode } from "@/utilities/mailConfig";
import { formatDateTime } from "@/utilities/flightFormat";
import InvoiceDocument, { InvoiceStatusBadge } from "@/components/invoices/InvoiceDocument";
import {
  DraftEditor,
  DraftLines,
  DraftSend,
  OpenInvoiceActions,
  PaidInvoiceActions,
} from "@/components/invoices/InvoiceActions";
import PrintButton from "@/components/billing/PrintButton";

export const metadata = {
  title: "Lasku | Ylläpito",
};

const DELIVERY: Record<InvoiceDelivery["status"], { label: string; tone: string }> = {
  queued: { label: "Jonossa", tone: "text-gray-700" },
  sending: { label: "Lähtemässä", tone: "text-gray-700" },
  sent: { label: "Lähetetty", tone: "text-green-800" },
  failed: { label: "Epäonnistui", tone: "text-red-700" },
  held: { label: "Ei lähetetty (sähköposti ei käytössä)", tone: "text-amber-800" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }
  const id = Number((await params).id);
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice) notFound();
  const settings = await getInvoiceSettings();
  const card = "bg-white rounded-lg shadow p-6 space-y-4";

  return (
    <div className="space-y-6 text-gray-900">
      <div className="print:hidden">
        <Link href={`/admin/laskut?nakyma=${invoice.status === "draft" ? "luonnokset" : "kaikki"}`} className="text-sm text-sblue hover:underline">
          ← Laskut
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">
            {invoice.number ? `Lasku ${invoice.number}` : `Luonnos: ${invoice.recipientName}`}
          </h1>
          <InvoiceStatusBadge status={invoice.status} overdue={invoice.overdue} />
        </div>
        <p className="text-gray-600 mt-1">
          Luotu {formatDateTime(invoice.createdAt)}
          {invoice.createdByName && `, ${invoice.createdByName}`}
          {invoice.sentAt && ` · lähetetty ${formatDateTime(invoice.sentAt)}${invoice.sentByName ? `, ${invoice.sentByName}` : ""}`}
          {invoice.paidAt && ` · maksettu ${formatDateTime(invoice.paidAt)}${invoice.paidByName ? `, ${invoice.paidByName}` : ""}`}
          {invoice.periodId && (
            <>
              {" · "}
              <Link href={`/admin/laskutus/${invoice.periodId}`} className="text-sblue hover:underline">
                jakso {invoice.periodName}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] items-start">
        <InvoiceDocument invoice={invoice} contactEmail={getSender("billing").address} footer={settings.footer} />

        <div className="space-y-6 print:hidden">
          {invoice.status === "draft" && (
            <>
              <section className={card}>
                <h2 className="text-xl font-semibold">Lähetys</h2>
                <DraftSend invoice={invoice} mailOn={mailMode() !== "off"} />
              </section>
              <section className={card}>
                <h2 className="text-xl font-semibold">Vastaanottaja ja tekstit</h2>
                <DraftEditor invoice={invoice} />
              </section>
              <section className={card}>
                <h2 className="text-xl font-semibold">Lisää rivejä</h2>
                {invoice.periodId && (
                  <p className="text-sm text-gray-600">Jakson lentorivit pysyvät sellaisina kuin ne laskutettiin.</p>
                )}
                <DraftLines invoice={invoice} presets={invoicePresets()} />
              </section>
            </>
          )}
          {invoice.status === "open" && (
            <section className={card}>
              <h2 className="text-xl font-semibold">Avoin lasku</h2>
              <OpenInvoiceActions invoice={invoice} />
            </section>
          )}
          {invoice.status === "paid" && (
            <section className={card}>
              <h2 className="text-xl font-semibold">Maksettu</h2>
              <PaidInvoiceActions invoice={invoice} />
            </section>
          )}
          {invoice.status !== "draft" && (
            <section className={card}>
              <PrintButton />
            </section>
          )}
          {invoice.deliveries.length > 0 && (
            <section className={card}>
              <h2 className="text-xl font-semibold">Sähköpostit</h2>
              <ul className="space-y-3 text-sm">
                {invoice.deliveries.map((delivery) => (
                  <li key={delivery.id}>
                    <p>
                      <span className={`font-medium ${DELIVERY[delivery.status].tone}`}>
                        {DELIVERY[delivery.status].label}
                      </span>{" "}
                      · {formatDateTime(delivery.sentAt ?? delivery.createdAt)}
                    </p>
                    <p className="text-gray-700 break-words">
                      {delivery.toAddress}
                      {delivery.deliveredTo && delivery.deliveredTo !== delivery.toAddress && (
                        <> (ohjattu: {delivery.deliveredTo})</>
                      )}
                    </p>
                    {delivery.lastError && (
                      <p className="text-red-700" role="alert">
                        {delivery.lastError}{" "}
                        <Link href="/admin/laskutus/viestit" className="underline">
                          Sähköpostit
                        </Link>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
