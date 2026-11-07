"use client";

import PageHero from "@/components/pageHero";
import ErrorBoundaryContent from "@/components/errors/ErrorBoundaryContent";
import { FAILURE_TITLE, failureKind } from "@/utilities/errorText";

/**
 * Shown in place of a page that failed: a server error while rendering it,
 * or a save that threw in the browser (a lost connection, a page opened
 * before the site was updated). The root layout stays, so the navbar does too.
 * Next 16 passes retry(), which fetches and renders the page again.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <title>{`${FAILURE_TITLE[failureKind(error)]} | SaLKo`}</title>
      <PageHero
        title={FAILURE_TITLE[failureKind(error)]}
        backgroundImage="olavinlinna"
        showScrollIndicator={false}
      >
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-3xl">
            <ErrorBoundaryContent error={error} retry={retry} tone="dark" showTitle={false} />
          </div>
        </div>
      </PageHero>
    </div>
  );
}
