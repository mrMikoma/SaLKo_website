"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteYearTotal, saveYearTotals } from "@/utilities/statsActions";

const EXAMPLE = "Vuosi\tOH-CON\tOH-SEE\n2003\t98:00\t164:00\n2002\t102:00\t279:00";

/** Pasting yearly hours from before the flight log */
export const YearTotalsForm = () => {
  const router = useRouter();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveYearTotals(text);
      if (result.status === "error") {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({ ok: true, text: `Tallennettu ${result.result.saved} vuoden tunnit.` });
      setText("");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-2"
    >
      <label htmlFor="year-totals" className="block text-sm text-gray-700">
        Aiemmat vuodet: liitä taulukko, jossa otsikkorivillä tunnukset ja sitten vuosi ja
        tunnit riveittäin (esim. Google-taulukon vuositilastosta)
      </label>
      <textarea
        id="year-totals"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={EXAMPLE}
        className="w-full rounded-lg border border-gray-300 p-2 font-mono text-sm text-gray-900"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || text.trim() === ""}
          className="min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-50"
        >
          {isPending ? "Tallennetaan…" : "Tallenna vuodet"}
        </button>
        {message && (
          <p className={message.ok ? "text-green-800" : "text-red-700"} role={message.ok ? "status" : "alert"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
};

export const DeleteYearTotal = ({ registration, year }: { registration: string; year: number }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteYearTotal(registration, year);
          router.refresh();
        })
      }
      className="text-xs text-red-700 hover:underline disabled:opacity-50"
      aria-label={`Poista ${registration} ${year}`}
    >
      poista
    </button>
  );
};
