"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import ErrorPanel, { primaryAction, secondaryAction } from "@/components/errors/ErrorPanel";
import { errorDigest, FAILURE_TEXT, FAILURE_TITLE, failureKind } from "@/utilities/errorText";

/**
 * What an error page says and offers, by the kind of failure: try again for
 * a lost connection or a server error, reload for a page from before the
 * site was updated (trying again would run the same old code).
 */
export default function ErrorBoundaryContent({
  error,
  retry,
  tone,
  showTitle,
}: {
  error: unknown;
  retry: () => void;
  tone: "dark" | "light";
  // The public error page has the title in its hero instead
  showTitle: boolean;
}) {
  const kind = failureKind(error);
  const code = kind === "other" ? errorDigest(error) : null;
  const home = tone === "dark" ? { href: "/", label: "Etusivulle" } : { href: "/admin", label: "Hallinnan etusivulle" };

  // A failed save is often at the bottom of a long form, and the page keeps
  // its scroll position: bring the explanation into view, and focus it for
  // screen readers
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center" });
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={ref} tabIndex={-1} className="focus:outline-none">
      <ErrorPanel
        tone={tone}
        title={showTitle ? FAILURE_TITLE[kind] : undefined}
        code={code}
        actions={
          <>
            {kind === "outdated" ? (
              <button type="button" onClick={() => window.location.reload()} className={primaryAction(tone)}>
                Lataa sivu uudelleen
              </button>
            ) : (
              <button type="button" onClick={() => retry()} className={primaryAction(tone)}>
                Yritä uudelleen
              </button>
            )}
            <Link href={home.href} className={secondaryAction(tone)}>
              {home.label}
            </Link>
          </>
        }
      >
        {kind === "other" ? (
          <>
            <p>Sivun näyttäminen tai tallennus ei onnistunut. Yritä uudelleen hetken kuluttua.</p>
            <p>
              Jos virhe toistuu,{" "}
              <Link href="/yhteystiedot" className="underline underline-offset-2">
                ota yhteyttä ylläpitoon
              </Link>
              {code ? " ja kerro alla oleva virhekoodi." : "."}
            </p>
          </>
        ) : (
          <p>{FAILURE_TEXT[kind]}</p>
        )}
      </ErrorPanel>
    </div>
  );
}
