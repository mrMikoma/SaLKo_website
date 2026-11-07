"use client";

import { useEffect, useState } from "react";
import { OUTDATED_EVENT } from "@/utilities/callAction";

/**
 * Shown when a save or a fetch failed because the site was updated after the
 * page was opened (callAction() sends the event). Saving can't work again
 * until the page is reloaded, and reloading empties the forms, so it says so.
 */
export default function OutdatedNotice() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const show = () => setShown(true);
    window.addEventListener(OUTDATED_EVENT, show);
    return () => window.removeEventListener(OUTDATED_EVENT, show);
  }, []);

  if (!shown) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4 print:hidden font-finlandica"
    >
      <div className="max-w-3xl mx-auto rounded-xl bg-sblued text-swhite border-2 border-sred/60 shadow-2xl p-4 sm:flex sm:items-center sm:gap-4 space-y-3 sm:space-y-0">
        <p className="flex-1 text-sm sm:text-base">
          <strong>Sivusto on päivittynyt.</strong> Tallennus ei onnistu ennen kuin lataat sivun
          uudelleen. Kopioi pitkät tekstit talteen ennen lataamista.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 px-5 rounded-lg bg-sred-dark text-swhite font-semibold hover:bg-sred-dark/90"
          >
            Lataa sivu uudelleen
          </button>
          <button
            type="button"
            onClick={() => setShown(false)}
            className="min-h-11 px-4 rounded-lg border border-swhite/40 text-swhite hover:bg-swhite/10"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}
