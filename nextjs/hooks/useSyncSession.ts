"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Refreshes the browser's copy of the session when the page's server data says
 * someone else is logged in. A login that comes back to the same page (the
 * calendar's guest banner) updates the page but not SessionProvider, so the
 * navbar would still say "not logged in" until a reload.
 */
export function useSyncSession(serverUserId: string | null) {
  const { data, status, update } = useSession();
  const clientUserId = data?.user?.id ?? null;
  // Once per server user, so a failed refresh doesn't repeat forever
  const synced = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === "loading" || clientUserId === serverUserId) return;
    if (synced.current === serverUserId) return;
    synced.current = serverUserId;
    void update();
  }, [status, clientUserId, serverUserId, update]);
}
