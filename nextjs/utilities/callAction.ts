import { unstable_rethrow } from "next/navigation";
import { FAILURE_TEXT, failureKind, type FailureKind } from "@/utilities/errorText";

/**
 * A server action call that didn't get an answer: the connection dropped,
 * the page is from before a deploy, or the server failed outright. Shaped
 * like an action's own error, so a component shows both the same way.
 */
export type ActionFailure = { status: "error"; error: string; failure: FailureKind };

// The site's notice for pages from before a deploy (OutdatedNotice) listens to this
export const OUTDATED_EVENT = "salko:outdated";

/**
 * Calls a server action from the browser. When the call throws instead of
 * answering, this answers for it with a Finnish message instead of letting
 * the error reach the error page, so the form and what was typed stay. Next's
 * own redirects and not-founds pass through.
 *
 *   const result = await callAction(() => saveThing(input));
 *   if (result.status === "error") setError(result.error);
 */
export async function callAction<T>(call: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await call();
  } catch (error) {
    unstable_rethrow(error);
    const kind = failureKind(error);
    if (kind === "outdated" && typeof window !== "undefined") {
      window.dispatchEvent(new Event(OUTDATED_EVENT));
    }
    // A lost connection or an old page is the browser's to report; anything
    // else is a bug or a server failure worth seeing in the console
    // eslint-disable-next-line no-console -- runs in the browser, where the server logger isn't
    if (kind === "other") console.error("Server action call failed", error);
    return { status: "error", error: kind === "other" ? FAILURE_TEXT_SAVE : FAILURE_TEXT[kind], failure: kind };
  }
}

// For a failed save the generic text is more exact as this
const FAILURE_TEXT_SAVE = "Tallennus tai haku epäonnistui. Yritä uudelleen hetken kuluttua.";

/** Whether an answer came from callAction() rather than from the action */
export function isActionFailure(value: unknown): value is ActionFailure {
  return Boolean(value && typeof value === "object" && "failure" in value && "status" in value && value.status === "error");
}
