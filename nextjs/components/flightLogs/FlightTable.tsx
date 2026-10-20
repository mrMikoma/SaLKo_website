import { SheetFlight, FlightIssueRow } from "@/utilities/flightLogData";
import {
  formatClock,
  formatFlightDate,
  formatMinutes,
  statusLabel,
} from "@/utilities/flightFormat";

interface FlightTableProps {
  flights: SheetFlight[];
  issues: FlightIssueRow[];
}

const statusClass = (status: string | null) => {
  switch (status) {
    case "Korjattava":
      return "bg-orange-100 text-orange-900";
    case "Tarkistettu":
      return "bg-blue-100 text-blue-900";
    case "Laskutettu":
    case "Ei laskuteta":
      return "bg-purple-100 text-purple-900";
    case "Maksettu":
      return "bg-green-100 text-green-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * One month of an aircraft's flights as the sheet has them, with the issues
 * the sync found on each row
 */
const FlightTable = ({ flights, issues }: FlightTableProps) => {
  const issuesByRow = new Map<number, string[]>();
  for (const issue of issues) {
    issuesByRow.set(issue.sheetRow, [...(issuesByRow.get(issue.sheetRow) ?? []), issue.message]);
  }

  const totalMinutes = flights.reduce((sum, f) => sum + (f.airborneMinutes ?? 0), 0);
  const totalLandings = flights.reduce((sum, f) => sum + (f.landings ?? 0), 0);

  if (flights.length === 0) {
    return <p className="p-6 text-gray-600">Ei lentoja tässä kuussa.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm text-gray-900">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Rivi</th>
            <th scope="col" className="px-3 py-2 font-medium">Päivä</th>
            <th scope="col" className="px-3 py-2 font-medium">Päällikkö</th>
            <th scope="col" className="px-3 py-2 font-medium">Oppilas / SIC</th>
            <th scope="col" className="px-3 py-2 font-medium">Reitti</th>
            <th scope="col" className="px-3 py-2 font-medium">Ajat</th>
            <th scope="col" className="px-3 py-2 font-medium text-right">Ilmassa</th>
            <th scope="col" className="px-3 py-2 font-medium text-right">Laskut</th>
            <th scope="col" className="px-3 py-2 font-medium">Tarkoitus</th>
            <th scope="col" className="px-3 py-2 font-medium">Tila</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {flights.map((flight) => {
            const rowIssues = issuesByRow.get(flight.sheetRow) ?? [];
            return (
              <tr key={flight.id} className={rowIssues.length > 0 ? "bg-orange-50" : ""}>
                <td className="px-3 py-2 tabular-nums">
                  {flight.sheetUrl ? (
                    <a
                      href={flight.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sblue hover:underline"
                      title="Avaa taulukossa"
                    >
                      {flight.sheetRow}
                    </a>
                  ) : (
                    flight.sheetRow
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatFlightDate(flight.flightDate)}</td>
                <td className="px-3 py-2">{flight.picName}</td>
                <td className="px-3 py-2">{flight.secondName ?? "–"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {flight.departure ?? "?"}–{flight.arrival ?? "?"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  {formatClock(flight.takeoffAt)}–{formatClock(flight.landingAt)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMinutes(flight.airborneMinutes)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{flight.landings ?? "–"}</td>
                <td className="px-3 py-2" title={flight.purposeName ?? undefined}>
                  {flight.purposeCode ?? "–"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(flight.status)}`}
                  >
                    {statusLabel(flight.status)}
                  </span>
                  {rowIssues.length > 0 && (
                    <ul className="mt-1 text-xs text-orange-900 list-disc list-inside">
                      {rowIssues.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={6}>
              Yhteensä {flights.length} lentoa
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMinutes(totalMinutes)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{totalLandings}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FlightTable;
