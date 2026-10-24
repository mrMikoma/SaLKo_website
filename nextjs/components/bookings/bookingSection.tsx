"use client";

import { useMemo, lazy, Suspense } from "react";
import { ConfigProvider, ThemeConfig } from "antd";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import DatePicker from "@/components/bookings/datePicker";
import GuestBanner from "@/components/bookings/GuestBanner";
import ViewSelector, { ViewMode } from "@/components/bookings/viewSelector";
import { BookingType } from "@/utilities/bookings";
import {
  useBookings,
  SaveBookingRequest,
  SaveBookingOutcome,
} from "@/hooks/useBookings";
import { useDateFromUrl } from "@/hooks/useDateFromUrl";
import { useBookingModal } from "@/hooks/useBookingModal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useViewMode } from "@/hooks/useViewMode";
import { useSyncSession } from "@/hooks/useSyncSession";
import { BookingsSkeleton } from "./BookingsSkeleton";
import { BookingsError } from "./BookingsError";
import { BookingsMobileView } from "./BookingsMobileView";
import { BookingsDesktopView } from "./BookingsDesktopView";
import { BookingsWeekView } from "./BookingsWeekView";
import { BookingsMonthView } from "./BookingsMonthView";
import { FLIGHT_TYPE_CONFIGS, FlightTypeConfig } from "@/types/bookings";
import { DateTime } from "@/utilities/clubTime";

// Lazy load modal for better code splitting
const BookingUpdateModal = lazy(
  () => import("@/components/bookings/bookingModal")
);

/*
 * Types and Constants
 */

// Re-export for backward compatibility with existing components
export type FlightTypes = FlightTypeConfig;
export const FLIGHT_TYPES = FLIGHT_TYPE_CONFIGS as unknown as FlightTypes[];

// The Ant Design parts (the booking modal) in the site's font and blue
const ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#003580", // sblue
    fontFamily: "var(--font-finlandica), sans-serif",
    borderRadius: 8,
  },
};

interface BookingSectionProps {
  userContext: {
    isLoggedIn: boolean;
    userId: string | null;
    userName: string | null;
    userRole: string | string[];
    userEmail: string | null;
  };
}

/*
 * BookingSection Component
 */

const BookingSection = ({ userContext }: BookingSectionProps) => {
  const { isLoggedIn, userId, userRole } = userContext;
  // After logging in from the guest banner, the navbar catches up too
  useSyncSession(isLoggedIn ? userId : null);

  // Custom hooks for state management
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { date, dateString, setDate } = useDateFromUrl();
  const { viewMode, setViewMode } = useViewMode();
  const isMobile = useIsMobile();
  // On mobile, treat "week" as "day" since week grid doesn't fit
  const effectiveViewMode: ViewMode = isMobile && viewMode === "week" ? "day" : viewMode;

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (effectiveViewMode === "week") {
      const weekStart = date.startOf("week");
      return Array.from({ length: 7 }, (_, i) =>
        weekStart.plus({ days: i }).toISODate()
      ).filter((d): d is string => d !== null);
    } else if (effectiveViewMode === "month") {
      const monthStart = date.startOf("month");
      const monthEnd = date.endOf("month");
      const calendarStart = monthStart.startOf("week");
      const calendarEnd = monthEnd.endOf("week");
      const days: string[] = [];
      let currentDay = calendarStart;
      while (currentDay <= calendarEnd) {
        const isoDate = currentDay.toISODate();
        if (isoDate) days.push(isoDate);
        currentDay = currentDay.plus({ days: 1 });
      }
      return days;
    }
    return [dateString];
  }, [date, dateString, effectiveViewMode]);

  const {
    bookings,
    isLoading,
    isError,
    error,
    refetch,
    saveBooking,
    removeBooking,
  } = useBookings({ dates: dateRange });

  const {
    modalMode,
    selectedBooking,
    isOpen,
    openCreateModal,
    openUpdateModal,
    openViewModal,
    closeModal,
    setSelectedBooking,
  } = useBookingModal();

  // Helper functions
  const getFlightTypeColor = useMemo(
    () =>
      (type: string): string => {
        const flightType = FLIGHT_TYPES.find((flight) => flight.type === type);
        return flightType ? flightType.color : "#4A90E2";
      },
    []
  );

  // Event handlers
  const handleCellClick = (plane: string, hour: string, cellDate?: string) => {
    // For logged-in users, userId must be present
    if (isLoggedIn && !userId) {
      console.error("Cannot create booking: logged-in user has no userId");
      alert("Istunto on vanhentunut. Ole hyvä ja kirjaudu uudelleen.");
      return;
    }

    const targetDate = cellDate || dateString;
    const startHour = parseInt(hour.split(":")[0]);
    const endHour = startHour + 1;

    // Format hours with leading zero if needed (e.g., 07:00 instead of 7:00)
    const startTimeStr = `${targetDate}T${startHour
      .toString()
      .padStart(2, "0")}:00`;
    const endTimeStr = `${targetDate}T${endHour
      .toString()
      .padStart(2, "0")}:00`;

    // Allow both logged in users and guests to create bookings
    openCreateModal({
      plane,
      start_time: startTimeStr,
      end_time: endTimeStr,
      user_id: userId || "", // Empty string for guests
    });
  };

  const handleDayClick = (targetDate: string) => {
    const newDate = DateTime.fromISO(targetDate);
    if (!newDate.isValid) return;

    // When using separate setDate() and setViewMode() calls, they each trigger
    // router.replace() which can cause one to overwrite the other
    const params = new URLSearchParams(searchParams.toString());
    const isoDate = newDate.toISODate();
    if (isoDate) {
      params.set("paiva", isoDate);
      params.set("view", "day");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleMobileCreateBooking = (plane: string) => {
    // For logged-in users, userId must be present
    if (isLoggedIn && !userId) {
      console.error("Cannot create booking: logged-in user has no userId");
      alert("Istunto on vanhentunut. Ole hyvä ja kirjaudu uudelleen.");
      return;
    }

    // Allow both logged in users and guests to create bookings
    openCreateModal({
      plane,
      start_time: `${dateString}T09:00`,
      end_time: `${dateString}T10:00`,
      user_id: userId || "", // Empty string for guests
    });
  };

  // Helper to check if user has admin role
  const isAdmin = Array.isArray(userRole)
    ? userRole.includes("admin")
    : userRole === "admin";

  const handleBookingClick = (booking: BookingType) => {
    if (!isLoggedIn) {
      // Not logged in - view only
      openViewModal(booking);
    } else if (isAdmin) {
      // Admin can edit all bookings
      openUpdateModal(booking);
    } else if (userId === booking.user_id) {
      // User can edit their own bookings
      openUpdateModal(booking);
    } else {
      // Logged in but not owner - view only
      openViewModal(booking);
    }
  };

  // The modal shows the result: the saved booking with calendar links, the
  // overlap warning or the error; it closes itself after an update
  const handleSaveBooking = (
    request: SaveBookingRequest
  ): Promise<SaveBookingOutcome> => saveBooking(request);

  // Throws with a Finnish message on failure; the delete dialog shows it
  const handleDeleteBooking = async (
    deleteFollowing?: boolean
  ): Promise<void> => {
    if (selectedBooking.id < 0) return;
    await removeBooking({
      id: selectedBooking.id,
      deleteFollowing: deleteFollowing && !!selectedBooking.repeat_group_id,
    });
    closeModal();
  };

  return (
    <ConfigProvider theme={ANTD_THEME}>
      <div className="px-2 py-3 lg:p-4 text-black" role="main" aria-label="Varauskalenteri">
        {!isLoggedIn && <GuestBanner />}

        {/* Date Picker and View Selector - side by side on desktop */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between mb-3 lg:mb-6">
          <div className="w-full lg:flex-1">
            <DatePicker viewMode={effectiveViewMode} />
          </div>
          <div className="flex-shrink-0">
            <ViewSelector
              currentView={effectiveViewMode}
              onViewChange={setViewMode}
              availableViews={isMobile ? ["day", "month"] : undefined}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <BookingsSkeleton />}

        {/* Error State */}
        {isError && !isLoading && (
          <BookingsError error={error} onRetry={() => refetch()} />
        )}

        {/* Content - only show when not loading or error */}
        {!isLoading && !isError && (
          <>
            {/* Responsive Booking View */}
            {isMobile ? (
              effectiveViewMode === "month" ? (
                // On a phone the month arrows sit on the calendar too, under the thumb
                <BookingsMonthView
                  bookings={bookings}
                  selectedDate={date}
                  onDayClick={handleDayClick}
                  onPreviousMonth={() => setDate(date.minus({ months: 1 }))}
                  onNextMonth={() => setDate(date.plus({ months: 1 }))}
                  flightTypes={FLIGHT_TYPES}
                  getFlightTypeColor={getFlightTypeColor}
                />
              ) : (
                <BookingsMobileView
                  bookings={bookings}
                  selectedDate={date}
                  onBookingClick={handleBookingClick}
                  onCreateBooking={handleMobileCreateBooking}
                  flightTypes={FLIGHT_TYPES}
                  getFlightTypeColor={getFlightTypeColor}
                />
              )
            ) : effectiveViewMode === "week" ? (
              <BookingsWeekView
                bookings={bookings}
                selectedDate={date}
                onCellClick={handleCellClick}
                onBookingClick={handleBookingClick}
                flightTypes={FLIGHT_TYPES}
                getFlightTypeColor={getFlightTypeColor}
              />
            ) : effectiveViewMode === "month" ? (
              <BookingsMonthView
                bookings={bookings}
                selectedDate={date}
                onDayClick={handleDayClick}
                flightTypes={FLIGHT_TYPES}
                getFlightTypeColor={getFlightTypeColor}
              />
            ) : (
              <BookingsDesktopView
                bookings={bookings}
                selectedDate={date}
                onCellClick={handleCellClick}
                onBookingClick={handleBookingClick}
                flightTypes={FLIGHT_TYPES}
                getFlightTypeColor={getFlightTypeColor}
              />
            )}
          </>
        )}

        {/* Booking Modal */}
        {modalMode && (
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            }
          >
            <BookingUpdateModal
              mode={modalMode}
              booking={selectedBooking}
              onSave={handleSaveBooking}
              onDelete={handleDeleteBooking}
              onCancel={closeModal}
              onChange={setSelectedBooking}
              isLoggedIn={isLoggedIn}
              userRole={userRole}
            />
          </Suspense>
        )}
      </div>
    </ConfigProvider>
  );
};

export default BookingSection;
