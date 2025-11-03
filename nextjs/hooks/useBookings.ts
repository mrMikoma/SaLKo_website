import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DateTime } from "luxon";
import {
  fetchDayBookings,
  addBooking,
  addGuestBooking,
  updateBooking,
  removeBooking,
  BookingType,
} from "@/utilities/bookings";

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];

interface UseBookingsOptions {
  date?: string;
  dates?: string[];
  enabled?: boolean;
  userId?: string;
  userRole?: string;
}

interface FetchBookingsResponse {
  status: string;
  result: BookingType[] | Error;
}

/**
 * Fetches bookings for all planes on a specific date
 */
const fetchBookingsForDate = async (date: string): Promise<BookingType[]> => {
  const promises = PLANES.map((plane) => fetchDayBookings(plane, date));
  const results = await Promise.all(promises);

  const fetchedBookings: BookingType[] = results
    .filter(
      (result): result is FetchBookingsResponse =>
        result.status === "success" &&
        Array.isArray(result.result) &&
        result.result.length > 0
    )
    .flatMap((result) => result.result as BookingType[]);

  return fetchedBookings;
};

/**
 * Fetches bookings for multiple dates
 */
const fetchBookingsForDates = async (dates: string[]): Promise<BookingType[]> => {
  const promises = dates.map((date) => fetchBookingsForDate(date));
  const results = await Promise.all(promises);
  return results.flat();
};

/**
 * Custom hook for managing bookings data with React Query
 * Features:
 * - Automatic caching and revalidation
 * - Optimistic updates with rollback on error
 * - Prefetching for adjacent dates
 * - Loading and error states
 */
export const useBookings = ({ date, dates, enabled = true, userId, userRole }: UseBookingsOptions) => {
  const queryClient = useQueryClient();

  // Determine which mode we're in
  const dateList = dates || (date ? [date] : []);
  const queryKey = dates ? ["bookings", "multiple", dates.join(",")] : ["bookings", date];

  // Fetch bookings for all planes on a specific date or dates
  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => dates ? fetchBookingsForDates(dates) : fetchBookingsForDate(date!),
    enabled: enabled && dateList.length > 0 && dateList.every(d => DateTime.fromISO(d).isValid),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch adjacent dates for smoother navigation (only for single date mode)
  useEffect(() => {
    if (dates || !date || !DateTime.fromISO(date).isValid) return;

    const currentDate = DateTime.fromISO(date);
    const previousDate = currentDate.minus({ days: 1 }).toISODate();
    const nextDate = currentDate.plus({ days: 1 }).toISODate();

    // Prefetch previous day
    if (previousDate) {
      queryClient.prefetchQuery({
        queryKey: ["bookings", previousDate],
        queryFn: () => fetchBookingsForDate(previousDate),
        staleTime: 1000 * 60 * 5,
      });
    }

    // Prefetch next day
    if (nextDate) {
      queryClient.prefetchQuery({
        queryKey: ["bookings", nextDate],
        queryFn: () => fetchBookingsForDate(nextDate),
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [date, dates, queryClient]);

  // Add booking mutation with optimistic update (supports both regular and guest bookings)
  const addBookingMutation = useMutation({
    mutationFn: async (newBooking: BookingType & { contactName?: string; contactEmail?: string; contactPhone?: string }) => {
      // Check if this is a guest booking (no user_id or has guest contact info)
      const isGuestBooking = !newBooking.user_id || (newBooking.contactName && newBooking.contactEmail && newBooking.contactPhone);

      if (isGuestBooking && newBooking.contactName && newBooking.contactEmail && newBooking.contactPhone) {
        // Guest booking
        const response = await addGuestBooking({
          plane: newBooking.plane,
          start_time: newBooking.start_time,
          end_time: newBooking.end_time,
          type: newBooking.type,
          title: newBooking.title,
          description: newBooking.description,
          contactInfo: {
            contactName: newBooking.contactName,
            contactEmail: newBooking.contactEmail,
            contactPhone: newBooking.contactPhone,
          },
        });
        if (response.status !== "success") {
          throw new Error(
            response.data instanceof Error
              ? response.data.message
              : "Failed to add guest booking"
          );
        }
        return { ...newBooking, id: response.bookingId || -1 };
      } else {
        // Regular authenticated booking
        const response = await addBooking({
          user_id: newBooking.user_id,
          plane: newBooking.plane,
          start_time: newBooking.start_time,
          end_time: newBooking.end_time,
          type: newBooking.type,
          title: newBooking.title,
          description: newBooking.description,
        });
        if (response.status !== "success") {
          throw new Error(
            response.data instanceof Error
              ? response.data.message
              : "Failed to add booking"
          );
        }
        return newBooking;
      }
    },
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData<BookingType[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<BookingType[]>(queryKey, (old = []) => [
        ...old,
        newBooking,
      ]);

      return { previousBookings };
    },
    onError: (err, _newBooking, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKey, context.previousBookings);
      }
      console.error("Failed to add booking:", err);
    },
    onSuccess: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  // Remove booking mutation with optimistic update
  const removeBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      if (!userId) {
        throw new Error("User ID is required to delete booking");
      }
      const response = await removeBooking(bookingId, userId, userRole);
      if (response.status !== "success") {
        throw new Error(
          response.result instanceof Error
            ? response.result.message
            : "Failed to remove booking"
        );
      }
      return bookingId;
    },
    onMutate: async (bookingId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousBookings = queryClient.getQueryData<BookingType[]>(queryKey);

      // Optimistically remove booking
      queryClient.setQueryData<BookingType[]>(queryKey, (old = []) =>
        old.filter((booking) => booking.id !== bookingId)
      );

      return { previousBookings };
    },
    onError: (err, _bookingId, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKey, context.previousBookings);
      }
      console.error("Failed to remove booking:", err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (updatedBooking: BookingType) => {
      const response = await updateBooking({
        id: updatedBooking.id,
        user_id: updatedBooking.user_id,
        plane: updatedBooking.plane,
        start_time: updatedBooking.start_time,
        end_time: updatedBooking.end_time,
        type: updatedBooking.type,
        title: updatedBooking.title,
        description: updatedBooking.description,
      });
      if (response.status !== "success") {
        throw new Error(
          response.data instanceof Error
            ? response.data.message
            : "Failed to update booking"
        );
      }
      return response.data as BookingType;
    },
    onMutate: async (updatedBooking) => {
      await queryClient.cancelQueries({ queryKey });

      const previousBookings = queryClient.getQueryData<BookingType[]>(queryKey);

      queryClient.setQueryData<BookingType[]>(queryKey, (old = []) =>
        old.map((booking) =>
          booking.id === updatedBooking.id ? updatedBooking : booking
        )
      );

      return { previousBookings };
    },
    onError: (err, _updatedBooking, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(queryKey, context.previousBookings);
      }
      console.error("Failed to update booking:", err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return {
    bookings,
    isLoading,
    isError,
    error,
    refetch,
    addBooking: addBookingMutation.mutate,
    removeBooking: removeBookingMutation.mutate,
    updateBooking: updateBookingMutation.mutate,
    isAddingBooking: addBookingMutation.isPending,
    isRemovingBooking: removeBookingMutation.isPending,
    isUpdatingBooking: updateBookingMutation.isPending,
    addBookingError: addBookingMutation.error,
    removeBookingError: removeBookingMutation.error,
    updateBookingError: updateBookingMutation.error,
  };
};
