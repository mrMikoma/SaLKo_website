export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { ensureFreshSync } from "@/utilities/flightSync";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import { getBillingOverview, PeriodSummary } from "@/utilities/billingData";
import { euros } from "@/utilities/billing";
import { formatDateTime, formatFullDate } from "@/utilities/flightFormat";
import NewPeriodForm from "@/components/billing/NewPeriodForm";

export const metadata = {
  title: "Laskutus | Ylläpito",
};

// The month after the latest period, or the current month
function nextPeriod(periods: PeriodSummary[]) {
  const latest = periods.map((p) => p.period.endsOn).sort().at(-1);
  const start = latest
    ? DateTime.fromISO(latest).plus({ days: 1 })
    : DateTime.now().setZone(SHEET_ZONE).startOf("month");
  return {
    name: start.toFormat("yyyy-MM"),
    startsOn: start.toISODate()!,
    endsOn: start.endOf("month").toISODate()!,
  };
}

export default async function BillingPage() {
  // Still being built: shown in dev, hidden in production
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }

  await ensureFreshSync();
  const periods = await getBillingOverview();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laskutus</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Laskutusjakso laskee tarkistetuista lennoista, mitä kukin lentäjä maksaa.
            Avoimen jakson luvut tulevat taulukosta sellaisinaan; sulkeminen tallentaa
            ne ja merkitsee lennot taulukkoon laskutetuiksi.
          </p>
        </div>
        <Link
          href="/admin/laskutus/asetukset"
          className="shrink-0 min-h-11 inline-flex items-center px-4 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
        >
          Hinnat ja asetukset
        </Link>
      </div>

      <NewPeriodForm suggestion={nextPeriod(periods)} />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {periods.length === 0 ? (
          <p className="p-6 text-gray-600">Ei vielä laskutusjaksoja.</p>
        ) : (
          <table className="w-full text-sm text-gray-900">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Jakso</th>
                <th scope="col" className="px-4 py-2 font-medium">Ajalta</th>
                <th scope="col" className="px-4 py-2 font-medium">Tila</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Maksajia</th>
                <th scope="col" className="px-4 py-2 font-medium text-right">Yhteensä</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {periods.map(({ period, payers, paid, totalCents, blockers }) => (
                <tr key={period.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/laskutus/${period.id}`} className="text-sblue hover:underline">
                      {period.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {formatFullDate(period.startsOn)}–{formatFullDate(period.endsOn)}
                  </td>
                  <td className="px-4 py-3">
                    {period.closedAt ? (
                      <span>
                        Suljettu {formatDateTime(period.closedAt)}
                        {payers > 0 && ` · maksettu ${paid}/${payers}`}
                      </span>
                    ) : blockers > 0 ? (
                      <span className="text-orange-800">Avoin · {blockers} vaatii huomiota</span>
                    ) : (
                      <span className="text-green-800">Avoin · valmis suljettavaksi</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{payers}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{euros(totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
