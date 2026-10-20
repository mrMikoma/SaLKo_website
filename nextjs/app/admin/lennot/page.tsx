export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
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
  getUnmatchedPilots,
} from "@/utilities/flightLogData";
import { formatDateTime, formatFullDate, formatMonth } from "@/utilities/flightFormat";
import SyncStatus from "@/components/flightLogs/SyncStatus";
import PilotMatching from "@/components/flightLogs/PilotMatching";
import FlightTable from "@/components/flightLogs/FlightTable";

export const metadata = {
  title: "Lennot | Ylläpito",
};

interface PageProps {
  searchParams: Promise<{ kone?: string; kuukausi?: string }>;
}

function sheetKind(): "google" | "fixture" | null {
  try {
    return getFlightSheet().kind;
  } catch {
    return null;
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

  const [sync, flights, issues, unmatched, matched, members] = await Promise.all([
    getLatestSyncRuns(),
    registration && month ? getFlightsForMonth(registration, month) : [],
    registration ? getFlightIssues(registration) : [],
    getUnmatchedPilots(),
    getMatchedPilots(),
    getMemberOptions(),
  ]);

  const otherIssues = issues.filter((issue) => issue.kind !== "unknown_pilot");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lennot</h1>
        <p className="text-gray-600 mt-2">
          Lentopäiväkirjan kopio kerhon Google-taulukosta. Lentoja muokataan
          taulukossa; tämä sivu näyttää ne ja kertoo, mitä pitää tarkistaa.
        </p>
      </div>

      <SyncStatus
        lastSuccessLabel={
          sync.lastSuccess?.finishedAt ? formatDateTime(sync.lastSuccess.finishedAt) : null
        }
        latestError={sync.latest?.status === "error" ? sync.latest.error : null}
        rowsRead={sync.lastSuccess?.rowsRead ?? null}
        issues={sync.lastSuccess?.issues ?? null}
        sheetKind={sheetKind()}
      />

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
          {months.length > 0 && registration && (
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
        <FlightTable flights={flights} issues={issues} />
      </div>
    </div>
  );
}
