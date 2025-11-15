"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ViewMode } from "@/components/bookings/viewSelector";

/**
 * Custom hook for managing view mode state in URL parameters
 * Provides view mode state and functions to change it
 */
export const useViewMode = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current view mode from URL, default to "day"
  const viewMode = useMemo<ViewMode>(() => {
    const view = searchParams.get("view");
    if (view === "week" || view === "month" || view === "day") {
      return view;
    }
    return "day";
  }, [searchParams]);

  // Update view mode in URL
  const setViewMode = useCallback(
    (newView: ViewMode) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", newView);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return {
    viewMode,
    setViewMode,
  };
};
