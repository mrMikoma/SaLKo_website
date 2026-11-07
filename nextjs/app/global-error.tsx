"use client";

import "../styles/tailwind.css";
import { errorDigest, FAILURE_TEXT, FAILURE_TITLE, failureKind } from "@/utilities/errorText";

/**
 * When the root layout itself fails, which app/error.tsx can't catch: also
 * a save from the navbar, such as its login, that throws. It
 * replaces the whole document, so it brings its own <html>, <body> and styles
 * and has no navbar; plain links instead of next/link, since the router may be
 * what broke.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const kind = failureKind(error);
  const code = kind === "other" ? errorDigest(error) : null;
  return (
    <html lang="fi">
      <body className="bg-sblued text-swhite font-sans">
        <title>{`${FAILURE_TITLE[kind]} | SaLKo`}</title>
        <main className="min-h-screen flex items-center justify-center px-6 py-16">
          <div role="alert" className="max-w-xl w-full space-y-4">
            <p className="text-sm uppercase tracking-wider text-swhite/60">Savonlinnan Lentokerho ry</p>
            <h1 className="text-3xl md:text-4xl font-bold">{FAILURE_TITLE[kind]}</h1>
            <p className="text-lg text-swhite/90">
              {kind === "other" ? "Sivuston näyttäminen ei onnistunut. Yritä uudelleen hetken kuluttua." : FAILURE_TEXT[kind]}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => (kind === "outdated" ? window.location.reload() : retry())}
                className="min-h-11 px-6 rounded-lg bg-sred-dark text-swhite font-semibold hover:bg-sred-dark/90"
              >
                {kind === "outdated" ? "Lataa sivu uudelleen" : "Yritä uudelleen"}
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be what failed */}
              <a href="/" className="inline-flex items-center min-h-11 px-6 rounded-lg border-2 border-swhite/40 font-semibold hover:bg-swhite/10">
                Etusivulle
              </a>
            </div>
            {code && (
              <p className="text-sm text-swhite/60">
                Virhekoodi: <span className="font-mono">{code}</span>
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
