"use client";

import ErrorBoundaryContent from "@/components/errors/ErrorBoundaryContent";

/**
 * A failed admin page: inside the admin layout, so the admin menu stays and
 * leads to the other sections
 */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="max-w-3xl">
      <ErrorBoundaryContent error={error} retry={retry} tone="light" showTitle />
    </div>
  );
}
