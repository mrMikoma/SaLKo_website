import Link from "next/link";
import connectionPool from "@/utilities/db";
import { getLatestSyncRuns } from "@/utilities/flightLogData";
import { getBillingOverview } from "@/utilities/billingData";
import { INTRO_FLIGHT_DAYS_PER_YEAR } from "@/utilities/flightStats";
import { thisYear } from "@/utilities/statsData";
import { formatDateTime } from "@/utilities/flightFormat";

/**
 * The admin front page's flight-log panel: what needs doing, each with a
 * link to where it's done
 */
const FlightLogTasks = async () => {
  const year = thisYear();
  const [sync, counts, periods] = await Promise.all([
    getLatestSyncRuns(),
    connectionPool.query(
      `SELECT
         (SELECT count(*)::int FROM sheet_flights f
          WHERE f.missing_since IS NULL
            AND (f.status IS NULL OR lower(trim(f.status)) NOT IN
                 ('tarkistettu', 'laskutettu', 'ei laskuteta', 'maksettu'))) AS unchecked,
         (SELECT count(*)::int FROM sheet_flight_issues) AS issues,
         (SELECT count(DISTINCT flight_date)::int FROM sheet_flights
          WHERE missing_since IS NULL AND purpose_code = 'ESI'
            AND extract(year FROM flight_date)::int = $1) AS intro_days`,
      [year]
    ),
    getBillingOverview(),
  ]);
  const { unchecked, issues, intro_days: introDays } = counts.rows[0];
  const open = periods.filter((p) => !p.period.closedAt);
  const unpaid = periods.filter((p) => p.period.closedAt && p.paid < p.payers);
  const syncFailed = sync.latest?.status === "error";

  const tasks: { href: string; label: string; detail: string; attention: boolean }[] = [
    {
      href: "/admin/lennot",
      label: "Taulukon synkronointi",
      detail: syncFailed
        ? `Epäonnistui: ${sync.latest!.error}`
        : sync.lastSuccess?.finishedAt
          ? `Viimeksi ${formatDateTime(sync.lastSuccess.finishedAt)}`
          : "Ei vielä synkronoitu",
      attention: syncFailed,
    },
    {
      href: "/admin/lennot?nakyma=tarkistamatta",
      label: "Tarkistamatta",
      detail: unchecked === 0 ? "Kaikki lennot tarkistettu" : `${unchecked} lentoa paperia vasten`,
      attention: unchecked > 0,
    },
    {
      href: "/admin/lennot",
      label: "Taulukon huomautukset",
      detail: issues === 0 ? "Ei huomautettavaa" : `${issues} riviä`,
      attention: issues > 0,
    },
    {
      href: open[0] ? `/admin/laskutus/${open[0].period.id}` : "/admin/laskutus",
      label: "Laskutus",
      detail: open[0]
        ? `Jakso ${open[0].period.name} auki${open[0].blockers > 0 ? `, ${open[0].blockers} vaatii huomiota` : ", valmis suljettavaksi"}`
        : unpaid.length > 0
          ? `${unpaid.reduce((sum, p) => sum + p.payers - p.paid, 0)} maksamatonta laskua`
          : "Ei avoimia jaksoja",
      attention: open.length > 0 || unpaid.length > 0,
    },
    {
      href: `/admin/tilastot?vuosi=${year}`,
      label: `Esittelylentopäivät ${year}`,
      detail: `${introDays} / ${INTRO_FLIGHT_DAYS_PER_YEAR} käytetty`,
      attention: introDays >= INTRO_FLIGHT_DAYS_PER_YEAR,
    },
  ];

  return (
    <section className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h2 className="text-xl font-semibold mb-4">Lentopäiväkirja</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <li key={task.label}>
            <Link
              href={task.href}
              className={`block h-full rounded-lg border p-4 hover:shadow ${
                task.attention ? "border-orange-300 bg-orange-50" : "border-gray-200"
              }`}
            >
              <span className="block font-medium">{task.label}</span>
              <span className={`block text-sm ${task.attention ? "text-orange-900" : "text-gray-600"}`}>
                {task.detail}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FlightLogTasks;
