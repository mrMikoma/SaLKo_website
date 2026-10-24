"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePilotAlias, setPilotAlias } from "@/utilities/flightLogs";

interface PilotMatchingProps {
  unmatched: { name: string; nameKey: string; flights: number; lastFlightLabel: string }[];
  // userName null: marked as no member
  matched: { name: string; nameKey: string; userName: string | null }[];
  members: { id: string; name: string; email: string }[];
}

// The select's value for "no member"
const NON_MEMBER = "ei-jasen";

/**
 * Matches the pilot names written in the sheet ("M.Meikäläinen") to member
 * accounts, so members see their flights and get their bills. A name that
 * belongs to no member (a guest pilot, a former member) is marked as such:
 * their flights are billed under the name at the non-member price, and the
 * name leaves this list.
 */
const PilotMatching = ({ unmatched, matched, members }: PilotMatchingProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ status: string; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => ({
        status: "error",
        error: "Tallennus ei mennyt perille. Päivitä sivu ja yritä uudelleen.",
      }));
      if (result.status === "error") {
        setError(result.error ?? "Tallennus epäonnistui");
      }
      router.refresh();
    });
  };
  const save = (name: string, choice: string) =>
    run(() => setPilotAlias(name, choice === NON_MEMBER ? null : choice));
  const remove = (name: string, what: string) => {
    if (!window.confirm(`Poistetaanko ${what}? Nimen lentoja ei laskuteta ennen kuin se yhdistetään uudelleen.`)) {
      return;
    }
    run(() => removePilotAlias(name));
  };
  const matchedMembers = matched.filter((pilot) => pilot.userName !== null);
  const nonMembers = matched.filter((pilot) => pilot.userName === null);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Lentäjien nimet</h2>
        <p className="text-sm text-gray-600 mt-1">
          Yhdistä taulukon nimi jäseneen, niin jäsen näkee lentonsa ja laskunsa.
          Kirjoitusasu ei haittaa: &quot;M. Meikäläinen&quot; ja &quot;M.Meikäläinen&quot; ovat sama nimi.
          Jos nimi ei ole kenenkään jäsenen, valitse &quot;Ei jäsen&quot;: lennot laskutetaan
          nimellä ei-jäsenen hinnalla. Jos kaksi jäsentä kirjoittaa nimensä samoin, pyydä
          heitä kirjoittamaan taulukkoon eri nimet ja yhdistä kumpikin.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {unmatched.length === 0 ? (
        <p className="text-sm text-gray-600">Kaikki nimet on käsitelty.</p>
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
                      {member.name} ({member.email})
                    </option>
                  ))}
                  <option value={NON_MEMBER}>Ei jäsen (ulkopuolinen lentäjä)</option>
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

      {matchedMembers.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Yhdistetyt nimet ({matchedMembers.length})
          </summary>
          <ul className="mt-3 divide-y divide-gray-200">
            {matchedMembers.map((pilot) => (
              <li key={pilot.nameKey} className="py-2 flex items-center justify-between gap-3">
                <span className="text-gray-900">
                  {pilot.name} → {pilot.userName}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(pilot.name, `nimen ${pilot.name} yhdistys jäseneen ${pilot.userName}`)}
                  className="text-red-700 hover:underline disabled:opacity-50"
                >
                  Poista yhdistys
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {nonMembers.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Ei jäseniä ({nonMembers.length})
          </summary>
          <ul className="mt-3 divide-y divide-gray-200">
            {nonMembers.map((pilot) => (
              <li key={pilot.nameKey} className="py-2 flex items-center justify-between gap-3">
                <span className="text-gray-900">{pilot.name}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(pilot.name, `nimen ${pilot.name} merkintä ei-jäseneksi`)}
                  className="text-red-700 hover:underline disabled:opacity-50"
                >
                  Poista merkintä
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
