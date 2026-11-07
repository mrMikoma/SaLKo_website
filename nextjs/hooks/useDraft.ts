"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Every draft's key starts with this, so logging out can remove them all
export const DRAFT_PREFIX = "salko:luonnos:";

/** Removes every draft in this tab: on logout, so the next person doesn't see them */
export function clearAllDrafts() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(DRAFT_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage blocked (private mode): there were no drafts either
  }
}

/**
 * Keeps a long form's unsaved input in the tab's sessionStorage, so a reload,
 * a crash or a wrong click doesn't lose it, and puts it back when the form
 * opens again in the same tab. Only in this tab and until it closes; logging
 * out clears it (clearAllDrafts).
 *
 * - `value` is what to keep, as plain JSON; `isEmpty` says when there is
 *   nothing worth keeping, which removes the draft.
 * - `restore` puts a kept draft back into the form, once, after the first render
 *   (the server can't read the tab's storage).
 * - `restored` is true while a restored draft is shown, for a notice;
 *   `clear()` removes the draft, after a save or when discarding it.
 */
export function useDraft<T>(
  name: string,
  value: T,
  restore: (draft: T) => void,
  isEmpty: (value: T) => boolean
) {
  const key = DRAFT_PREFIX + name;
  const [restored, setRestored] = useState(false);
  // Nothing is written before the kept draft has been read, or the form's
  // empty first render would overwrite it
  const ready = useRef(false);
  const restoreRef = useRef(restore);
  const isEmptyRef = useRef(isEmpty);

  useEffect(() => {
    restoreRef.current = restore;
    isEmptyRef.current = isEmpty;
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      const draft = raw ? (JSON.parse(raw) as T) : null;
      if (draft !== null && !isEmptyRef.current(draft)) {
        restoreRef.current(draft);
        // The tab's storage can only be read after hydration, so the restored
        // state can only be set here
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRestored(true);
      }
    } catch {
      // A draft that doesn't parse, or storage blocked: start empty
    }
    ready.current = true;
  }, [key]);

  useEffect(() => {
    if (!ready.current) return;
    try {
      if (isEmptyRef.current(value)) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Full or blocked storage: the form works, only without a draft
    }
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing kept
    }
    setRestored(false);
  }, [key]);

  return { restored, clear, dismiss: () => setRestored(false) };
}
