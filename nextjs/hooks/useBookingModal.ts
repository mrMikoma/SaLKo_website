import { useState, useCallback } from "react";
import { BookingType } from "@/utilities/bookings";

export type ModalMode = "create" | "update" | "view" | null;

const DEFAULT_BOOKING: BookingType = {
  id: -1,
  user_id: "",
  title: "",
  start_time: "",
  end_time: "",
  full_name: "",
  type: "local",
  plane: "OH-CON",
  description: "",
};

/**
 * Custom hook for managing booking modal state
 * Handles modal mode, selected booking, and validation
 */
export const useBookingModal = () => {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingType>(DEFAULT_BOOKING);

  /**
   * Validate booking data
   */
  const isBookingValid = useCallback((booking: BookingType): boolean => {
    return !!(
      booking.end_time &&
      booking.id >= 0 &&
      booking.start_time &&
      booking.title &&
      booking.type &&
      booking.plane
    );
  }, []);

  /**
   * Open modal in create mode with initial booking data
   */
  const openCreateModal = useCallback(
    (initialData: Partial<BookingType> = {}) => {
      setSelectedBooking({
        ...DEFAULT_BOOKING,
        ...initialData,
      });
      setModalMode("create");
    },
    []
  );

  /**
   * Open modal in update mode with existing booking
   */
  const openUpdateModal = useCallback((booking: BookingType) => {
    setSelectedBooking(booking);
    setModalMode("update");
  }, []);

  /**
   * Open modal in view mode (read-only)
   */
  const openViewModal = useCallback((booking: BookingType) => {
    setSelectedBooking(booking);
    setModalMode("view");
  }, []);

  /**
   * Close modal and reset state
   */
  const closeModal = useCallback(() => {
    setModalMode(null);
    setSelectedBooking(DEFAULT_BOOKING);
  }, []);

  /**
   * Update selected booking data
   */
  const updateSelectedBooking = useCallback(
    (updates: Partial<BookingType>) => {
      setSelectedBooking((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  /**
   * Check if modal is open
   */
  const isOpen = modalMode !== null;

  return {
    modalMode,
    selectedBooking,
    isOpen,
    isBookingValid,
    openCreateModal,
    openUpdateModal,
    openViewModal,
    closeModal,
    setSelectedBooking,
    updateSelectedBooking,
  };
};
