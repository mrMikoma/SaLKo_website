import { z } from "zod"

// Schema for creating a new flight log
export const flightLogSchema = z
  .object({
    aircraftRegistration: z
      .string()
      .min(1, "Lentokoneen rekisteritunnus vaaditaan")
      .regex(
        /^OH-[A-Z0-9]+$/,
        "Virheellinen rekisteritunnus (esim. OH-ABC)"
      ),
    date: z
      .string()
      .min(1, "Päivämäärä vaaditaan")
      .refine(
        (date) => {
          const parsed = new Date(date)
          return !isNaN(parsed.getTime())
        },
        { message: "Virheellinen päivämäärä" }
      )
      .refine(
        (date) => {
          const parsed = new Date(date)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return parsed <= today
        },
        { message: "Päivämäärä ei voi olla tulevaisuudessa" }
      ),
    hobbsStart: z
      .number()
      .min(0, "Hobbs-aloitus ei voi olla negatiivinen")
      .max(99999.9, "Hobbs-arvo liian suuri"),
    hobbsEnd: z
      .number()
      .min(0, "Hobbs-lopetus ei voi olla negatiivinen")
      .max(99999.9, "Hobbs-arvo liian suuri"),
    flightType: z.enum(
      ["training", "solo", "checkout", "cross_country", "local", "maintenance", "other"],
      "Valitse lentotyyppi"
    ),
    remarks: z
      .string()
      .max(500, "Huomautukset voivat olla enintään 500 merkkiä")
      .optional(),
  })
  .refine((data) => data.hobbsEnd > data.hobbsStart, {
    message: "Hobbs-lopetus pitää olla suurempi kuin Hobbs-aloitus",
    path: ["hobbsEnd"],
  })
  .refine(
    (data) => {
      const flightMinutes = (data.hobbsEnd - data.hobbsStart) * 60
      return flightMinutes >= 1
    },
    {
      message: "Lennon kesto pitää olla vähintään 1 minuutti",
      path: ["hobbsEnd"],
    }
  )
  .refine(
    (data) => {
      const flightMinutes = (data.hobbsEnd - data.hobbsStart) * 60
      return flightMinutes <= 720 // 12 hours max
    },
    {
      message: "Lennon kesto ei voi ylittää 12 tuntia",
      path: ["hobbsEnd"],
    }
  )

// Schema for creating non-flight billable items
export const billableItemSchema = z
  .object({
    billableType: z.enum(
      ["membership", "hangar", "instruction", "other"],
      "Valitse laskutustyyppi"
    ),
    memberId: z.string().min(1, "Jäsen-ID vaaditaan"),
    description: z
      .string()
      .min(1, "Kuvaus vaaditaan")
      .max(255, "Kuvaus voi olla enintään 255 merkkiä"),
    billingPeriod: z.enum(
      ["one_time", "monthly", "quarterly", "yearly"],
      "Valitse laskutusjakso"
    ),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    quantity: z
      .number()
      .min(0.01, "Määrä pitää olla positiivinen")
      .max(9999, "Määrä liian suuri"),
    unitPrice: z
      .number()
      .min(0, "Yksikköhinta ei voi olla negatiivinen")
      .max(99999.99, "Yksikköhinta liian suuri"),
    unitLabel: z
      .string()
      .max(50, "Yksikkölabel voi olla enintään 50 merkkiä")
      .optional(),
    itemDate: z.string().min(1, "Päivämäärä vaaditaan"),
    notes: z
      .string()
      .max(1000, "Muistiinpanot voivat olla enintään 1000 merkkiä")
      .optional(),
  })
  .refine(
    (data) => {
      // If billing period is not one_time, require periodStart
      if (data.billingPeriod !== "one_time" && !data.periodStart) {
        return false
      }
      return true
    },
    {
      message: "Jakson aloituspäivämäärä vaaditaan toistuvalle laskulle",
      path: ["periodStart"],
    }
  )
  .refine(
    (data) => {
      // If periodStart is provided, periodEnd must be >= periodStart
      if (data.periodStart && data.periodEnd) {
        return new Date(data.periodEnd) >= new Date(data.periodStart)
      }
      return true
    },
    {
      message: "Jakson loppu pitää olla jakson alun jälkeen",
      path: ["periodEnd"],
    }
  )

// Schema for updating payment status
export const paymentStatusUpdateSchema = z.object({
  billableItemId: z.string().min(1, "Laskutuserä-ID vaaditaan"),
  newStatus: z.enum(
    ["recorded", "checked", "invoiced", "paid"],
    "Virheellinen maksun tila"
  ),
  invoiceRef: z
    .string()
    .max(100, "Laskuviite voi olla enintään 100 merkkiä")
    .optional(),
})

// Inferred types from schemas
export type FlightLogFormData = z.infer<typeof flightLogSchema>
export type BillableItemFormData = z.infer<typeof billableItemSchema>
export type PaymentStatusUpdateFormData = z.infer<
  typeof paymentStatusUpdateSchema
>
