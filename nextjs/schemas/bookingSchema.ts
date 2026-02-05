import { z } from "zod";
import { FlightType, Plane } from "@/types/bookings";

/**
 * Zod schema for booking validation
 */
const bookingBaseSchema = z.object({
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
  ).refine(
    (val) => {
      const date = new Date(val);
      return date.getMinutes() === 0 && date.getSeconds() === 0;
    },
    { message: "Aloitusajan tulee olla tasatunti (esim. 10:00)" }
  ),
  end_time: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Virheellinen lopetusaika" }
  ).refine(
    (val) => {
      const date = new Date(val);
      return date.getMinutes() === 0 && date.getSeconds() === 0;
    },
    { message: "Lopetusajan tulee olla tasatunti (esim. 11:00)" }
  ),
  full_name: z.string().optional(),
});

export const bookingSchema = bookingBaseSchema.refine(
  (data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    return end > start;
  },
  {
    message: "Lopetusajan tulee olla aloitusaikaa myöhemmin",
    path: ["end_time"],
  }
).refine(
  (data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours >= 1;
  },
  {
    message: "Varauksen tulee olla vähintään 1 tunti",
    path: ["end_time"],
  }
);

export type BookingFormValues = z.infer<typeof bookingSchema>;

/**
 * Create mode schema (without id validation)
 */
export const createBookingSchema = bookingBaseSchema
  .omit({ id: true, full_name: true })
  .refine(
    (data) => {
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      return end > start;
    },
    {
      message: "Lopetusajan tulee olla aloitusaikaa myöhemmin",
      path: ["end_time"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return durationHours >= 1;
    },
    {
      message: "Varauksen tulee olla vähintään 1 tunti",
      path: ["end_time"],
    }
  );

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

/**
 * Guest booking schema (without user_id, with contact info)
 */
export const guestBookingSchema = z.object({
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
  ).refine(
    (val) => {
      const date = new Date(val);
      return date.getMinutes() === 0 && date.getSeconds() === 0;
    },
    { message: "Aloitusajan tulee olla tasatunti (esim. 10:00)" }
  ),
  end_time: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Virheellinen lopetusaika" }
  ).refine(
    (val) => {
      const date = new Date(val);
      return date.getMinutes() === 0 && date.getSeconds() === 0;
    },
    { message: "Lopetusajan tulee olla tasatunti (esim. 11:00)" }
  ),
  contactName: z
    .string()
    .min(1, "Nimi vaaditaan")
    .max(100, "Nimi voi olla enintään 100 merkkiä"),
  contactEmail: z
    .string()
    .email("Virheellinen sähköpostiosoite")
    .min(1, "Sähköposti vaaditaan"),
  contactPhone: z
    .string()
    .min(1, "Puhelinnumero vaaditaan")
    .regex(/^[+\d\s()-]+$/, "Virheellinen puhelinnumero"),
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
).refine(
  (data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours >= 1;
  },
  {
    message: "Varauksen tulee olla vähintään 1 tunti",
    path: ["end_time"],
  }
);

export type GuestBookingFormValues = z.infer<typeof guestBookingSchema>;
