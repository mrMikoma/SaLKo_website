"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import {
  emptyPaperCells,
  ExistingFlight,
  PAPER_FIELDS,
  PaperCells,
  PaperField,
  paperTotals,
  parseHoursMinutes,
  readPaperGrid,
} from "@/utilities/paperPage";
import { minutesBetween } from "@/utilities/flightFormInput";
import { formatFullDate, formatMinutes } from "@/utilities/flightFormat";
import { isBilledStatus } from "@/utilities/flightSheetParser";
import {
  type PaperPreviewRow,
  previewPaperPage,
  savePaperPage,
} from "@/utilities/flightLogs";

interface PaperPageEntryProps {
  aircraft: string[];
  purposes: { code: string; name: string }[];
  pilotNames: string[];
  airfields: string[];
  today: string;
}

type Action = "new" | "confirm" | "correct" | "skip";

const COLUMNS: {
  field: PaperField;
  label: string;
  width: string;
  mode?: "decimal";
}[] = [
  { field: "date", label: "Päivä", width: "w-24" },
  { field: "pic", label: "Päällikkö", width: "w-32" },
  { field: "second", label: "Oppilas / SIC", width: "w-32" },
  { field: "persons", label: "Hlö", width: "w-10", mode: "decimal" },
  { field: "departure", label: "Mistä", width: "w-16" },
  { field: "arrival", label: "Minne", width: "w-16" },
  { field: "takeoff", label: "Lähtö", width: "w-16", mode: "decimal" },
  { field: "landing", label: "Lasku", width: "w-16", mode: "decimal" },
  { field: "landings", label: "Laskut", width: "w-12", mode: "decimal" },
  { field: "purpose", label: "Tarkoitus", width: "w-16" },
  { field: "remarks", label: "Huomiot", width: "w-36" },
];

const STARTING_ROWS = 12;
const blankGrid = () => Array.from({ length: STARTING_ROWS }, emptyPaperCells);
const lists: Partial<Record<PaperField, string>> = {
  pic: "paper-pilots",
  second: "paper-pilots",
  departure: "paper-airfields",
  arrival: "paper-airfields",
  purpose: "paper-purposes",
};

/**
 * Typing a page of the paper journey log into the sheet: a grid that takes
 * pasted rows, a check against what pilots already entered, and one save.
 */
const PaperPageEntry = ({
  aircraft,
  purposes,
  pilotNames,
  airfields,
  today,
}: PaperPageEntryProps) => {
  const [registration, setRegistration] = useState(aircraft[0] ?? "");
  const [logPage, setLogPage] = useState("");
  const [grid, setGrid] = useState<PaperCells[]>(blankGrid);
  const [printedTime, setPrintedTime] = useState("");
  const [printedLandings, setPrintedLandings] = useState("");
  const [preview, setPreview] = useState<{
    key: string;
    rows: PaperPreviewRow[];
    notOnPage: ExistingFlight[];
  } | null>(null);
  const [actions, setActions] = useState<Map<number, Action>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A preview holds only for the grid it was made from
  const gridKey = JSON.stringify([registration, grid]);
  const current = preview?.key === gridKey ? preview : null;
  const previewByIndex = new Map(current?.rows.map((row) => [row.index, row]));

  const read = readPaperGrid(grid, today);
  const totals = paperTotals(read.map((line) => line.row));
  const printedMinutes = parseHoursMinutes(printedTime);
  const landingsPrinted =
    printedLandings.trim() === "" ? null : Number(printedLandings);

  const setCell = (row: number, field: PaperField, value: string) =>
    setGrid((rows) =>
      rows.map((cells, i) =>
        i === row ? { ...cells, [field]: value } : cells,
      ),
    );

  // Rows copied from a spreadsheet or a scan's text: tab-separated cells,
  // one line per row, filled in from the cell pasted into
  const paste = (row: number, field: PaperField, text: string) => {
    const lines = text.replace(/\r/g, "").split("\n");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const start = PAPER_FIELDS.indexOf(field);
    setGrid((rows) => {
      const next = rows.map((cells) => ({ ...cells }));
      lines.forEach((line, offset) => {
        while (next.length <= row + offset) next.push(emptyPaperCells());
        line.split("\t").forEach((value, column) => {
          const target = PAPER_FIELDS[start + column];
          if (target) next[row + offset][target] = value.trim();
        });
      });
      return next;
    });
  };

  const focusCell = (row: number, field: PaperField) =>
    requestAnimationFrame(() =>
      document.getElementById(`paper-${row}-${field}`)?.focus(),
    );

  const onKeyDown = (
    event: React.KeyboardEvent,
    row: number,
    field: PaperField,
  ) => {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      if (row === grid.length - 1)
        setGrid((rows) => [...rows, emptyPaperCells()]);
      focusCell(row + 1, field);
    } else if (event.key === "ArrowUp" && row > 0) {
      event.preventDefault();
      focusCell(row - 1, field);
    }
  };

  const defaultAction = (row: PaperPreviewRow): Action => {
    const match = row.match;
    if (!match || match.kind === "new") return "new";
    if (isBilledStatus(match.flight.status)) return "skip";
    return match.kind === "same" ? "confirm" : "correct";
  };

  const check = () => {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await previewPaperPage({
        registration,
        logPage: logPage || null,
        grid,
      }).catch(() => ({
        status: "error" as const,
        error: "Tarkistus ei mennyt perille: yhteys katkesi tai sivu on vanhentunut. Yritä uudelleen.",
      }));
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      setPreview({ key: gridKey, ...result.result });
      setActions(
        new Map(
          result.result.rows.map((row) => [row.index, defaultAction(row)]),
        ),
      );
    });
  };

  const save = () => {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await savePaperPage({
        registration,
        logPage: logPage || null,
        grid,
        decisions: current.rows.map((row) => {
          const match =
            row.match && row.match.kind !== "new" ? row.match.flight : null;
          return {
            index: row.index,
            action: actions.get(row.index) ?? "skip",
            id: match?.id ?? null,
            inputHash: match?.inputHash ?? null,
          };
        }),
      }).catch(() => ({
        status: "error" as const,
        error: "Tallennus ei mennyt perille: yhteys katkesi tai sivu on vanhentunut.",
      }));
      if (result.status === "error") {
        // Part of the page may have reached the sheet. Checking the page again
        // shows those lines as already there, so saving can't add them twice.
        setError(
          result.error.includes("Tarkista sivu uudelleen")
            ? result.error
            : `${result.error} Tarkista sivu uudelleen ennen kuin tallennat.`,
        );
        setPreview(null);
        return;
      }
      const { added, confirmed, corrected } = result.result;
      setSaved(
        `${logPage ? `Sivu ${logPage}` : "Sivu"} tallennettu: ${added} uutta, ${confirmed} vahvistettu, ${corrected} korjattu.`,
      );
      setGrid(blankGrid());
      setPreview(null);
      setPrintedTime("");
      setPrintedLandings("");
      if (/^\d+$/.test(logPage)) setLogPage(String(Number(logPage) + 1));
    });
  };

  const rowsWithErrors =
    current?.rows.filter((row) => row.errors.length > 0).length ?? 0;

  return (
    <div className="space-y-6 text-gray-900">
      <datalist id="paper-pilots">
        {pilotNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="paper-airfields">
        {airfields.map((field) => (
          <option key={field} value={field} />
        ))}
      </datalist>
      <datalist id="paper-purposes">
        {purposes.map((purpose) => (
          <option key={purpose.code} value={purpose.code}>
            {purpose.name}
          </option>
        ))}
      </datalist>

      <div className="bg-white rounded-lg shadow p-6 flex flex-wrap items-end gap-6">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1">
            Kone
          </legend>
          <div className="flex gap-2">
            {aircraft.map((reg) => (
              <button
                key={reg}
                type="button"
                aria-pressed={reg === registration}
                onClick={() => setRegistration(reg)}
                className={`min-h-11 px-4 rounded-lg font-medium ${
                  reg === registration
                    ? "bg-sblue text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label
            htmlFor="paper-page"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Sivunumero
          </label>
          <input
            id="paper-page"
            value={logPage}
            onChange={(e) => setLogPage(e.target.value)}
            inputMode="numeric"
            className="w-28 min-h-11 rounded-lg border border-gray-300 px-3 text-base"
          />
        </div>
        <p className="text-sm text-gray-600 max-w-md">
          Kirjoita sivun rivit tai liitä ne taulukosta (sarkaimin erotettuina).
          Tyhjä päivä tai &quot; toistaa yllä olevan rivin. Enter siirtää alas.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-2 py-2 font-medium">
                  #
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.field}
                    scope="col"
                    className="px-1 py-2 font-medium"
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 font-medium text-right">
                  Ilmassa
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Tarkistus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grid.map((cells, row) => {
                const result = previewByIndex.get(row);
                const minutes = minutesBetween(cells.takeoff, cells.landing);
                const details = result && needsDetails(result);
                return (
                  <Fragment key={row}>
                    <tr
                      className={
                        result?.errors.length ? "bg-red-50" : undefined
                      }
                    >
                      <td className="px-2 py-1 text-gray-500 tabular-nums">
                        {row + 1}
                      </td>
                      {COLUMNS.map((column) => (
                        <td key={column.field} className="px-1 py-1">
                          <input
                            id={`paper-${row}-${column.field}`}
                            aria-label={`Rivi ${row + 1}: ${column.label}`}
                            value={cells[column.field]}
                            list={lists[column.field]}
                            inputMode={column.mode}
                            onChange={(e) =>
                              setCell(row, column.field, e.target.value)
                            }
                            onKeyDown={(e) => onKeyDown(e, row, column.field)}
                            onPaste={(e) => {
                              const text = e.clipboardData.getData("text");
                              if (/[\t\n]/.test(text.trim())) {
                                e.preventDefault();
                                paste(row, column.field, text);
                              }
                            }}
                            className={`${column.width} rounded border border-gray-300 px-1.5 py-1 text-sm tabular-nums focus:border-sblue focus:outline-none focus:ring-1 focus:ring-sblue`}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right tabular-nums">
                        {minutes !== null ? formatMinutes(minutes) : ""}
                      </td>
                      <td className="px-2 py-1 text-xs whitespace-nowrap">
                        {result && <CheckChip result={result} />}
                      </td>
                    </tr>
                    {details && (
                      <tr
                        className={
                          result.errors.length ? "bg-red-50" : "bg-orange-50"
                        }
                      >
                        <td />
                        <td
                          colSpan={COLUMNS.length + 2}
                          className="px-2 pb-2 text-xs"
                        >
                          <RowDetails
                            result={result}
                            action={actions.get(row) ?? "skip"}
                            onAction={(action) =>
                              setActions((current) =>
                                new Map(current).set(row, action),
                              )
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={() =>
              setGrid((rows) => [
                ...rows,
                ...Array.from({ length: 5 }, emptyPaperCells),
              ])
            }
            className="min-h-11 px-4 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            + 5 riviä
          </button>
          <div className="flex flex-wrap items-end gap-4 text-sm">
            <p className="tabular-nums">
              <span className="text-gray-600">Sivulla </span>
              <strong>
                {read.filter((line) => line.row).length} lentoa
              </strong> · <strong>{formatMinutes(totals.minutes)}</strong> ·{" "}
              <strong>{totals.landings}</strong> laskua
            </p>
            <div>
              <label htmlFor="printed-time" className="block text-gray-700">
                Sivun summa paperilla
              </label>
              <input
                id="printed-time"
                value={printedTime}
                onChange={(e) => setPrintedTime(e.target.value)}
                placeholder="h:mm"
                inputMode="decimal"
                className="w-24 min-h-11 rounded-lg border border-gray-300 px-2"
              />
            </div>
            <div>
              <label htmlFor="printed-landings" className="block text-gray-700">
                Laskut paperilla
              </label>
              <input
                id="printed-landings"
                value={printedLandings}
                onChange={(e) => setPrintedLandings(e.target.value)}
                inputMode="numeric"
                className="w-20 min-h-11 rounded-lg border border-gray-300 px-2"
              />
            </div>
            {(printedMinutes !== null || landingsPrinted !== null) && (
              <p
                role="status"
                className={
                  (printedMinutes === null ||
                    printedMinutes === totals.minutes) &&
                  (landingsPrinted === null ||
                    landingsPrinted === totals.landings)
                    ? "text-green-800"
                    : "text-red-700"
                }
              >
                {printedMinutes !== null && printedMinutes !== totals.minutes
                  ? `Aika eroaa ${formatMinutes(Math.abs(totals.minutes - printedMinutes))}. `
                  : ""}
                {landingsPrinted !== null && landingsPrinted !== totals.landings
                  ? `Laskut eroavat ${Math.abs(totals.landings - landingsPrinted)}.`
                  : ""}
                {(printedMinutes === null ||
                  printedMinutes === totals.minutes) &&
                  (landingsPrinted === null ||
                    landingsPrinted === totals.landings) &&
                  "Täsmää paperin kanssa."}
              </p>
            )}
          </div>
        </div>
      </div>

      {current && current.notOnPage.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold">
            Taulukossa samoina päivinä, mutta ei tällä sivulla
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ne ovat seuraavalla sivulla, tai taulukossa on ylimääräinen rivi.
          </p>
          <ul className="mt-2 text-sm divide-y divide-gray-100">
            {current.notOnPage.map((flight) => (
              <li key={flight.id} className="py-1.5 tabular-nums">
                Rivi {flight.sheetRow}: {formatFullDate(flight.flightDate)}{" "}
                {flight.picName} {flight.departure}–{flight.arrival}{" "}
                {flight.takeoff}–{flight.landing} {flight.purposeCode}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-900"
          role="status"
        >
          {saved}{" "}
          <Link href="/admin/lennot" className="underline">
            Lennot
          </Link>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={check}
          disabled={isPending}
          className="min-h-11 px-5 rounded-lg border border-sblue text-sblue font-medium hover:bg-blue-50 disabled:opacity-60"
        >
          {isPending && !current ? "Tarkistetaan…" : "Tarkista sivu"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending || !current || rowsWithErrors > 0}
          className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-50"
        >
          {isPending && current ? "Tallennetaan…" : "Tallenna sivu taulukkoon"}
        </button>
        <p className="self-center text-sm text-gray-600">
          {!current
            ? "Tarkista sivu ennen tallennusta."
            : rowsWithErrors > 0
              ? `Korjaa ${rowsWithErrors} ${rowsWithErrors === 1 ? "rivi" : "riviä"} ensin.`
              : "Tallennus merkitsee sivun lennot tarkistetuiksi."}
        </p>
      </div>
    </div>
  );
};

// Errors, and differences from a flight already in the sheet, get a line of
// their own under the row
const needsDetails = (result: PaperPreviewRow) =>
  result.errors.length > 0 || result.match?.kind === "differs";

const CheckChip = ({ result }: { result: PaperPreviewRow }) => {
  const chip = (text: string, className: string, title?: string) => (
    <span title={title} className={`rounded-full px-2 py-0.5 font-medium ${className}`}>
      {text}
    </span>
  );
  const match = result.match;
  if (result.errors.length > 0) return chip("Virhe", "bg-red-100 text-red-900");
  if (!match || match.kind === "new") return chip("Uusi", "bg-green-100 text-green-900");
  const row = `rivi ${match.flight.sheetRow}`;
  const title = match.flight.source === "web" ? "Lentäjän itse kirjaama" : undefined;
  if (isBilledStatus(match.flight.status)) {
    return chip(`${match.flight.status}, ohitetaan`, "bg-purple-100 text-purple-900", title);
  }
  return match.kind === "same"
    ? chip(`Sama (${row})`, "bg-blue-100 text-blue-900", title)
    : chip(`Eroaa (${row})`, "bg-orange-100 text-orange-900", title);
};

const RowDetails = ({
  result,
  action,
  onAction,
}: {
  result: PaperPreviewRow;
  action: Action;
  onAction: (action: Action) => void;
}) => {
  if (result.errors.length > 0) {
    return <p className="text-red-800">{result.errors.join(" · ")}</p>;
  }
  const match = result.match;
  if (match?.kind !== "differs") return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-orange-900">
        Taulukossa → paperilla: {match.differences.join(" · ")}
      </span>
      {!isBilledStatus(match.flight.status) && (
        <select
          aria-label={`Rivi ${result.index + 1}: mitä tehdään`}
          value={action}
          onChange={(e) => onAction(e.target.value as Action)}
          className="rounded border border-gray-300 bg-white px-1 py-1 text-xs"
        >
          <option value="correct">Korjaa taulukkoon paperin mukaan</option>
          <option value="new">Eri lento: kirjaa uutena</option>
          <option value="skip">Ohita</option>
        </select>
      )}
    </div>
  );
};

export default PaperPageEntry;
