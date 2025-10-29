"use client";

import { useMemo, lazy, Suspense } from "react";
import DatePicker from "@/components/bookings/datePicker";
import ViewSelector, { ViewMode } from "@/components/bookings/viewSelector";
import { DndProvider } from "@/components/bookings/DndProvider";
import { BookingType } from "@/utilities/bookings";
import { useBookings } from "@/hooks/useBookings";
import { useDateFromUrl } from "@/hooks/useDateFromUrl";
import { useBookingModal } from "@/hooks/useBookingModal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useViewMode } from "@/hooks/useViewMode";
import { BookingsSkeleton } from "./BookingsSkeleton";
import { BookingsError } from "./BookingsError";
import { BookingsMobileView } from "./BookingsMobileView";
import { BookingsDesktopView } from "./BookingsDesktopView";
import { BookingsWeekView } from "./BookingsWeekView";
import { BookingsMonthView } from "./BookingsMonthView";
import { FLIGHT_TYPE_CONFIGS, FlightTypeConfig } from "@/types/bookings";
import { DateTime } from "luxon";

// Lazy load modal for better code splitting
const BookingUpdateModal = lazy(() => import("@/components/bookings/bookingModal"));

/*
 * Types and Constants
 */

// Re-export for backward compatibility with existing components
export type FlightTypes = FlightTypeConfig;
export const FLIGHT_TYPES = FLIGHT_TYPE_CONFIGS as unknown as FlightTypes[];

interface BookingSectionProps {
  isLoggedIn: boolean;
}

/*
 * BookingSection Component
 * Modernized with custom hooks, React Query, and responsive design
 */

const BookingSection = ({ isLoggedIn }: BookingSectionProps) => {
  // Custom hooks for state management
  const { date, dateString, setDate } = useDateFromUrl();
  const { viewMode, setViewMode } = useViewMode();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      const weekStart = date.startOf("week");
      return Array.from({ length: 7 }, (_, i) =>
        weekStart.plus({ days: i }).toISODate()
      ).filter((d): d is string => d !== null);
    } else if (viewMode === "month") {
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
  }, [date, dateString, viewMode]);

  const {
    bookings,
    isLoading,
    isError,
    error,
    refetch,
    addBooking,
    removeBooking,
    updateBooking,
    isAddingBooking,
    isRemovingBooking,
    isUpdatingBooking,
  } = useBookings({ dates: dateRange });

  const {
    modalMode,
    selectedBooking,
    isOpen,
    openCreateModal,
    openUpdateModal,
    closeModal,
    setSelectedBooking,
  } = useBookingModal();

  const isMobile = useIsMobile();

  // Helper functions
  const getFlightTypeColor = useMemo(
    () => (type: string): string => {
      const flightType = FLIGHT_TYPES.find((flight) => flight.type === type);
      return flightType ? flightType.color : "#4A90E2";
    },
    []
  );

  // Event handlers
  const handleCellClick = (plane: string, hour: string, cellDate?: string) => {
    const targetDate = cellDate || dateString;
    if (!isLoggedIn) {
      openUpdateModal({
        id: -1,
        user_id: "",
        title: "",
        start_time: `${targetDate}T${parseInt(hour.split(":")[0])}:00`,
        end_time: `${targetDate}T${parseInt(hour.split(":")[0]) + 1}:00`,
        full_name: "",
        type: "local",
        plane,
        description: "",
      });
      return;
    }

    openCreateModal({
      plane,
      start_time: `${targetDate}T${parseInt(hour.split(":")[0])}:00`,
      end_time: `${targetDate}T${parseInt(hour.split(":")[0]) + 1}:00`,
    });
  };

  const handleDayClick = (targetDate: string) => {
    const newDate = DateTime.fromISO(targetDate);
    if (newDate.isValid) {
      setDate(newDate);
      setViewMode("day");
    }
  };

  const handleBookingClick = (booking: BookingType) => {
    if (isLoggedIn) {
      openUpdateModal(booking);
    } else {
      openUpdateModal(booking); // In production, use openViewModal for non-logged users
    }
  };

  const handleBookingDrop = (
    booking: BookingType,
    newPlane: string,
    newStartTime: string
  ) => {
    if (!isLoggedIn) return;

    // Calculate duration of original booking
    const originalStart = DateTime.fromISO(booking.start_time);
    const originalEnd = DateTime.fromISO(booking.end_time);
    const duration = originalEnd.diff(originalStart);

    // Calculate new end time
    const newStart = DateTime.fromISO(newStartTime);
    const newEnd = newStart.plus(duration);

    // Update booking with new plane and times
    const updatedBooking: BookingType = {
      ...booking,
      plane: newPlane,
      start_time: newStart.toISO() || booking.start_time,
      end_time: newEnd.toISO() || booking.end_time,
    };

    updateBooking(updatedBooking);
  };

  const handleSaveBooking = () => {
    addBooking(selectedBooking);
    closeModal();
  };

  const handleUpdateBooking = () => {
    updateBooking(selectedBooking);
    closeModal();
  };

  const handleDeleteBooking = async () => {
    if (selectedBooking.id >= 0) {
      removeBooking(selectedBooking.id);
      closeModal();
    }
  };

  return (
    <DndProvider>
      <div className="p-4 text-black" role="main" aria-label="Varauskalenteri">
        {/* Date Picker */}
        <div className="flex justify-center items-center mb-4 text-swhite">
          <DatePicker />
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
            {/* View Selector - only show on desktop */}
            {!isMobile && (
              <ViewSelector currentView={viewMode} onViewChange={setViewMode} />
            )}

            {/* Responsive Booking View */}
            {isMobile ? (
          <BookingsMobileView
            bookings={bookings}
            onBookingClick={handleBookingClick}
            flightTypes={FLIGHT_TYPES}
            getFlightTypeColor={getFlightTypeColor}
          />
        ) : viewMode === "week" ? (
          <BookingsWeekView
            bookings={bookings}
            selectedDate={date}
            onCellClick={handleCellClick}
            onBookingClick={handleBookingClick}
            flightTypes={FLIGHT_TYPES}
            getFlightTypeColor={getFlightTypeColor}
          />
        ) : viewMode === "month" ? (
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
            onBookingDrop={handleBookingDrop}
            flightTypes={FLIGHT_TYPES}
            getFlightTypeColor={getFlightTypeColor}
            isLoggedIn={isLoggedIn}
          />
        )}
          </>
        )}

        {/* Loading overlay for mutations */}
        {(isAddingBooking || isRemovingBooking || isUpdatingBooking) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
            role="status"
            aria-live="polite"
          >
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-900 font-medium">
                  {isAddingBooking && "Lisätään varausta..."}
                  {isRemovingBooking && "Poistetaan varausta..."}
                  {isUpdatingBooking && "Päivitetään varausta..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {modalMode && (
          <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
            <BookingUpdateModal
              mode={modalMode}
              booking={selectedBooking}
              onSave={handleSaveBooking}
              onUpdate={handleUpdateBooking}
              onDelete={handleDeleteBooking}
              onCancel={closeModal}
              onChange={setSelectedBooking}
            />
          </Suspense>
        )}
      </div>
    </DndProvider>
  );
};

export default BookingSection;
