export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { ensureFreshSync } from "@/utilities/flightSync";
import { getPeriodView } from "@/utilities/billingData";
import { euros } from "@/utilities/billing";
import { formatDateTime, formatFullDate, formatMinutes } from "@/utilities/flightFormat";
import BillLines, { signedMinutes } from "@/components/billing/BillLines";
import { OpenPeriodActions, PaidToggle } from "@/components/billing/PeriodActions";

export const metadata = {
  title: "Laskutusjakso | Ylläpito",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

// Where each kind of problem is fixed
const FIX_LINKS = {
  unchecked: { href: "/admin/lennot?nakyma=tarkistamatta", label: "Tarkista lennot" },
  unmatched: { href: "/admin/lennot", label: "Yhdistä nimet" },
  unknown_purpose: { href: "/admin/laskutus/asetukset", label: "Lennon tarkoitukset" },
  missing_minutes: { href: "/admin/lennot", label: "Lennot" },
  no_rate: { href: "/admin/laskutus/asetukset", label: "Hinnat" },
};

export default async function BillingPeriodPage({ params }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await ensureFreshSync();
  const view = await getPeriodView(id);
  if (!view) notFound();
  const { period, bill, payers } = view;
  const open = !period.closedAt;
  const unbilledMinutes = bill.unbilled.reduce((sum, line) => sum + line.minutes, 0);

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/admin/laskutus" className="text-sm text-sblue hover:underline">
            ← Laskutus
          </Link>
          <h1 className="text-3xl font-bold mt-1">Laskutusjakso {period.name}</h1>
          <p className="text-gray-600 mt-1">
            {formatFullDate(period.startsOn)}–{formatFullDate(period.endsOn)} ·{" "}
            {open
              ? "avoin: luvut lasketaan taulukon nykyisistä tiedoista"
              : `suljettu ${formatDateTime(period.closedAt!)}${period.closedByName ? `, ${period.closedByName}` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <a
            href={`/admin/laskutus/${period.id}/csv`}
            className="min-h-11 inline-flex items-center px-4 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
          >
            CSV, rivit
          </a>
          <a
            href={`/admin/laskutus/${period.id}/csv?taso=maksajat`}
            className="min-h-11 inline-flex items-center px-4 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
          >
            CSV, maksajat
          </a>
          <Link
            href={`/admin/laskutus/${period.id}/tuloste`}
            className="min-h-11 inline-flex items-center px-4 rounded-lg bg-white border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
          >
            Tulostettavat yhteenvedot
          </Link>
        </div>
      </div>

      {open && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {bill.blockers.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold">Ennen sulkemista</h2>
              <ul className="mt-2 space-y-2">
                {bill.blockers.map((blocker) => (
                  <li key={`${blocker.kind}-${blocker.message}`} className="flex flex-wrap gap-x-3 text-sm">
                    <span className="font-medium text-orange-900">{blocker.message}</span>
                    <span className="text-gray-600 tabular-nums">
                      {blocker.rows.length === 1 ? "rivi" : "rivit"} {blocker.rows.join(", ")}
                    </span>
                    <Link href={FIX_LINKS[blocker.kind].href} className="text-sblue hover:underline">
                      {FIX_LINKS[blocker.kind].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-green-800">
              Kaikki jakson lennot on tarkistettu ja maksajat tiedossa. Jakson voi sulkea.
            </p>
          )}
          <OpenPeriodActions periodId={period.id} name={period.name} canClose={bill.blockers.length === 0} />
        </div>
      )}

      {view.changedSince.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-orange-900">Muuttunut laskutuksen jälkeen</h2>
          <p className="text-sm text-gray-600 mt-1">
            Näitä lentoja on muutettu taulukossa jakson sulkemisen jälkeen. Korjaus tulee
            seuraavaan avoimeen jaksoon.
          </p>
          <ul className="mt-2 text-sm list-disc list-inside">
            {view.changedSince.map((flight) => (
              <li key={flight.flightId}>
                {flight.sheetRow ? `Rivi ${flight.sheetRow}: ` : "Poistettu: "}
                {flight.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-baseline justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Maksajat ({bill.payers.length})</h2>
          <p className="text-lg font-semibold tabular-nums">Yhteensä {euros(bill.totalCents)}</p>
        </div>
        {bill.payers.length === 0 ? (
          <p className="p-6 text-gray-600">Jaksossa ei ole laskutettavia lentoja.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {bill.payers.map((payer) => {
              const status = payers[payer.key];
              return (
                <li key={payer.key} className="px-6 py-4">
                  <details>
                    <summary className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 cursor-pointer">
                      <span>
                        <span className="font-semibold">{payer.name}</span>
                        <span className="text-sm text-gray-600">
                          {payer.userId ? (status?.email ? ` · ${status.email}` : "") : " · ei jäsen"}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-6 text-sm tabular-nums">
                        <span>{payer.flights} lentoa</span>
                        <span>{formatMinutes(payer.minutes)} h</span>
                        <span>{payer.landings} laskua</span>
                        <span className="text-base font-semibold">{euros(payer.totalCents)}</span>
                      </span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <BillLines lines={payer.lines} totalCents={payer.totalCents} />
                    </div>
                  </details>
                  {!open && (
                    <div className="mt-2">
                      <PaidToggle
                        periodId={period.id}
                        payerKey={payer.key}
                        payerName={payer.name}
                        paidLabel={
                          status?.paidAt
                            ? `${formatDateTime(status.paidAt)}${status.paidByName ? `, ${status.paidByName}` : ""}`
                            : null
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {bill.unbilled.length > 0 && (
        <details className="bg-white rounded-lg shadow px-6 py-4">
          <summary className="cursor-pointer font-semibold">
            Ei laskuteta: {bill.unbilled.length} lentoa, {signedMinutes(unbilledMinutes)} h
          </summary>
          <div className="mt-3 overflow-x-auto">
            <BillLines lines={bill.unbilled} />
          </div>
        </details>
      )}
    </div>
  );
}
