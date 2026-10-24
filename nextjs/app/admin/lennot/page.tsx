export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled, isSampleFlightsEnabled } from "@/utilities/features";
import { ensureFreshSync } from "@/utilities/flightSync";
import { getFlightSheet } from "@/utilities/flightSheetSource";
import {
  getAircraftSheets,
  getFlightIssues,
  getFlightMonths,
  getFlightsForMonth,
  getLatestSyncRuns,
  getMatchedPilots,
  getMemberOptions,
  getUncheckedCount,
  getUncheckedFlights,
  getUnmatchedPilots,
  UNCHECKED_LIMIT,
} from "@/utilities/flightLogData";
import { formatDateTime, formatFullDate, formatMonth } from "@/utilities/flightFormat";
import SyncStatus from "@/components/flightLogs/SyncStatus";
import PilotMatching from "@/components/flightLogs/PilotMatching";
import FlightTable from "@/components/flightLogs/FlightTable";
import SampleFlights from "@/components/flightLogs/SampleFlights";

export const metadata = {
  title: "Lennot | Ylläpito",
};

interface PageProps {
  searchParams: Promise<{ kone?: string; kuukausi?: string; nakyma?: string }>;
}

function sheetInfo() {
  try {
    const sheet = getFlightSheet();
    return {
      sheetKind: sheet.kind,
      spreadsheetUrl: sheet.spreadsheetUrl,
      serviceAccount: sheet.serviceAccount,
    };
  } catch {
    return { sheetKind: null, spreadsheetUrl: null, serviceAccount: null };
  }
}

export default async function FlightsAdminPage({ searchParams }: PageProps) {
  // Still being built: shown in dev, hidden in production
  if (!isFlightLogEnabled()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "VIEW_ALL_FLIGHTS")) {
    redirect("/");
  }

  await ensureFreshSync();

  const params = await searchParams;
  const aircraft = await getAircraftSheets();
  const registration =
    aircraft.find((a) => a.registration === params.kone)?.registration ??
    aircraft[0]?.registration;

  const months = registration ? await getFlightMonths(registration) : [];
  const month = months.includes(params.kuukausi ?? "") ? params.kuukausi! : months[0];
  // The month's flights, or every flight not yet compared with the paper book
  const unchecked = params.nakyma === "tarkistamatta";
  const canReview = hasPermission(session.user.roles, "MANAGE_FLIGHT_LOG");

  const [sync, flights, uncheckedCount, issues, unmatched, matched, members] = await Promise.all([
    getLatestSyncRuns(),
    !registration
      ? []
      : unchecked
        ? getUncheckedFlights(registration)
        : month
          ? getFlightsForMonth(registration, month)
          : [],
    registration ? getUncheckedCount(registration) : 0,
    registration ? getFlightIssues(registration) : [],
    getUnmatchedPilots(),
    getMatchedPilots(),
    getMemberOptions(),
  ]);

  const viewHref = (view: "kuukausi" | "tarkistamatta") =>
    `/admin/lennot?kone=${encodeURIComponent(registration ?? "")}${
      view === "tarkistamatta" ? "&nakyma=tarkistamatta" : month ? `&kuukausi=${month}` : ""
    }`;

  const otherIssues = issues.filter((issue) => issue.kind !== "unknown_pilot");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lennot</h1>
          <p className="text-gray-600 mt-2">
            Lentopäiväkirjan kopio kerhon Google-taulukosta. Lentoja muokataan
            taulukossa; tämä sivu näyttää ne ja kertoo, mitä pitää tarkistaa.
          </p>
        </div>
        {canReview && (
          <Link
            href="/admin/lennot/tuonti"
            className="shrink-0 min-h-11 inline-flex items-center px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
          >
            Kirjaa paperisivu
          </Link>
        )}
      </div>

      <SyncStatus
        lastSuccessLabel={
          sync.lastSuccess?.finishedAt ? formatDateTime(sync.lastSuccess.finishedAt) : null
        }
        latestError={sync.latest?.status === "error" ? sync.latest.error : null}
        rowsRead={sync.lastSuccess?.rowsRead ?? null}
        issues={sync.lastSuccess?.issues ?? null}
        {...sheetInfo()}
      />

      {canReview && isSampleFlightsEnabled() && aircraft.length > 0 && (
        <SampleFlights aircraft={aircraft.map((a) => a.registration)} />
      )}

      {otherIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Tarkistettavaa ({otherIssues.length})
          </h2>
          <ul className="mt-3 divide-y divide-gray-200 text-sm">
            {otherIssues.map((issue) => (
              <li
                key={`${issue.sheetRow}-${issue.kind}`}
                className="py-2 flex gap-4 text-gray-900"
              >
                <span className="w-20 shrink-0 text-gray-600 tabular-nums">
                  rivi {issue.sheetRow}
                </span>
                <span className="w-24 shrink-0 text-gray-600">
                  {issue.flightDate ? formatFullDate(issue.flightDate) : ""}
                </span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PilotMatching
        unmatched={unmatched.map((pilot) => ({
          name: pilot.name,
          nameKey: pilot.nameKey,
          flights: pilot.flights,
          lastFlightLabel: formatFullDate(pilot.lastFlight),
        }))}
        matched={matched.map((pilot) => ({
          name: pilot.name,
          nameKey: pilot.nameKey,
          userName: pilot.userName,
        }))}
        members={members}
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" aria-label="Lentokone">
            {aircraft.map((a) => (
              <Link
                key={a.registration}
                href={`/admin/lennot?kone=${encodeURIComponent(a.registration)}`}
                aria-current={a.registration === registration ? "page" : undefined}
                className={`px-4 py-2 rounded-lg font-medium ${
                  a.registration === registration
                    ? "bg-sblue text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {a.registration}
              </Link>
            ))}
          </div>
          <nav className="flex gap-1 rounded-lg bg-gray-100 p-1" aria-label="Näkymä">
            {(
              [
                ["kuukausi", "Kuukausittain"],
                ["tarkistamatta", `Tarkistamatta (${uncheckedCount})`],
              ] as const
            ).map(([view, label]) => {
              const current = (view === "tarkistamatta") === unchecked;
              return (
                <Link
                  key={view}
                  href={viewHref(view)}
                  aria-current={current ? "page" : undefined}
                  className={`min-h-11 inline-flex items-center px-3 rounded-md text-sm font-medium ${
                    current ? "bg-white text-gray-900 shadow" : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          {!unchecked && months.length > 0 && registration && (
            <form className="flex items-center gap-2" action="/admin/lennot">
              <input type="hidden" name="kone" value={registration} />
              <label htmlFor="kuukausi" className="text-sm text-gray-700">
                Kuukausi
              </label>
              <select
                id="kuukausi"
                name="kuukausi"
                defaultValue={month}
                className="border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 bg-white capitalize"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200"
              >
                Näytä
              </button>
            </form>
          )}
        </div>
        {unchecked && uncheckedCount > UNCHECKED_LIMIT && (
          <p className="mx-6 mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            Näytetään {UNCHECKED_LIMIT} vanhinta {uncheckedCount} lennosta. Jos tässä
            näkyy vanhoja, jo laskutettuja lentoja, merkitse niiden Tila taulukossa
            Laskutetuksi (täyttö alaspäin vain riveille, joilla on päivämäärä), niin
            lista lyhenee.
          </p>
        )}
        <FlightTable
          // A new view starts with nothing selected
          key={unchecked ? "tarkistamatta" : `${registration}-${month}`}
          flights={flights}
          issues={issues}
          review={canReview && registration ? { registration } : undefined}
          emptyText={unchecked ? "Kaikki lennot on tarkistettu." : undefined}
          totalLabel={unchecked ? "Tarkistamatta" : undefined}
          fullDates={unchecked}
        />
      </div>
    </div>
  );
}
