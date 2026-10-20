import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "@/utilities/clubTime";
import { BOOKABLE_PLANES } from "@/utilities/planeHelpers";
import {
  fetchBookingsForDateRange,
  addBooking,
  addGuestBooking,
  addRepeatingBookings,
  updateBooking,
  removeBooking,
  BookingType,
  BookingResult,
} from "@/utilities/bookings";
import type { BookingInput, GuestContactInput } from "@/schemas/bookingSchema";

export interface SaveBookingRequest {
  booking: BookingType;
  repeatEndDate?: string;
  guestContact?: GuestContactInput;
  // Save even though the aircraft is already booked (after the overlap warning)
  allowOverlap?: boolean;
}

export type SaveBookingOutcome = BookingResult<unknown>;

/**
 * Fetches bookings for all bookable planes over the range the dates span,
 * in a single query
 */
const fetchBookingsForDates = async (dates: string[]): Promise<BookingType[]> => {
  if (dates.length === 0) return [];

  const sortedDates = [...dates].sort();
  const response = await fetchBookingsForDateRange(
    [...BOOKABLE_PLANES],
    sortedDates[0],
    sortedDates[sortedDates.length - 1]
  );

  if (response.status === "success") {
    return response.result;
  }
  throw new Error(
    response.status === "error" ? response.error : "Varausten haku epäonnistui"
  );
};

const toBookingInput = (booking: BookingType): BookingInput => ({
  plane: booking.plane,
  type: booking.type as BookingInput["type"],
  title: booking.title,
  description: booking.description,
  start_time: booking.start_time,
  end_time: booking.end_time,
});

/**
 * Bookings for the given dates, plus save and remove. Saving returns the
 * server's answer (success, overlap conflict or error) so the booking modal
 * can show it; removing throws with a Finnish message on failure.
 */
export const useBookings = ({
  dates,
  enabled = true,
}: {
  dates: string[];
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();

  // Range-based key: the same range is cached however the dates are ordered
  const sortedDates = [...dates].sort();
  const queryKey = [
    "bookings",
    "range",
    sortedDates[0],
    sortedDates[sortedDates.length - 1],
  ];

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchBookingsForDates(dates),
    enabled:
      enabled &&
      dates.length > 0 &&
      dates.every((d) => DateTime.fromISO(d).isValid),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const invalidateBookings = () =>
    queryClient.invalidateQueries({ queryKey: ["bookings"], exact: false });

  const saveMutation = useMutation({
    mutationFn: async ({
      booking,
      repeatEndDate,
      guestContact,
      allowOverlap,
    }: SaveBookingRequest): Promise<SaveBookingOutcome> => {
      const input = toBookingInput(booking);
      const options = { allowOverlap };

      if (booking.id >= 0) {
        return updateBooking(booking.id, input, options);
      }
      if (guestContact) {
        return addGuestBooking(input, guestContact, options);
      }
      if (repeatEndDate) {
        return addRepeatingBookings(input, repeatEndDate, options);
      }
      return addBooking(input, options);
    },
    onSuccess: (outcome) => {
      if (outcome.status === "success") {
        invalidateBookings();
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({
      id,
      deleteFollowing = false,
    }: {
      id: number;
      deleteFollowing?: boolean;
    }) => {
      const response = await removeBooking(id, deleteFollowing);
      if (response.status !== "success") {
        throw new Error(
          response.status === "error"
            ? response.error
            : "Varauksen poisto epäonnistui"
        );
      }
      return response.result;
    },
    onSuccess: invalidateBookings,
  });

  return {
    bookings,
    isLoading,
    isError,
    error,
    refetch,
    saveBooking: saveMutation.mutateAsync,
    removeBooking: removeMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
};
