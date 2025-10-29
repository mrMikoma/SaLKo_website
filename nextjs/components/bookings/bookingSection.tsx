"use client";

import { useMemo } from "react";
import DatePicker from "@/components/bookings/datePicker";
import BookingUpdateModal from "@/components/bookings/bookingModal";
import { BookingType } from "@/utilities/bookings";
import { useBookings } from "@/hooks/useBookings";
import { useDateFromUrl } from "@/hooks/useDateFromUrl";
import { useBookingModal } from "@/hooks/useBookingModal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BookingsSkeleton } from "./BookingsSkeleton";
import { BookingsError } from "./BookingsError";
import { BookingsMobileView } from "./BookingsMobileView";
import { BookingsDesktopView } from "./BookingsDesktopView";

/*
 * Types and Constants
 */

export interface FlightTypes {
  type: string;
  label: string;
  color: string;
  priority: number;
}

export const FLIGHT_TYPES: FlightTypes[] = [
  { type: "local", label: "Paikallislento", color: "#90EE90", priority: 3 }, // Light Green
  { type: "trip", label: "Matkalento", color: "#87CEEB", priority: 3 }, // Sky Blue
  { type: "training", label: "Koululento", color: "#ADD8E6", priority: 2 }, // Light Blue
  { type: "maintenance", label: "Huolto", color: "#FFB6C1", priority: 1 }, // Light Red
  { type: "fire", label: "Palolento", color: "#FFA500", priority: 1 }, // Orange
  { type: "other", label: "Muu lento", color: "#D3D3D3", priority: 2 }, // Light Grey
];

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
  } = useBookings({ date: dateString });

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
  const handleDateChange = (newDate: any) => {
    setDate(newDate);
  };

  const handleCellClick = (plane: string, hour: string) => {
    if (!isLoggedIn) {
      openUpdateModal({
        id: -1,
        user_id: "",
        title: "",
        start_time: `${dateString}T${parseInt(hour.split(":")[0])}:00`,
        end_time: `${dateString}T${parseInt(hour.split(":")[0]) + 1}:00`,
        full_name: "",
        type: "local",
        plane,
        description: "",
      });
      return;
    }

    openCreateModal({
      plane,
      start_time: `${dateString}T${parseInt(hour.split(":")[0])}:00`,
      end_time: `${dateString}T${parseInt(hour.split(":")[0]) + 1}:00`,
    });
  };

  const handleBookingClick = (booking: BookingType) => {
    if (isLoggedIn) {
      openUpdateModal(booking);
    } else {
      openUpdateModal(booking); // In production, use openViewModal for non-logged users
    }
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

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 text-black" role="main" aria-label="Varauskalenteri">
        <div className="flex justify-center items-center mb-4 text-swhite">
          <DatePicker onChange={handleDateChange} />
        </div>
        <BookingsSkeleton />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-4 text-black" role="main" aria-label="Varauskalenteri">
        <div className="flex justify-center items-center mb-4 text-swhite">
          <DatePicker onChange={handleDateChange} />
        </div>
        <BookingsError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="p-4 text-black" role="main" aria-label="Varauskalenteri">
      {/* Date Picker */}
      <div className="flex justify-center items-center mb-4 text-swhite">
        <DatePicker onChange={handleDateChange} />
      </div>

      {/* Responsive Booking View */}
      {isMobile ? (
        <BookingsMobileView
          bookings={bookings}
          onBookingClick={handleBookingClick}
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
        <BookingUpdateModal
          mode={modalMode}
          booking={selectedBooking}
          onSave={handleSaveBooking}
          onUpdate={handleUpdateBooking}
          onDelete={handleDeleteBooking}
          onCancel={closeModal}
          onChange={setSelectedBooking}
        />
      )}
    </div>
  );
};

export default BookingSection;
