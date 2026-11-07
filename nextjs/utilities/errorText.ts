/**
 * What a failure in the browser means for the person using the site, in
 * Finnish. Shared by the error pages and the server action calls, so the
 * same failure reads the same everywhere. No "use server": this runs in the
 * browser too.
 */
export type FailureKind = "offline" | "outdated" | "other";

// The heading of an error page for each
export const FAILURE_TITLE: Record<FailureKind, string> = {
  offline: "Yhteys katkesi",
  outdated: "Sivusto on päivittynyt",
  other: "Jotain meni pieleen",
};

export const FAILURE_TEXT: Record<FailureKind, string> = {
  offline: "Yhteys palvelimeen katkesi. Tarkista verkkoyhteys ja yritä uudelleen.",
  outdated: "Sivusto on päivittynyt sen jälkeen, kun avasit sivun. Lataa sivu uudelleen.",
  other: "Jotain meni pieleen. Yritä uudelleen hetken kuluttua.",
};

/**
 * - outdated: the site was deployed after the page was opened, so its server
 *   actions or script chunks are gone (Next's UnrecognizedActionError, or a
 *   chunk that no longer loads). Only reloading the page helps.
 * - offline: the request never got an answer (fetch's TypeError: "Failed to
 *   fetch" in Chrome, "NetworkError…" in Firefox, "Load failed" in Safari),
 *   or the browser says it is offline.
 */
export function failureKind(error: unknown): FailureKind {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (
    name === "UnrecognizedActionError" ||
    name === "ChunkLoadError" ||
    /Server Action .* was not found on the server|Failed to load chunk|Loading chunk .* failed/i.test(message)
  ) {
    return "outdated";
  }
  if (
    (error instanceof TypeError && /fetch|network|load failed/i.test(message)) ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return "offline";
  }
  return "other";
}

/** The short code Next gives a server error, to match it in the server log */
export function errorDigest(error: unknown): string | null {
  if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return null;
}
