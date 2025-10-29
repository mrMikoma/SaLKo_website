import { z } from "zod";
import { FlightType, Plane } from "@/types/bookings";

/**
 * Zod schema for booking validation
 */
export const bookingSchema = z.object({
  id: z.number().int().min(-1),
  user_id: z.string().min(1, "Käyttäjätunnus vaaditaan"),
  plane: z.nativeEnum(Plane, {
    message: "Valitse lentokone",
  }),
  type: z.nativeEnum(FlightType, {
    message: "Valitse lennon tyyppi",
  }),
  title: z
    .string()
    .min(1, "Otsikko vaaditaan")
    .max(100, "Otsikko voi olla enintään 100 merkkiä"),
  description: z
    .string()
    .max(500, "Kuvaus voi olla enintään 500 merkkiä")
    .optional()
    .or(z.literal("")),
  start_time: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Virheellinen aloitusaika" }
  ),
  end_time: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Virheellinen lopetusaika" }
  ),
  full_name: z.string().optional(),
}).refine(
  (data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    return end > start;
  },
  {
    message: "Lopetusajan tulee olla aloitusaikaa myöhemmin",
    path: ["end_time"],
  }
);

export type BookingFormValues = z.infer<typeof bookingSchema>;

/**
 * Create mode schema (without id validation)
 */
export const createBookingSchema = bookingSchema.omit({ id: true, full_name: true });

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;

/**
 * Update mode schema (id is required)
 */
export const updateBookingSchema = bookingSchema.refine(
  (data) => data.id >= 0,
  {
    message: "Varauksen ID vaaditaan päivityksessä",
    path: ["id"],
  }
);

export type UpdateBookingFormValues = z.infer<typeof updateBookingSchema>;
