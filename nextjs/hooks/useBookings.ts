import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DateTime } from "luxon";
import {
  fetchDayBookings,
  addBooking,
  removeBooking,
  BookingType,
} from "@/utilities/bookings";

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];

interface UseBookingsOptions {
  date: string;
  enabled?: boolean;
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
 * Custom hook for managing bookings data with React Query
 * Features:
 * - Automatic caching and revalidation
 * - Optimistic updates with rollback on error
 * - Prefetching for adjacent dates
 * - Loading and error states
 */
export const useBookings = ({ date, enabled = true }: UseBookingsOptions) => {
  const queryClient = useQueryClient();

  // Fetch bookings for all planes on a specific date
  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookings", date],
    queryFn: () => fetchBookingsForDate(date),
    enabled: enabled && DateTime.fromISO(date).isValid,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch adjacent dates for smoother navigation
  useEffect(() => {
    if (!date || !DateTime.fromISO(date).isValid) return;

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
  }, [date, queryClient]);

  // Add booking mutation with optimistic update
  const addBookingMutation = useMutation({
    mutationFn: async (newBooking: BookingType) => {
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
    },
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["bookings", date] });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData<BookingType[]>([
        "bookings",
        date,
      ]);

      // Optimistically update
      queryClient.setQueryData<BookingType[]>(["bookings", date], (old = []) => [
        ...old,
        newBooking,
      ]);

      return { previousBookings };
    },
    onError: (err, _newBooking, context) => {
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings", date], context.previousBookings);
      }
      console.error("Failed to add booking:", err);
    },
    onSuccess: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["bookings", date] });
    },
  });

  // Remove booking mutation with optimistic update
  const removeBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await removeBooking(bookingId);
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
      await queryClient.cancelQueries({ queryKey: ["bookings", date] });

      const previousBookings = queryClient.getQueryData<BookingType[]>([
        "bookings",
        date,
      ]);

      // Optimistically remove booking
      queryClient.setQueryData<BookingType[]>(["bookings", date], (old = []) =>
        old.filter((booking) => booking.id !== bookingId)
      );

      return { previousBookings };
    },
    onError: (err, _bookingId, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings", date], context.previousBookings);
      }
      console.error("Failed to remove booking:", err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", date] });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (updatedBooking: BookingType) => {
      // Note: You'll need to implement updateBooking in utilities/bookings
      // For now, this is a placeholder that should be implemented
      throw new Error("Update booking API not yet implemented");
    },
    onMutate: async (updatedBooking) => {
      await queryClient.cancelQueries({ queryKey: ["bookings", date] });

      const previousBookings = queryClient.getQueryData<BookingType[]>([
        "bookings",
        date,
      ]);

      queryClient.setQueryData<BookingType[]>(["bookings", date], (old = []) =>
        old.map((booking) =>
          booking.id === updatedBooking.id ? updatedBooking : booking
        )
      );

      return { previousBookings };
    },
    onError: (err, _updatedBooking, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings", date], context.previousBookings);
      }
      console.error("Failed to update booking:", err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", date] });
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
