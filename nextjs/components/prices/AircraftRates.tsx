"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAircraftRate, saveAircraftRate } from "@/utilities/priceListActions";
import type { AircraftRateRow } from "@/utilities/priceList";
import { perMinuteText } from "@/utilities/billing";

/**
 * Aircraft prices per hour from a date (aircraft_rates), on /admin/hinnasto.
 * Billing bills each flight at the price of its date; the public price page
 * shows today's.
 */

const inputClassName =
  "min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sblue focus:outline-none focus:ring-2 focus:ring-sblue/30";
const buttonClassName =
  "min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60";
const centsToEuros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

type Result = { status: "success" } | { status: "error"; error: string };

// Runs an action, shows its error, and refreshes the page when it succeeds
function useSave() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = (action: () => Promise<Result>, onSuccess?: () => void, onError?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setError(result.error);
        onError?.();
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };
  const errorText = error && (
    <p className="text-red-700 text-sm" role="alert">
      {error}
    </p>
  );
  return { save, isPending, errorText };
}

const AircraftRates = ({ aircraft, rates }: { aircraft: string[]; rates: AircraftRateRow[] }) => {
  const { save, isPending, errorText } = useSave();
  // A new price starts from the aircraft's latest one
  const startingFrom = (registration: string) => {
    const latest = rates.filter((r) => r.registration === registration).at(-1);
    return {
      registration,
      validFrom: "",
      withFee: latest ? centsToEuros(latest.centsPerHourWithFee) : "",
      withoutFee: latest ? centsToEuros(latest.centsPerHourWithoutFee) : "",
      minimumLocalMinutes: latest?.minimumLocalMinutes ?? 30,
    };
  };
  const blank = startingFrom(aircraft[0] ?? "");
  const [rate, setRate] = useState(blank);

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600">
          <tr>
            <th scope="col" className="py-1 pr-4 font-medium">Kone</th>
            <th scope="col" className="py-1 pr-4 font-medium">Alkaen</th>
            <th scope="col" className="py-1 pr-4 font-medium text-right">Kalustomaksun maksaneet</th>
            <th scope="col" className="py-1 pr-4 font-medium text-right">Muut</th>
            <th scope="col" className="py-1 pr-4 font-medium text-right">Minimi paikallislennolle</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rates.map((r) => (
            <tr key={`${r.registration}-${r.validFrom}`}>
              <td className="py-2 pr-4">{r.registration}</td>
              <td className="py-2 pr-4 tabular-nums">{r.validFrom}</td>
              {[r.centsPerHourWithFee, r.centsPerHourWithoutFee].map((cents, i) => (
                <td key={i} className="py-2 pr-4 text-right tabular-nums">
                  {centsToEuros(cents)} €/h
                  <span className="block text-xs text-gray-500">{perMinuteText(cents)}</span>
                </td>
              ))}
              <td className="py-2 pr-4 text-right tabular-nums">
                {r.minimumLocalMinutes > 0 ? `${r.minimumLocalMinutes} min` : "ei"}
              </td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => save(() => deleteAircraftRate(r.registration, r.validFrom))}
                  className="text-red-700 hover:underline disabled:opacity-50"
                  aria-label={`Poista hinta ${r.registration} ${r.validFrom}`}
                >
                  Poista
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(() => saveAircraftRate(rate), () => setRate(blank));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor="rate-aircraft" className="block text-sm text-gray-700 mb-1">Kone</label>
          <select
            id="rate-aircraft"
            value={rate.registration}
            onChange={(e) => setRate(startingFrom(e.target.value))}
            className={inputClassName}
          >
            {aircraft.map((reg) => (
              <option key={reg}>{reg}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rate-from" className="block text-sm text-gray-700 mb-1">Voimassa alkaen</label>
          <input
            id="rate-from"
            type="date"
            required
            value={rate.validFrom}
            onChange={(e) => setRate({ ...rate, validFrom: e.target.value })}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="rate-with" className="block text-sm text-gray-700 mb-1">Kalustomaksulla €/h</label>
          <input
            id="rate-with"
            inputMode="decimal"
            value={rate.withFee}
            onChange={(e) => setRate({ ...rate, withFee: e.target.value })}
            className={`${inputClassName} w-28`}
          />
        </div>
        <div>
          <label htmlFor="rate-without" className="block text-sm text-gray-700 mb-1">Muut €/h</label>
          <input
            id="rate-without"
            inputMode="decimal"
            value={rate.withoutFee}
            onChange={(e) => setRate({ ...rate, withoutFee: e.target.value })}
            className={`${inputClassName} w-28`}
          />
        </div>
        <div>
          <label htmlFor="rate-minimum" className="block text-sm text-gray-700 mb-1">Minimi, min</label>
          <input
            id="rate-minimum"
            type="number"
            min={0}
            max={120}
            value={rate.minimumLocalMinutes}
            onChange={(e) => setRate({ ...rate, minimumLocalMinutes: Number(e.target.value) })}
            className={`${inputClassName} w-24`}
          />
        </div>
        <button type="submit" disabled={isPending} className={buttonClassName}>
          Lisää hinta
        </button>
      </form>
      {errorText}
    </div>
  );
};

export default AircraftRates;
