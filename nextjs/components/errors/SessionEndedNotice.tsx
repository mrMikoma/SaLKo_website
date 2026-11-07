"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SESSION_ENDED_EVENT } from "@/utilities/callAction";

/**
 * Shown when a save was refused because the session had ended (callAction()
 * sends the event). Logging in happens in a new tab, so what was typed on
 * this page stays; the session cookie is shared, so saving again here works.
 */
export default function SessionEndedNotice() {
  const [shown, setShown] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const show = () => setShown(true);
    window.addEventListener(SESSION_ENDED_EVENT, show);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, show);
  }, []);

  if (!shown) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4 print:hidden font-finlandica">
      <div className="max-w-3xl mx-auto rounded-xl bg-sblued text-swhite border-2 border-sred/60 shadow-2xl p-4 sm:flex sm:items-center sm:gap-4 space-y-3 sm:space-y-0">
        <p className="flex-1 text-sm sm:text-base">
          <strong>Istuntosi on päättynyt.</strong> Kirjaudu sisään uudessa välilehdessä, palaa sitten
          tähän ja tallenna uudelleen. Täyttämäsi tiedot säilyvät tällä sivulla.
        </p>
        <div className="flex gap-2 shrink-0">
          <a
            href={`/auth/kirjaudu?paluu=${encodeURIComponent(pathname)}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center min-h-11 px-5 rounded-lg bg-sred-dark text-swhite font-semibold hover:bg-sred-dark/90"
          >
            Kirjaudu sisään
            <span className="sr-only"> (avautuu uuteen välilehteen)</span>
          </a>
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
