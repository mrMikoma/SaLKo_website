"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPilotAlias } from "@/utilities/flightLogs";

interface PilotMatchingProps {
  unmatched: { name: string; nameKey: string; flights: number; lastFlightLabel: string }[];
  matched: { name: string; nameKey: string; userName: string }[];
  members: { id: string; name: string }[];
}

/**
 * Matches the pilot names written in the sheet ("T.Kuutti") to member
 * accounts, so members see their flights and get their bills
 */
const PilotMatching = ({ unmatched, matched, members }: PilotMatchingProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const save = (name: string, userId: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await setPilotAlias(name, userId);
      if (result.status === "error") {
        setError(result.error);
      }
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Lentäjien nimet</h2>
        <p className="text-sm text-gray-600 mt-1">
          Yhdistä taulukon nimi jäseneen, niin jäsen näkee lentonsa ja laskunsa.
          Kirjoitusasu ei haittaa: &quot;T. Kuutti&quot; ja &quot;T.Kuutti&quot; ovat sama nimi.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {unmatched.length === 0 ? (
        <p className="text-sm text-gray-600">Kaikki nimet on yhdistetty jäseniin.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {unmatched.map((pilot) => {
            const selectId = `pilot-${pilot.nameKey}`;
            return (
              <li
                key={pilot.nameKey}
                className="py-3 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="md:w-1/3">
                  <label htmlFor={selectId} className="font-medium text-gray-900">
                    {pilot.name}
                  </label>
                  <p className="text-xs text-gray-500">
                    {pilot.flights} lentoa, viimeksi {pilot.lastFlightLabel}
                  </p>
                </div>
                <select
                  id={selectId}
                  value={selected[pilot.nameKey] ?? ""}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [pilot.nameKey]: e.target.value }))
                  }
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 bg-white"
                >
                  <option value="">Valitse jäsen…</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isPending || !selected[pilot.nameKey]}
                  onClick={() => save(pilot.name, selected[pilot.nameKey])}
                  className="min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-50"
                >
                  Yhdistä
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {matched.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Yhdistetyt nimet ({matched.length})
          </summary>
          <ul className="mt-3 divide-y divide-gray-200">
            {matched.map((pilot) => (
              <li key={pilot.nameKey} className="py-2 flex items-center justify-between gap-3">
                <span className="text-gray-900">
                  {pilot.name} → {pilot.userName}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => save(pilot.name, null)}
                  className="text-red-700 hover:underline disabled:opacity-50"
                >
                  Poista yhdistys
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default PilotMatching;
