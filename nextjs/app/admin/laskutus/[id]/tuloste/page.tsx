export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { getPeriodView } from "@/utilities/billingData";
import { euros } from "@/utilities/billing";
import { formatFullDate, formatMinutes } from "@/utilities/flightFormat";
import BillLines from "@/components/billing/BillLines";
import PrintButton from "@/components/billing/PrintButton";

export const metadata = {
  title: "Laskutuksen yhteenvedot | Ylläpito",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** One page per payer, to print or save as PDF, like the sheet's TEMPLATE tab */
export default async function BillingPrintPage({ params }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const view = await getPeriodView(id);
  if (!view) notFound();
  const { period, bill, payers } = view;

  return (
    <div className="text-gray-900">
      <div className="print:hidden mb-6 flex flex-wrap items-center gap-4">
        <Link href={`/admin/laskutus/${period.id}`} className="text-sblue hover:underline">
          ← Jakso {period.name}
        </Link>
        <PrintButton />
        {!period.closedAt && (
          <p className="text-orange-800">Jakso on vielä avoin: luvut voivat muuttua.</p>
        )}
      </div>
      {bill.payers.map((payer) => (
        <section
          key={payer.key}
          className="bg-white rounded-lg shadow p-8 mb-6 print:shadow-none print:rounded-none print:p-0 print:mb-0 break-after-page"
        >
          <header className="flex flex-wrap justify-between gap-4 border-b border-gray-300 pb-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Savonlinnan Lentokerho ry · lentolaskutus</p>
              <h1 className="text-2xl font-bold">{payer.name}</h1>
              {payers[payer.key]?.email && <p className="text-gray-700">{payers[payer.key].email}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold">Jakso {period.name}</p>
              <p className="text-gray-700">
                {formatFullDate(period.startsOn)}–{formatFullDate(period.endsOn)}
              </p>
            </div>
          </header>
          <BillLines lines={payer.lines} totalCents={payer.totalCents} />
          <p className="mt-4 text-sm text-gray-700">
            {payer.flights} lentoa, {formatMinutes(payer.minutes)} h, {payer.landings} laskua.
            Maksettavaa yhteensä <strong>{euros(payer.totalCents)}</strong>.
          </p>
        </section>
      ))}
      {bill.payers.length === 0 && <p>Jaksossa ei ole laskutettavaa.</p>}
    </div>
  );
}
