export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { ensureFreshSync } from "@/utilities/flightSync";
import { getYearStats, getYearTotals, thisYear } from "@/utilities/statsData";
import { INTRO_FLIGHT_DAYS_PER_YEAR, Totals } from "@/utilities/flightStats";
import { formatFullDate, formatMinutes } from "@/utilities/flightFormat";
import StatsFilters from "@/components/stats/StatsFilters";
import { DeleteYearTotal, YearTotalsForm } from "@/components/stats/YearTotalsForm";

export const metadata = {
  title: "Tilastot | Ylläpito",
};

interface PageProps {
  searchParams: Promise<{ vuosi?: string; kone?: string }>;
}

const card = "bg-white rounded-lg shadow p-6 text-gray-900";
const th = "px-2 sm:px-3 py-2 font-medium";
const td = "px-2 sm:px-3 py-2 tabular-nums";
const monthName = (month: number) =>
  DateTime.fromObject({ year: 2000, month }).setLocale("fi").toFormat("LLLL");

// Against the year before: up to the same day while the year is going
const change = (now: number, before: number, until: string | null) => {
  if (before === 0) return null;
  const percent = Math.round(((now - before) / before) * 100);
  const sign = percent > 0 ? "+" : "";
  if (!until) return `${sign}${percent} % edellisestä vuodesta`;
  const [month, day] = until.split("-").map(Number);
  return `${sign}${percent} % viime vuoden 1.1.–${day}.${month}. verrattuna`;
};

const Figure = ({ label, value, before }: { label: string; value: string; before: string | null }) => (
  <div className={card}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-3xl font-bold tabular-nums">{value}</p>
    {before && <p className="text-sm text-gray-600">{before}</p>}
  </div>
);

const TotalsCells = ({ totals }: { totals: Totals }) => (
  <>
    <td className={`${td} text-right`}>{totals.flights}</td>
    <td className={`${td} text-right`}>{formatMinutes(totals.minutes)}</td>
    <td className={`${td} text-right`}>{totals.landings}</td>
  </>
);

export default async function StatisticsPage({ searchParams }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "VIEW_STATISTICS")) {
    redirect("/");
  }

  const params = await searchParams;
  const requested = Number(params.vuosi);
  const year = Number.isInteger(requested) && requested > 1950 && requested < 2100 ? requested : thisYear();
  await ensureFreshSync();
  const stats = await getYearStats(year, params.kone ?? null);
  const { registration } = stats;
  const yearTotals = await getYearTotals();
  const canEdit = hasPermission(session.user.roles, "MANAGE_FLIGHT_LOG");

  const peak = Math.max(1, ...stats.months.map((m) => m.minutes), ...stats.previousMonths.map((m) => m.minutes));
  const yearRows = [...new Set(yearTotals.map((t) => t.year))].sort((a, b) => b - a);
  const yearAircraft = [...new Set(yearTotals.map((t) => t.registration))].sort();
  const daysUsed = stats.introDays.length;
  const xlsxHref = `/admin/tilastot/xlsx?vuosi=${year}${registration ? `&kone=${encodeURIComponent(registration)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tilastot</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Lentopäiväkirjan kopiosta: kaikki taulukon lennot tilasta riippumatta.
          </p>
        </div>
        <a
          href={xlsxHref}
          className="shrink-0 min-h-11 inline-flex items-center px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
        >
          Lataa Excel
        </a>
      </div>

      <StatsFilters years={stats.years} year={year} aircraft={stats.aircraft} registration={registration} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Figure
          label={`Lentoja ${year}`}
          value={String(stats.totals.flights)}
          before={change(stats.totals.flights, stats.previousTotals.flights, stats.previousUntil)}
        />
        <Figure
          label="Lentoaika"
          value={`${formatMinutes(stats.totals.minutes)} h`}
          before={change(stats.totals.minutes, stats.previousTotals.minutes, stats.previousUntil)}
        />
        <Figure
          label="Laskuja"
          value={String(stats.totals.landings)}
          before={change(stats.totals.landings, stats.previousTotals.landings, stats.previousUntil)}
        />
      </div>

      <section className={card}>
        <h2 className="text-xl font-semibold mb-3">Kuukausittain</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th scope="col" className={th}>Kuukausi</th>
                <th scope="col" className={`${th} w-1/3 min-w-28`}>
                  <span className="inline-block w-3 h-3 rounded-sm bg-sblue align-middle" /> {year}{" "}
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 align-middle ml-2" /> {year - 1}
                </th>
                <th scope="col" className={`${th} text-right`}>Lentoja</th>
                <th scope="col" className={`${th} text-right`}>Aika</th>
                <th scope="col" className={`${th} text-right hidden sm:table-cell`}>Laskuja</th>
                <th scope="col" className={`${th} text-right hidden sm:table-cell`}>Aika {year - 1}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.months.map((month, i) => (
                <tr key={i}>
                  <td className={`${td} capitalize`}>{monthName(i + 1)}</td>
                  <td className="px-3 py-2" aria-hidden="true">
                    <div className="h-2.5 rounded bg-sblue" style={{ width: `${(month.minutes / peak) * 100}%` }} />
                    <div
                      className="h-1.5 mt-0.5 rounded bg-gray-300"
                      style={{ width: `${(stats.previousMonths[i].minutes / peak) * 100}%` }}
                    />
                  </td>
                  <td className={`${td} text-right`}>{month.flights}</td>
                  <td className={`${td} text-right`}>{formatMinutes(month.minutes)}</td>
                  <td className={`${td} text-right hidden sm:table-cell`}>{month.landings}</td>
                  <td className={`${td} text-right text-gray-600 hidden sm:table-cell`}>
                    {formatMinutes(stats.previousMonths[i].minutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-semibold mb-3">Lentäjittäin</h2>
          {stats.pilots.length === 0 ? (
            <p className="text-gray-600">Ei lentoja.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th scope="col" className={th}>Lentäjä</th>
                    <th scope="col" className={`${th} text-right`}>Päällikkönä</th>
                    <th scope="col" className={`${th} text-right`}>Oppilaana / SIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.pilots.map((pilot) => (
                    <tr key={pilot.key}>
                      <td className="px-3 py-2">
                        {pilot.name}
                        {pilot.status === "unmatched" && <span className="text-xs text-gray-500"> · ei yhdistetty</span>}
                        {pilot.status === "non-member" && <span className="text-xs text-gray-500"> · ei jäsen</span>}
                      </td>
                      <td className={`${td} text-right`}>
                        {pilot.asPic.flights > 0 ? `${formatMinutes(pilot.asPic.minutes)} (${pilot.asPic.flights})` : "–"}
                      </td>
                      <td className={`${td} text-right`}>
                        {pilot.asSecond.flights > 0
                          ? `${formatMinutes(pilot.asSecond.minutes)} (${pilot.asSecond.flights})`
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-600 mt-2">Aika (lentoja).</p>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className="text-xl font-semibold mb-3">Lennon tarkoituksittain</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th scope="col" className={th}>Tarkoitus</th>
                <th scope="col" className={`${th} text-right`}>Lentoja</th>
                <th scope="col" className={`${th} text-right`}>Aika</th>
                <th scope="col" className={`${th} text-right`}>Laskuja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.purposes.map((purpose) => (
                <tr key={purpose.code}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{purpose.code}</span>{" "}
                    <span className="text-gray-600">{purpose.name}</span>
                  </td>
                  <TotalsCells totals={purpose.totals} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className={card}>
        <h2 className="text-xl font-semibold">Lentotoimintailmoitus {year}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Traficomille koneittain seuraavan vuoden tammikuun loppuun mennessä. Ryhmittely kuten
          kerhon taulukossa.
        </p>
        {stats.unchecked > 0 && (
          <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            Vuoden lennoista {stats.unchecked} on vielä tarkistamatta paperista. Ne ovat luvuissa
            mukana, kuten taulukon omissa tilastoissa: tarkista ne ennen ilmoitusta{" "}
            <a href="/admin/lennot?nakyma=tarkistamatta" className="underline">
              Tarkistamatta-listalla
            </a>
            .
          </p>
        )}
        {stats.reports.length === 0 && <p className="mt-3 text-gray-600">Ei lentoja.</p>}
        {stats.reports.map((report) => {
          const sum = report.rows.at(-1)!.totals;
          return (
            <div key={report.registration} className="mt-4 overflow-x-auto">
              <h3 className="font-semibold">{report.registration}</h3>
              <table className="w-full max-w-2xl text-sm mt-2">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th scope="col" className={th}></th>
                    <th scope="col" className={`${th} text-right`}>Lentoa</th>
                    <th scope="col" className={`${th} text-right`}>Tuntia</th>
                    <th scope="col" className={`${th} text-right`}>Laskua</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={row.label}
                      className={
                        row.kind === "code"
                          ? "text-gray-700"
                          : row.kind === "subtotal"
                            ? "font-medium border-t border-gray-200"
                            : "font-bold border-t-2 border-gray-300"
                      }
                    >
                      <td className={`px-3 py-1 ${row.kind === "code" ? "pl-6" : ""}`}>{row.label}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{row.totals.flights}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{formatMinutes(row.totals.minutes)}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{row.totals.landings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.counters && (
                <p className="text-sm mt-2">
                  Taulukon laskureista: vuoden lopussa kokonaisaika{" "}
                  {formatMinutes(report.counters.airframeMinutes)} h ja {report.counters.totalLandings} laskua.
                  {report.counters.breaks.length > 0 && (
                    <span className="text-orange-800">
                      {" "}
                      Laskurit eivät jatku edelliseltä riviltä riveillä{" "}
                      {report.counters.breaks.slice(0, 10).join(", ")}
                      {report.counters.breaks.length > 10 ? " …" : ""}: tarkista kopioidut rivit, yli
                      puolenyön lennot ja &quot;Virhe kirjassa&quot;.
                    </span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold">
          Esittelylentopäivät {year}: {daysUsed} / {INTRO_FLIGHT_DAYS_PER_YEAR}
        </h2>
        <p className={`text-sm mt-1 ${daysUsed > INTRO_FLIGHT_DAYS_PER_YEAR ? "text-red-700" : "text-gray-600"}`}>
          OPS M1-33: esittelylentoja enintään {INTRO_FLIGHT_DAYS_PER_YEAR} päivänä kalenterivuodessa.
          Päivät, joilla taulukossa on ESI-koodattu lento: vertaa kerhon esittelylentorekisteriin.
          {daysUsed < INTRO_FLIGHT_DAYS_PER_YEAR
            ? ` Jäljellä ${INTRO_FLIGHT_DAYS_PER_YEAR - daysUsed}.`
            : daysUsed === INTRO_FLIGHT_DAYS_PER_YEAR
              ? " Kaikki päivät käytetty."
              : " Raja ylittyy!"}
        </p>
        {stats.introDays.length > 0 && (
          <table className="w-full max-w-2xl text-sm mt-3">
            <thead className="text-left text-gray-600">
              <tr>
                <th scope="col" className={th}>Päivä</th>
                <th scope="col" className={`${th} text-right`}>Lentoja</th>
                <th scope="col" className={`${th} text-right`}>Lennätettäviä</th>
                <th scope="col" className={th}>Lentäjät</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.introDays.map((day) => (
                <tr key={day.date}>
                  <td className={td}>{formatFullDate(day.date)}</td>
                  <td className={`${td} text-right`}>{day.flights}</td>
                  <td className={`${td} text-right`}>{day.passengers}</td>
                  <td className="px-3 py-2">{day.pilots.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="text-xl font-semibold mb-3">Vuosittain</h2>
        {yearRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th scope="col" className={th}>Vuosi</th>
                  {yearAircraft.map((reg) => (
                    <th key={reg} scope="col" className={`${th} text-right`}>{reg}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearRows.map((y) => (
                  <tr key={y}>
                    <td className={td}>{y}</td>
                    {yearAircraft.map((reg) => {
                      const total = yearTotals.find((t) => t.year === y && t.registration === reg);
                      return (
                        <td key={reg} className={`${td} text-right whitespace-nowrap`}>
                          {total ? formatMinutes(total.minutes) : ""}
                          {total?.entered !== undefined && total.entered !== total.minutes && (
                            <span
                              className="block text-xs text-orange-800"
                              title="Vuodelle on kirjattu tunnit käsin, mutta lentopäiväkirjassa on myös tämän vuoden lentoja: tarkista niiden päivämäärät"
                            >
                              käsin {formatMinutes(total.entered)}
                            </span>
                          )}
                          {total?.source === "entered" && canEdit && (
                            <>
                              {" "}
                              <DeleteYearTotal registration={reg} year={y} />
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-2">
              Lentopäiväkirjan vuodet lasketaan lennoista; aiemmat vuodet on syötetty käsin.
            </p>
          </div>
        )}
        {canEdit && (
          <div className="mt-4">
            <YearTotalsForm />
          </div>
        )}
      </section>
    </div>
  );
}
