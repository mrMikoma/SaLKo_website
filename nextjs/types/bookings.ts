/**
 * Booking Types and Enums
 * Centralized type definitions for booking-related data structures
 */

import { BookingType as BookingTypeFromUtils } from "@/utilities/bookings";

// Re-export BookingType from utilities for consistency
export type BookingType = BookingTypeFromUtils;

/**
 * Flight type enum for better type safety
 */
export enum FlightType {
  LOCAL = "local",
  TRIP = "trip",
  TRAINING = "training",
  MAINTENANCE = "maintenance",
  FIRE = "fire",
  OTHER = "other",
}

/**
 * Plane enum for available aircraft
 */
export enum Plane {
  OH_CON = "OH-CON",
  OH_386 = "OH-386",
  OH_816 = "OH-816",
  OH_829 = "OH-829",
  OH_475 = "OH-475",
  OH_PDX = "OH-PDX",
}

/**
 * Modal mode enum for booking modal states
 */
export enum ModalMode {
  CREATE = "create",
  UPDATE = "update",
  VIEW = "view",
}

/**
 * Flight type configuration with display properties
 */
export interface FlightTypeConfig {
  type: FlightType;
  label: string;
  color: string;
  priority: number;
}

/**
 * Complete flight type configurations
 */
export const FLIGHT_TYPE_CONFIGS: readonly FlightTypeConfig[] = [
  {
    type: FlightType.LOCAL,
    label: "Paikallislento",
    color: "#90EE90",
    priority: 3,
  },
  {
    type: FlightType.TRIP,
    label: "Matkalento",
    color: "#87CEEB",
    priority: 3,
  },
  {
    type: FlightType.TRAINING,
    label: "Koululento",
    color: "#ADD8E6",
    priority: 2,
  },
  {
    type: FlightType.MAINTENANCE,
    label: "Huolto",
    color: "#FFB6C1",
    priority: 1,
  },
  {
    type: FlightType.FIRE,
    label: "Palolento",
    color: "#FFA500",
    priority: 1,
  },
  {
    type: FlightType.OTHER,
    label: "Muu lento",
    color: "#D3D3D3",
    priority: 2,
  },
] as const;

/**
 * Available planes array
 */
export const PLANES = Object.values(Plane) as readonly string[];

/**
 * Type guard to check if a string is a valid FlightType
 */
export const isFlightType = (value: string): value is FlightType => {
  return Object.values(FlightType).includes(value as FlightType);
};

/**
 * Type guard to check if a string is a valid Plane
 */
export const isPlane = (value: string): value is Plane => {
  return Object.values(Plane).includes(value as Plane);
};

/**
 * Booking form data (subset of BookingType used in forms)
 */
export type BookingFormData = Pick<
  BookingType,
  "title" | "type" | "plane" | "start_time" | "end_time" | "description"
>;

/**
 * Booking with optional fields (for creation)
 */
export type PartialBooking = Partial<BookingType>;

/**
 * API Response types
 */
export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

export interface ApiErrorResponse {
  status: "error";
  error: string | Error;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Query filter for bookings
 */
export interface BookingFilter {
  plane?: Plane;
  type?: FlightType;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Booking statistics
 */
export interface BookingStats {
  totalBookings: number;
  bookingsByType: Record<FlightType, number>;
  bookingsByPlane: Record<Plane, number>;
  averageDuration: number;
}
