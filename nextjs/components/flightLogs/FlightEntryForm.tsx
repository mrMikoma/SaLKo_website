"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { logFlights, undoFlight } from "@/utilities/flightLogs";
import { minutesBetween, normalizeClock } from "@/utilities/flightFormInput";
import { formatMinutes } from "@/utilities/flightFormat";
import type { FlightFormOptions } from "@/utilities/flightLogData";

interface FlightEntryFormProps {
  options: FlightFormOptions;
  // Finnish dates from the server, so "Tänään" is right whatever the device zone
  today: string;
  yesterday: string;
}

interface Leg {
  key: number;
  departure: string;
  arrival: string;
  takeoff: string;
  landing: string;
  landings: number;
  personsOnBoard: number;
  purposeCode: string;
  fuel: string;
  oil: string;
  meter: string;
  remarks: string;
}

interface SavedLeg {
  id: string;
  label: string;
}

const HOME = "EFSA";
const inputClassName =
  "w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-sblue focus:ring-2 focus:ring-sblue/30 focus:outline-none";
const chipClassName = (selected: boolean) =>
  `min-h-11 px-4 rounded-lg border text-base font-medium transition-colors ${
    selected
      ? "bg-sblue border-sblue text-white"
      : "bg-white border-gray-300 text-gray-800 hover:border-sblue"
  }`;

const nowInFinland = () => DateTime.now().setZone("Europe/Helsinki").toFormat("HH:mm");

/** A decimal typed with a comma or a dot; null when empty, NaN when not a number */
const decimal = (value: string): number | null =>
  value.trim() === "" ? null : Number(value.trim().replace(",", "."));

const FlightEntryForm = ({ options, today, yesterday }: FlightEntryFormProps) => {
  const defaultPurpose = options.lastPurpose ?? options.purposes[0]?.code ?? "HAR";
  // Keys go into element ids: the first leg is 0 (the same on the server), and
  // each new one is one more than the largest in the list
  const newLeg = (previous: Leg | undefined, key: number): Leg => ({
    key,
    departure: previous?.arrival ?? HOME,
    arrival: HOME,
    takeoff: "",
    landing: "",
    landings: 1,
    personsOnBoard: previous?.personsOnBoard ?? 1,
    purposeCode: previous?.purposeCode ?? defaultPurpose,
    fuel: "",
    oil: "",
    meter: "",
    remarks: "",
  });

  const [registration, setRegistration] = useState(
    options.lastAircraft ?? options.aircraft[0]?.registration ?? ""
  );
  const [flightDate, setFlightDate] = useState(today);
  const [role, setRole] = useState<"pic" | "student">("pic");
  const [otherPilot, setOtherPilot] = useState("");
  const [legs, setLegs] = useState<Leg[]>(() => [newLeg(undefined, 0)]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ legs: SavedLeg[]; sheetName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Bring the confirmation into view after saving: the save button is at the
  // bottom of a long form, so on a phone it would otherwise be off-screen
  const savedRef = useRef<HTMLDivElement>(null);
  const isSaved = saved !== null;
  useEffect(() => {
    if (isSaved) {
      savedRef.current?.scrollIntoView({ block: "start" });
      savedRef.current?.focus();
    }
  }, [isSaved]);

  const updateLeg = (key: number, changes: Partial<Leg>) =>
    setLegs((current) => current.map((leg) => (leg.key === key ? { ...leg, ...changes } : leg)));

  const rate = options.aircraft.find((a) => a.registration === registration)?.minuteRate ?? null;
  const billedCodes = new Set(options.purposes.filter((p) => p.billed).map((p) => p.code));
  const legMinutes = legs.map((leg) => minutesBetween(leg.takeoff, leg.landing));
  const totalMinutes = legMinutes.reduce<number>((sum, m) => sum + (m ?? 0), 0);
  const billedMinutes = legs.reduce(
    (sum, leg, i) => sum + (billedCodes.has(leg.purposeCode) ? legMinutes[i] ?? 0 : 0),
    0
  );

  const submit = () => {
    setError(null);
    for (const leg of legs) {
      if (!normalizeClock(leg.takeoff) || !normalizeClock(leg.landing)) {
        setError("Anna jokaisen lennon lentoonlähtö- ja laskuaika, esim. 14.05");
        return;
      }
      if ([leg.fuel, leg.oil, leg.meter].some((v) => Number.isNaN(decimal(v)))) {
        setError("Tarkista tankkaus-, öljy- ja tuntimittarikentät: vain numeroita");
        return;
      }
    }

    startTransition(async () => {
      const result = await logFlights({
        registration,
        flightDate,
        role,
        otherPilot: otherPilot.trim() || null,
        legs: legs.map((leg) => ({
          departure: leg.departure,
          arrival: leg.arrival,
          takeoff: leg.takeoff,
          landing: leg.landing,
          landings: leg.landings,
          personsOnBoard: leg.personsOnBoard,
          purposeCode: leg.purposeCode,
          fuelLitres: decimal(leg.fuel),
          oilLitres: decimal(leg.oil),
          hourMeter: decimal(leg.meter),
          remarks: leg.remarks.trim() || null,
        })),
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      setSaved({
        sheetName: result.result.sheetName,
        legs: result.result.ids.map((id, i) => ({
          id,
          label: `${legs[i].departure}–${legs[i].arrival} ${normalizeClock(legs[i].takeoff)}–${normalizeClock(legs[i].landing)} ${legs[i].purposeCode}`,
        })),
      });
    });
  };

  const undoLast = () => {
    if (!saved) return;
    const last = saved.legs[saved.legs.length - 1];
    setError(null);
    startTransition(async () => {
      const result = await undoFlight(last.id);
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      const remaining = saved.legs.slice(0, -1);
      setSaved(remaining.length > 0 ? { ...saved, legs: remaining } : null);
      if (remaining.length === 0) setLegs([newLeg(undefined, 0)]);
    });
  };

  if (saved) {
    return (
      <div
        ref={savedRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 space-y-5 text-gray-900 scroll-mt-24 focus:outline-none"
      >
        <div role="status">
          <h2 className="text-xl font-bold">Tallennettu lentopäiväkirjaan</h2>
          <p className="text-gray-700 mt-1">
            {saved.legs.length === 1 ? "1 lento" : `${saved.legs.length} lentoa`},{" "}
            {registration}, {DateTime.fromISO(flightDate).toFormat("d.M.yyyy")}. Nimesi
            taulukossa: <strong>{saved.sheetName}</strong>.
          </p>
        </div>
        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {saved.legs.map((leg) => (
            <li key={leg.id} className="py-2 tabular-nums">
              {leg.label}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-600">
          Laskuttaja tarkistaa lennot paperisesta matkapäiväkirjasta. Jos huomaat
          virheen myöhemmin, kerro siitä laskuttajalle.
        </p>
        {error && (
          <p className="text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setLegs([newLeg(legs[legs.length - 1], 0)]);
            }}
            className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
          >
            Kirjaa lisää lentoja
          </button>
          <button
            type="button"
            onClick={undoLast}
            disabled={isPending}
            className="min-h-11 px-5 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? "Kumotaan…" : "Kumoa viimeisin"}
          </button>
          <Link
            href="/jasenalue/lentopaivakirja"
            className="min-h-11 px-5 rounded-lg inline-flex items-center justify-center text-sblue font-medium hover:underline"
          >
            Omat lennot
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="bg-white rounded-xl shadow-lg text-gray-900"
    >
      <div className="p-4 sm:p-6 space-y-6">
        <datalist id="airfields">
          {options.airfields.map((field) => (
            <option key={field} value={field} />
          ))}
        </datalist>
        <datalist id="pilot-names">
          {options.pilotNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-2">Kone</legend>
          <div className="flex flex-wrap gap-2">
            {options.aircraft.map((a) => (
              <button
                key={a.registration}
                type="button"
                aria-pressed={registration === a.registration}
                onClick={() => setRegistration(a.registration)}
                className={chipClassName(registration === a.registration)}
              >
                {a.registration}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-gray-700 mb-2">Päivä</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={flightDate === today}
              onClick={() => setFlightDate(today)}
              className={chipClassName(flightDate === today)}
            >
              Tänään
            </button>
            <button
              type="button"
              aria-pressed={flightDate === yesterday}
              onClick={() => setFlightDate(yesterday)}
              className={chipClassName(flightDate === yesterday)}
            >
              Eilen
            </button>
            <label className="sr-only" htmlFor="flight-date">
              Lentopäivä
            </label>
            <input
              id="flight-date"
              type="date"
              value={flightDate}
              max={today}
              onChange={(e) => e.target.value && setFlightDate(e.target.value)}
              className={`${inputClassName} w-auto`}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-700 mb-2">Lensin</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={role === "pic"}
              onClick={() => setRole("pic")}
              className={chipClassName(role === "pic")}
            >
              Päällikkönä
            </button>
            <button
              type="button"
              aria-pressed={role === "student"}
              onClick={() => setRole("student")}
              className={chipClassName(role === "student")}
            >
              Oppilaana
            </button>
          </div>
          <div>
            <label htmlFor="other-pilot" className="block text-sm text-gray-700 mb-1">
              {role === "pic" ? "Oppilas tai toinen ohjaaja (valinnainen)" : "Päällikkö (opettaja)"}
            </label>
            <input
              id="other-pilot"
              list="pilot-names"
              value={otherPilot}
              onChange={(e) => setOtherPilot(e.target.value)}
              placeholder="esim. M.Meikäläinen"
              autoComplete="off"
              className={inputClassName}
            />
          </div>
          <p className="text-sm text-gray-600">
            Nimesi taulukossa:{" "}
            <strong>{options.sheetName ?? "muodostetaan nimestäsi (esim. M.Meikäläinen)"}</strong>
          </p>
        </fieldset>

        {legs.map((leg, index) => {
          const id = (field: string) => `leg-${leg.key}-${field}`;
          const minutes = legMinutes[index];
          const badTime = (value: string) => value.trim() !== "" && !normalizeClock(value);
          return (
            <fieldset
              key={leg.key}
              aria-labelledby={id("title")}
              className="rounded-xl border border-gray-200 p-3 sm:p-4 space-y-4"
            >
              {/* A heading rather than a legend: a legend has to be the
                  fieldset's first child, which would leave no room for Poista */}
              <div className="flex items-center justify-between">
                <h2 id={id("title")} className="text-lg font-semibold">
                  {legs.length > 1 ? `Lento ${index + 1}` : "Lento"}
                </h2>
                {legs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLegs((current) => current.filter((l) => l.key !== leg.key))}
                    className="min-h-11 px-2 text-sm text-red-700 hover:underline"
                    aria-label={`Poista lento ${index + 1}`}
                  >
                    Poista
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={id("dep")} className="block text-sm text-gray-700 mb-1">
                    Mistä
                  </label>
                  <input
                    id={id("dep")}
                    list="airfields"
                    value={leg.departure}
                    onChange={(e) => updateLeg(leg.key, { departure: e.target.value.toUpperCase() })}
                    className={`${inputClassName} uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor={id("arr")} className="block text-sm text-gray-700 mb-1">
                    Minne
                  </label>
                  <input
                    id={id("arr")}
                    list="airfields"
                    value={leg.arrival}
                    onChange={(e) => updateLeg(leg.key, { arrival: e.target.value.toUpperCase() })}
                    className={`${inputClassName} uppercase`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["takeoff", "Lentoonlähtö"],
                    ["landing", "Lasku"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={id(field)} className="block text-sm text-gray-700 mb-1">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        id={id(field)}
                        inputMode="decimal"
                        placeholder="14.05"
                        value={leg[field]}
                        onChange={(e) => updateLeg(leg.key, { [field]: e.target.value })}
                        aria-invalid={badTime(leg[field])}
                        className={`${inputClassName} pr-14 tabular-nums ${
                          badTime(leg[field]) ? "border-red-500" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => updateLeg(leg.key, { [field]: nowInFinland() })}
                        className="absolute inset-y-1 right-1 px-2.5 rounded-md bg-gray-100 text-sm font-medium text-gray-800 hover:bg-gray-200"
                        aria-label={`${label}: nyt`}
                      >
                        Nyt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 tabular-nums" aria-live="polite">
                {minutes !== null ? `Ilmassa ${formatMinutes(minutes)}` : "Ilmassa –"}
              </p>

              <div className="flex flex-wrap gap-6">
                <div>
                  <span id={id("landings-label")} className="block text-sm text-gray-700 mb-1">
                    Laskuja
                  </span>
                  <div className="flex items-center gap-2" role="group" aria-labelledby={id("landings-label")}>
                    <button
                      type="button"
                      onClick={() => updateLeg(leg.key, { landings: Math.max(0, leg.landings - 1) })}
                      className="min-h-11 min-w-11 rounded-lg border border-gray-300 text-xl"
                      aria-label="Vähemmän laskuja"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-semibold tabular-nums">{leg.landings}</span>
                    <button
                      type="button"
                      onClick={() => updateLeg(leg.key, { landings: Math.min(99, leg.landings + 1) })}
                      className="min-h-11 min-w-11 rounded-lg border border-gray-300 text-xl"
                      aria-label="Enemmän laskuja"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <span id={id("persons-label")} className="block text-sm text-gray-700 mb-1">
                    Henkilöitä koneessa
                  </span>
                  <div className="flex gap-2" role="group" aria-labelledby={id("persons-label")}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={leg.personsOnBoard === n}
                        onClick={() => updateLeg(leg.key, { personsOnBoard: n })}
                        className={`${chipClassName(leg.personsOnBoard === n)} min-w-11 px-0`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span id={id("purpose-label")} className="block text-sm text-gray-700 mb-1">
                  Lennon tarkoitus
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id("purpose-label")}>
                  {options.purposes.map((purpose) => (
                    <button
                      key={purpose.code}
                      type="button"
                      title={purpose.name}
                      aria-pressed={leg.purposeCode === purpose.code}
                      onClick={() => updateLeg(leg.key, { purposeCode: purpose.code })}
                      className={chipClassName(leg.purposeCode === purpose.code)}
                    >
                      {purpose.code}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {options.purposes.find((p) => p.code === leg.purposeCode)?.name}
                </p>
              </div>

              <details className="rounded-lg bg-gray-50 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 min-h-8 flex items-center">
                  Tuntimittari, tankkaus, öljy, huomiot
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {(
                    [
                      ["meter", "Tuntimittari", "5949.4"],
                      ["fuel", "Tankkaus (l)", "60"],
                      ["oil", "Öljy (l)", "1"],
                    ] as const
                  ).map(([field, label, placeholder]) => (
                    <div key={field}>
                      <label htmlFor={id(field)} className="block text-sm text-gray-700 mb-1">
                        {label}
                      </label>
                      <input
                        id={id(field)}
                        inputMode="decimal"
                        placeholder={placeholder}
                        value={leg[field]}
                        onChange={(e) => updateLeg(leg.key, { [field]: e.target.value })}
                        className={`${inputClassName} tabular-nums`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label htmlFor={id("remarks")} className="block text-sm text-gray-700 mb-1">
                    Huomiot
                  </label>
                  <textarea
                    id={id("remarks")}
                    rows={2}
                    value={leg.remarks}
                    onChange={(e) => updateLeg(leg.key, { remarks: e.target.value })}
                    className={inputClassName}
                  />
                </div>
              </details>
            </fieldset>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setLegs((current) => [
              ...current,
              newLeg(current[current.length - 1], Math.max(...current.map((l) => l.key)) + 1),
            ])
          }
          className="w-full min-h-11 rounded-lg border-2 border-dashed border-gray-300 text-gray-700 font-medium hover:border-sblue hover:text-sblue"
        >
          + Seuraava lento samana päivänä
        </button>

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-b-xl border-t border-gray-200 bg-white/95 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur">
        <p className="tabular-nums">
          <span className="font-semibold">{formatMinutes(totalMinutes)}</span>
          {rate !== null && billedMinutes > 0 && (
            <span className="text-gray-600">
              {" "}
              · arvio {(billedMinutes * rate).toLocaleString("fi-FI", { style: "currency", currency: "EUR" })}
            </span>
          )}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 shrink-0 whitespace-nowrap px-4 sm:px-6 rounded-lg bg-sred text-white font-semibold hover:bg-sred/90 disabled:opacity-60"
        >
          {isPending ? "Tallennetaan…" : legs.length > 1 ? `Tallenna ${legs.length} lentoa` : "Tallenna lento"}
        </button>
      </div>
    </form>
  );
};

export default FlightEntryForm;
