"use client";

import { useState, useTransition } from "react";
import type { SheetFlight, FlightIssueRow } from "@/utilities/flightLogData";
import {
  formatClock,
  formatDateTime,
  formatFlightDate,
  formatFullDate,
  formatMinutes,
  statusLabel,
} from "@/utilities/flightFormat";
import { isBilledStatus, ReviewStatus } from "@/utilities/flightSheetParser";
import { setFlightStatus } from "@/utilities/flightLogs";

interface FlightTableProps {
  flights: SheetFlight[];
  issues: FlightIssueRow[];
  // Set when the viewer may change Tila (MANAGE_FLIGHT_LOG)
  review?: { registration: string };
  emptyText?: string;
  totalLabel?: string;
  // Dates with the year, for lists that span months
  fullDates?: boolean;
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

const ACTIONS: { status: ReviewStatus; label: string; className: string }[] = [
  {
    status: "Tarkistettu",
    label: "Merkitse tarkistetuksi",
    className: "bg-sblue text-white hover:bg-sblued",
  },
  {
    status: "Korjattava",
    label: "Korjattava",
    className: "border border-orange-400 text-orange-900 bg-white hover:bg-orange-50",
  },
  {
    status: "",
    label: "Palauta kirjatuksi",
    className: "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50",
  },
];

/**
 * An aircraft's flights as the sheet has them, with the issues the sync found
 * on each row. With `review`, the biller ticks the rows that match the paper
 * book and sets their Tila in the sheet.
 */
const FlightTable = ({
  flights,
  issues,
  review,
  emptyText,
  totalLabel,
  fullDates,
}: FlightTableProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const issuesByRow = new Map<number, string[]>();
  for (const issue of issues) {
    issuesByRow.set(issue.sheetRow, [...(issuesByRow.get(issue.sheetRow) ?? []), issue.message]);
  }

  const totalMinutes = flights.reduce((sum, f) => sum + (f.airborneMinutes ?? 0), 0);
  const totalLandings = flights.reduce((sum, f) => sum + (f.landings ?? 0), 0);

  // Rows already in billing keep their Tila; a selection from before a
  // refresh only counts the rows still shown
  const selectable = flights.filter((flight) => !isBilledStatus(flight.status));
  const chosen = selectable.filter((flight) => selected.has(flight.id));
  const allChosen = selectable.length > 0 && chosen.length === selectable.length;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = (status: ReviewStatus, label: string) => {
    if (!review || chosen.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await setFlightStatus({
        registration: review.registration,
        status,
        flights: chosen.map((flight) => ({ id: flight.id, inputHash: flight.inputHash })),
      });
      if (result.status === "error") {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setSelected(new Set());
      setMessage({
        kind: "success",
        text:
          result.result.changed === 0
            ? "Valituilla lennoilla oli jo tämä tila."
            : `${result.result.changed} ${result.result.changed === 1 ? "lento" : "lentoa"}: ${label.toLowerCase()}.`,
      });
    });
  };

  if (flights.length === 0) {
    return <p className="p-6 text-gray-600">{emptyText ?? "Ei lentoja tässä kuussa."}</p>;
  }

  return (
    <div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mx-6 mt-4 rounded-lg p-3 text-sm ${
            message.kind === "error"
              ? "border border-red-300 bg-red-50 text-red-800"
              : "border border-green-300 bg-green-50 text-green-900"
          }`}
        >
          {message.text}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm text-gray-900">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              {review && (
                <th scope="col" className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    className="h-5 w-5 align-middle"
                    aria-label="Valitse kaikki"
                    checked={allChosen}
                    disabled={selectable.length === 0}
                    onChange={() =>
                      setSelected(allChosen ? new Set() : new Set(selectable.map((f) => f.id)))
                    }
                  />
                </th>
              )}
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
              const isSelected = selected.has(flight.id);
              const billed = isBilledStatus(flight.status);
              return (
                <tr
                  key={flight.id}
                  className={
                    isSelected ? "bg-blue-50" : rowIssues.length > 0 ? "bg-orange-50" : ""
                  }
                >
                  {review && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 align-middle"
                        aria-label={`Valitse rivi ${flight.sheetRow}`}
                        checked={isSelected}
                        disabled={billed}
                        title={billed ? "Kuuluu jo laskutukseen" : undefined}
                        onChange={() => toggle(flight.id)}
                      />
                    </td>
                  )}
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
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fullDates ? formatFullDate(flight.flightDate) : formatFlightDate(flight.flightDate)}
                  </td>
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
                    {flight.statusChangedAt && (
                      <span className="block text-xs text-gray-600 mt-0.5">
                        {flight.statusChangedBy ?? "–"}, {formatDateTime(flight.statusChangedAt)}
                      </span>
                    )}
                    {rowIssues.length > 0 && (
                      <ul className="mt-1 text-xs text-orange-900 list-disc list-inside">
                        {rowIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
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
              <td className="px-3 py-2" colSpan={review ? 7 : 6}>
                {totalLabel ?? "Yhteensä"} {flights.length} lentoa
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMinutes(totalMinutes)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totalLandings}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {review && chosen.length > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white/95 px-6 py-3 backdrop-blur">
          <span className="text-sm font-medium text-gray-900 tabular-nums">
            {chosen.length} valittu
          </span>
          {ACTIONS.map((action) => (
            <button
              key={action.status || "kirjattu"}
              type="button"
              disabled={isPending}
              onClick={() => apply(action.status, action.status || "Kirjattu")}
              className={`min-h-11 px-4 rounded-lg text-sm font-medium disabled:opacity-60 ${action.className}`}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="min-h-11 px-3 text-sm text-gray-700 hover:underline"
          >
            Poista valinta
          </button>
          {isPending && <span className="text-sm text-gray-600">Tallennetaan taulukkoon…</span>}
        </div>
      )}
    </div>
  );
};

export default FlightTable;
