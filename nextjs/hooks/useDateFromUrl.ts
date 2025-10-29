import { useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { DateTime } from "luxon";

/**
 * Custom hook for managing date parameter in URL
 * Provides type-safe date handling with Luxon DateTime
 */
export const useDateFromUrl = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Get current date from URL or fallback to today
  const dateParam = searchParams.get("paiva");
  const selectedDate = dateParam
    ? DateTime.fromISO(dateParam)
    : DateTime.now();

  // Validate and return date
  const date = selectedDate.isValid ? selectedDate : DateTime.now();

  /**
   * Update the date in URL and trigger navigation
   */
  const setDate = useCallback(
    (newDate: DateTime) => {
      if (!newDate.isValid) {
        console.error("Invalid date provided:", newDate);
        return;
      }

      const dateString = newDate.toISODate();
      if (!dateString) {
        console.error("Failed to convert date to ISO string");
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("paiva", dateString);

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /**
   * Navigate to previous day
   */
  const previousDay = useCallback(() => {
    const newDate = date.minus({ days: 1 });
    setDate(newDate);
  }, [date, setDate]);

  /**
   * Navigate to next day
   */
  const nextDay = useCallback(() => {
    const newDate = date.plus({ days: 1 });
    setDate(newDate);
  }, [date, setDate]);

  /**
   * Navigate to today
   */
  const goToToday = useCallback(() => {
    setDate(DateTime.now());
  }, [setDate]);

  return {
    date,
    dateString: date.toISODate() || "",
    setDate,
    previousDay,
    nextDay,
    goToToday,
    isToday: date.hasSame(DateTime.now(), "day"),
  };
};
