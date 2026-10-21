import { z } from "zod";
import { DateTime } from "@/utilities/clubTime";
import { FlightType } from "@/types/bookings";
import { isBookablePlane } from "@/utilities/planeHelpers";

/*
 * Shared fields. The form schemas below validate the booking modal; the input
 * schemas validate the same data again in the server actions.
 */

const planeField = z.string().refine(isBookablePlane, {
  message: "Valitse lentokone",
});

const typeField = z.nativeEnum(FlightType, {
  message: "Valitse lennon tyyppi",
});

const titleField = z
  .string()
  .trim()
  .min(1, "Otsikko vaaditaan")
  .max(100, "Otsikko voi olla enintään 100 merkkiä");

const descriptionField = z
  .string()
  .max(500, "Kuvaus voi olla enintään 500 merkkiä")
  .optional()
  .or(z.literal(""));

// Bookings start and end on the hour, in club time
const onTheHour = (value: string) => {
  const time = DateTime.fromISO(value);
  return time.minute === 0 && time.second === 0;
};

const startTimeField = z
  .string()
  .refine((value) => DateTime.fromISO(value).isValid, {
    message: "Virheellinen aloitusaika",
  })
  .refine(onTheHour, {
    message: "Aloitusajan tulee olla tasatunti (esim. 10:00)",
  });

const endTimeField = z
  .string()
  .refine((value) => DateTime.fromISO(value).isValid, {
    message: "Virheellinen lopetusaika",
  })
  .refine(onTheHour, {
    message: "Lopetusajan tulee olla tasatunti (esim. 11:00)",
  });

type TimeRange = { start_time: string; end_time: string };

const endsAfterStart = (data: TimeRange) =>
  DateTime.fromISO(data.end_time) > DateTime.fromISO(data.start_time);

const lastsAtLeastAnHour = (data: TimeRange) =>
  DateTime.fromISO(data.end_time).diff(DateTime.fromISO(data.start_time), "hours")
    .hours >= 1;

const endsAfterStartIssue = {
  message: "Lopetusajan tulee olla aloitusaikaa myöhemmin",
  path: ["end_time"],
};

const lastsAtLeastAnHourIssue = {
  message: "Varauksen tulee olla vähintään 1 tunti",
  path: ["end_time"],
};

const guestContactFields = {
  contactName: z
    .string()
    .trim()
    .min(1, "Nimi vaaditaan")
    .max(100, "Nimi voi olla enintään 100 merkkiä"),
  contactEmail: z
    .string()
    .trim()
    .email("Virheellinen sähköpostiosoite")
    .max(254, "Sähköposti on liian pitkä"),
  contactPhone: z
    .string()
    .trim()
    .min(1, "Puhelinnumero vaaditaan")
    .max(30, "Puhelinnumero on liian pitkä")
    .regex(/^[+\d\s()-]+$/, "Virheellinen puhelinnumero"),
};

/*
 * Booking modal forms
 */

export const bookingSchema = z
  .object({
    id: z.number().int().min(-1),
    user_id: z.string().min(1, "Käyttäjätunnus vaaditaan"),
    plane: planeField,
    type: typeField,
    title: titleField,
    description: descriptionField,
    start_time: startTimeField,
    end_time: endTimeField,
    full_name: z.string().optional(),
  })
  .refine(endsAfterStart, endsAfterStartIssue)
  .refine(lastsAtLeastAnHour, lastsAtLeastAnHourIssue);

export type BookingFormValues = z.infer<typeof bookingSchema>;

export const guestBookingSchema = z
  .object({
    plane: planeField,
    type: typeField,
    title: titleField,
    description: descriptionField,
    start_time: startTimeField,
    end_time: endTimeField,
    ...guestContactFields,
  })
  .refine(endsAfterStart, endsAfterStartIssue)
  .refine(lastsAtLeastAnHour, lastsAtLeastAnHourIssue);

export type GuestBookingFormValues = z.infer<typeof guestBookingSchema>;

/*
 * Server action input
 */

export const bookingInputSchema = z
  .object({
    plane: planeField,
    type: typeField,
    title: titleField,
    description: descriptionField,
    start_time: startTimeField,
    end_time: endTimeField,
  })
  .refine(endsAfterStart, endsAfterStartIssue)
  .refine(lastsAtLeastAnHour, lastsAtLeastAnHourIssue);

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const guestContactSchema = z.object(guestContactFields);

export type GuestContactInput = z.infer<typeof guestContactSchema>;

export const repeatEndDateSchema = z
  .string()
  .refine((value) => DateTime.fromISO(value).isValid, {
    message: "Virheellinen toiston lopetuspäivä",
  });
