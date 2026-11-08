/**
 * Shown to a logged-in member while the database is down: the session
 * couldn't be checked (auth.ts marks it `unavailable`), so the member pages
 * and saving don't work. Without it the member would just look logged out.
 * The root layout renders it on every page until the database answers again.
 */
export default function OutageNotice() {
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[65] p-3 sm:p-4 print:hidden font-finlandica">
      <div className="max-w-3xl mx-auto rounded-xl bg-sblued text-swhite border-2 border-warning-amber/70 shadow-2xl p-4">
        <p className="text-sm sm:text-base">
          <strong>Palvelussa on häiriö.</strong> Kirjautuminen, jäsenalue ja tallennus eivät juuri nyt
          toimi. Yritä hetken kuluttua uudelleen; sinun ei tarvitse kirjautua uudelleen.
        </p>
      </div>
    </div>
  );
}
