"use client";

import { useMemo, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DatePicker from "@/components/bookings/datePicker";
import ViewSelector, { ViewMode } from "@/components/bookings/viewSelector";
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
  userContext: {
    isLoggedIn: boolean;
    userId: string | null;
    userName: string | null;
    userRole: string;
    userEmail: string | null;
  };
}

/*
 * BookingSection Component
 */

const BookingSection = ({ userContext }: BookingSectionProps) => {
  const { isLoggedIn, userId, userRole } = userContext;

  // Custom hooks for state management
  const queryClient = useQueryClient();
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
  } = useBookings({ dates: dateRange, userId, userRole });

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
    const startTimeStr = `${targetDate}T${startHour.toString().padStart(2, '0')}:00`;
    const endTimeStr = `${targetDate}T${endHour.toString().padStart(2, '0')}:00`;

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
    if (newDate.isValid) {
      setDate(newDate);
      setViewMode("day");
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

  const handleBookingClick = (booking: BookingType) => {
    if (!isLoggedIn) {
      // Not logged in - view only
      openViewModal(booking);
    } else if (userRole === "admin") {
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

  const handleSaveBooking = async (booking: BookingType, repeatEndDate?: string) => {
    if (repeatEndDate) {
      // Handle repeating bookings
      const { addRepeatingBookings } = await import("@/utilities/bookings");
      try {
        const response = await addRepeatingBookings({
          user_id: booking.user_id,
          plane: booking.plane,
          start_time: booking.start_time,
          end_time: booking.end_time,
          type: booking.type,
          title: booking.title,
          description: booking.description,
          repeat_end_date: repeatEndDate,
        });

        if (response.status === "success") {
          closeModal();
          // Invalidate ALL bookings cache to refresh all views (day, week, month)
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
        }
      } catch (error) {
        console.error("Error creating repeating bookings:", error);
      }
    } else {
      // Single booking - use the booking passed from modal
      addBooking(booking);
      closeModal();
    }
  };

  const handleUpdateBooking = (booking: BookingType) => {
    updateBooking(booking);
    closeModal();
  };

  const handleDeleteBooking = async (deleteFollowing?: boolean): Promise<void> => {
    if (selectedBooking.id >= 0) {
      // If deleteFollowing is true and the booking has a repeat_group_id, use the new function
      if (deleteFollowing && selectedBooking.repeat_group_id) {
        const { removeBookingWithRepeats } = await import("@/utilities/bookings");
        try {
          const response = await removeBookingWithRepeats(
            selectedBooking.id,
            userId!,
            userRole,
            true
          );

          if (response.status === "success") {
            // Invalidate ALL bookings cache to refresh all views
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            closeModal();
          } else {
            console.error("Error deleting repeating bookings:", response.result);
            alert("Virhe poistettaessa toistuvia varauksia");
            throw new Error("Failed to delete repeating bookings");
          }
        } catch (error) {
          console.error("Error deleting repeating bookings:", error);
          alert("Virhe poistettaessa toistuvia varauksia");
          throw error;
        }
      } else {
        // Regular single booking deletion - this uses React Query mutation
        removeBooking(selectedBooking.id);
        // Don't close modal here - let the mutation's onSuccess handle it
        // Wait a bit for the mutation to process
        await new Promise(resolve => setTimeout(resolve, 100));
        closeModal();
      }
    }
  };

  return (
    <div className="p-4 text-black" role="main" aria-label="Varauskalenteri">
      {/* Date Picker and View Selector - side by side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
        <div className="w-full lg:flex-1">
          <DatePicker viewMode={viewMode} />
        </div>
        {!isMobile && (
          <div className="flex-shrink-0">
            <ViewSelector currentView={viewMode} onViewChange={setViewMode} />
          </div>
        )}
      </div>

      {/* Guest Booking Info Banner */}
      {!isLoggedIn && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-center text-gray-700">
            <span className="font-medium">Voit varata myös ilman kirjautumista.</span>
            {" "}
            <a href="/auth/login" className="text-sblue hover:underline font-medium">
              Kirjaudu sisään
            </a>
            {" "}jos sinulla on käyttäjätunnus.
          </p>
        </div>
      )}

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
            <BookingsMobileView
              bookings={bookings}
              onBookingClick={handleBookingClick}
              onCreateBooking={handleMobileCreateBooking}
              flightTypes={FLIGHT_TYPES}
              getFlightTypeColor={getFlightTypeColor}
              isLoggedIn={isLoggedIn}
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
              flightTypes={FLIGHT_TYPES}
              getFlightTypeColor={getFlightTypeColor}
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
            isLoggedIn={isLoggedIn}
            userRole={userRole}
          />
        </Suspense>
      )}
    </div>
  );
};

export default BookingSection;
