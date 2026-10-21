"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runFlightSync } from "@/utilities/flightLogs";

interface SyncStatusProps {
  // Preformatted on the server, so the times are in Finnish time
  lastSuccessLabel: string | null;
  latestError: string | null;
  rowsRead: number | null;
  issues: number | null;
  sheetKind: "google" | "fixture" | null;
}

/**
 * When the copy was last synced from the sheet, and a button to sync now
 */
const SyncStatus = ({
  lastSuccessLabel,
  latestError,
  rowsRead,
  issues,
  sheetKind,
}: SyncStatusProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const sync = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await runFlightSync();
      if (result.status === "success") {
        const { rowsChanged, idsAssigned } = result.result;
        setMessage({
          ok: true,
          text: `Synkronoitu: ${rowsChanged} muuttunutta riviä${
            idsAssigned > 0 ? `, ${idsAssigned} uutta ID:tä taulukkoon` : ""
          }`,
        });
      } else {
        setMessage({ ok: false, text: result.error });
      }
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">Taulukosta synkronoitu</p>
        <p className="text-lg font-semibold text-gray-900">
          {lastSuccessLabel ?? "Ei vielä synkronoitu"}
        </p>
        {lastSuccessLabel && (
          <p className="text-sm text-gray-600">
            {rowsRead ?? 0} lentoa · {issues ?? 0} tarkistettavaa
            {sheetKind === "fixture" && " · testiaineisto, ei oikea taulukko"}
          </p>
        )}
        {latestError && (
          <p className="text-sm text-red-700" role="alert">
            Viimeisin synkronointi epäonnistui: {latestError}
          </p>
        )}
        {message && (
          <p
            className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}
            role="status"
          >
            {message.text}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={sync}
        disabled={isPending}
        className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60"
      >
        {isPending ? "Synkronoidaan…" : "Synkronoi nyt"}
      </button>
    </div>
  );
};

export default SyncStatus;
