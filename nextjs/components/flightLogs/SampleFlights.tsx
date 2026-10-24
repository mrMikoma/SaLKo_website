"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSampleFlights } from "@/utilities/flightLogs";

/**
 * Development only: fills an aircraft's tab with made-up flights, so the
 * flight log, billing and statistics have something to show
 */
const SampleFlights = ({ aircraft }: { aircraft: string[] }) => {
  const router = useRouter();
  const [registration, setRegistration] = useState(aircraft[0] ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const add = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await addSampleFlights(registration);
      setMessage(
        result.status === "success"
          ? { ok: true, text: `Lisätty ${result.result.added} esimerkkilentoa koneelle ${registration}.` }
          : { ok: false, text: result.error }
      );
      router.refresh();
    });
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-3">
      <h2 className="text-xl font-semibold text-gray-900">Esimerkkilennot (kehitys)</h2>
      <p className="text-sm text-gray-700">
        Kirjoittaa koneen taulukkoon noin vuoden verran keksittyjä lentoja
        keksityillä nimillä (M.Meikäläinen, K.Opettaja…), jotta lennoissa,
        laskutuksessa ja tilastoissa on jotain näytettävää. Vain koneelle, jonka
        taulukossa ei vielä ole tämän vuoden lentoja. Ei käytössä tuotannossa.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-gray-700">
          Kone
          <select
            value={registration}
            onChange={(event) => setRegistration(event.target.value)}
            disabled={isPending}
            className="mt-1 block min-h-11 rounded-lg border border-gray-300 bg-white px-3"
          >
            {aircraft.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={isPending || !registration}
          className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60"
        >
          {isPending ? "Lisätään…" : "Lisää esimerkkilennot"}
        </button>
      </div>
      {message && (
        <p
          className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
};

export default SampleFlights;
