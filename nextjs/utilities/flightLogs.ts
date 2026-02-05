"use server"

import pool from "@/utilities/db"
import { auth } from "@/auth"
import { hasPermission } from "@/utilities/roles"
import { revalidatePath } from "next/cache"
import { DateTime } from "luxon"
import {
  appendFlightLog,
  generateNextLogId,
  getLatestHobbs,
  FlightLogEntry as SheetFlightLogEntry,
} from "@/utilities/googleSheets"
import {
  flightLogSchema,
  type FlightLogFormData,
} from "@/schemas/flightLogSchema"
import type {
  Aircraft,
  BillableItem,
  FlightLogEntry,
  FlightLogResponse,
  FlightWithBilling,
  MemberFlightSummary,
} from "@/types/flightLog"
import planesData from "@/data/planes.json"
import pricesData from "@/data/prices.json"

// Type for plane data from JSON
interface PlaneJson {
  registeration: string
  name: string
  nickname: string | null
  description: string
  specs: Record<string, string>
  links: { text: string; url: string }[]
  images: { src: string; alt: string }[]
}

// Type for aircraft rental rate from prices.json
interface AircraftRentalRate {
  registration: string
  model: string
  type: string
  pricePerMinuteWithEquipmentFee: string
  pricePerMinuteWithoutEquipmentFee: string
  pricePerHourWithEquipmentFee: string
  pricePerHourWithoutEquipmentFee: string
  notes?: string
}

// Helper to get rental rate for an aircraft
function getRentalRate(registration: string): number {
  const rate = pricesData.aircraftRentalRates.find(
    (r) => "registration" in r && r.registration === registration
  ) as AircraftRentalRate | undefined

  if (!rate) return 0
  return parseFloat(rate.pricePerMinuteWithEquipmentFee.replace("~", "")) || 0
}

// Get all aircraft from JSON files
export async function getAircraft(): Promise<Aircraft[]> {
  const planes = planesData as PlaneJson[]

  return planes.map((plane) => {
    const minuteRate = getRentalRate(plane.registeration)

    return {
      id: plane.registeration,
      registration: plane.registeration,
      name: plane.name,
      minuteRate,
      hourlyRate: minuteRate * 60,
      active: true,
      createdAt: "",
      updatedAt: "",
    }
  })
}

// Get a single aircraft by registration from JSON files
export async function getAircraftByRegistration(
  registration: string
): Promise<Aircraft | null> {
  const planes = planesData as PlaneJson[]
  const plane = planes.find((p) => p.registeration === registration)

  if (!plane) {
    return null
  }

  const minuteRate = getRentalRate(registration)

  return {
    id: registration,
    registration: plane.registeration,
    name: plane.name,
    minuteRate,
    hourlyRate: minuteRate * 60,
    active: true,
    createdAt: "",
    updatedAt: "",
  }
}

// Log a new flight
export async function logFlight(
  data: FlightLogFormData
): Promise<FlightLogResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: "error", error: "Kirjaudu sisään" }
    }

    if (!hasPermission(session.user.roles, "LOG_OWN_FLIGHT")) {
      return { status: "error", error: "Ei oikeuksia kirjata lentoja" }
    }

    // Validate input
    const validated = flightLogSchema.safeParse(data)
    if (!validated.success) {
      return {
        status: "error",
        error: validated.error.issues[0].message,
      }
    }

    const { aircraftRegistration, date, hobbsStart, hobbsEnd, flightType, remarks } =
      validated.data

    // Get aircraft pricing
    const aircraft = await getAircraftByRegistration(aircraftRegistration)
    if (!aircraft) {
      return { status: "error", error: "Lentokonetta ei löydy" }
    }

    // Calculate flight duration and cost
    const flightMinutes = Math.round((hobbsEnd - hobbsStart) * 60)
    const totalPrice = flightMinutes * aircraft.minuteRate

    // Generate log ID
    const logId = await generateNextLogId(aircraftRegistration)

    // Get pilot name from database
    const userResult = await pool.query(
      "SELECT full_name, email FROM users WHERE id = $1",
      [session.user.id]
    )
    const pilotName = userResult.rows[0]?.full_name || session.user.name || "Unknown"
    const createdBy = userResult.rows[0]?.email || "app"

    const now = DateTime.now().setZone("Europe/Helsinki").toISO()

    // Create flight log entry
    const flightEntry: SheetFlightLogEntry = {
      logId,
      date,
      pilotId: session.user.id,
      pilotName,
      hobbsStart,
      hobbsEnd,
      flightMinutes,
      flightType,
      remarks,
      createdAt: now!,
      createdBy,
    }

    // Append to Google Sheet
    const sheetResult = await appendFlightLog(aircraftRegistration, flightEntry)
    if (!sheetResult.success) {
      return {
        status: "error",
        error: `Virhe Google Sheets -kirjauksessa: ${sheetResult.error}`,
      }
    }

    // Create billable item in PostgreSQL
    await pool.query(
      `INSERT INTO billable_items (
        billable_type, member_id, external_ref, description,
        quantity, unit_price, unit_label, total_price,
        aircraft_registration, item_date, notes, created_at, updated_at
      ) VALUES (
        'flight', $1, $2, $3,
        $4, $5, 'minuuttia', $6,
        $7, $8, $9, NOW(), NOW()
      )`,
      [
        session.user.id,
        logId,
        `Lento ${aircraftRegistration} - ${date}`,
        flightMinutes,
        aircraft.minuteRate,
        totalPrice,
        aircraftRegistration,
        date,
        remarks || null,
      ]
    )

    revalidatePath("/jasenalue/lentopaivakirja")

    return {
      status: "success",
      result: {
        logId,
        date,
        pilotId: session.user.id,
        pilotName,
        hobbsStart,
        hobbsEnd,
        flightMinutes,
        flightType: flightType as FlightLogEntry["flightType"],
        remarks,
        createdAt: now!,
        createdBy,
      },
    }
  } catch (error) {
    console.error("Error logging flight:", error)
    return { status: "error", error: "Lennon kirjaus epäonnistui" }
  }
}

// Get flight logs for the current user
export async function getMyFlightLogs(): Promise<FlightWithBilling[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return []
    }

    if (!hasPermission(session.user.roles, "VIEW_OWN_FLIGHTS")) {
      return []
    }

    // Get all billable items for this user that are flights
    const result = await pool.query(
      `SELECT * FROM billable_items
       WHERE member_id = $1 AND billable_type = 'flight'
       ORDER BY item_date DESC, created_at DESC`,
      [session.user.id]
    )

    // Get aircraft details from JSON for each flight
    const planes = planesData as PlaneJson[]

    return result.rows.map((row) => {
      const plane = planes.find((p) => p.registeration === row.aircraft_registration)

      return {
        logId: row.external_ref || "",
        date: row.item_date,
        pilotId: row.member_id,
        pilotName: "",
        hobbsStart: 0,
        hobbsEnd: 0,
        flightMinutes: parseFloat(row.quantity),
        flightType: "local" as FlightLogEntry["flightType"],
        remarks: row.notes,
        createdAt: row.created_at,
        createdBy: "",
        billableItem: {
          id: row.id,
          billableType: row.billable_type,
          memberId: row.member_id,
          externalRef: row.external_ref,
          description: row.description,
          billingPeriod: row.billing_period,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          quantity: parseFloat(row.quantity),
          unitPrice: parseFloat(row.unit_price),
          unitLabel: row.unit_label,
          totalPrice: parseFloat(row.total_price),
          paymentStatus: row.payment_status,
          checkedAt: row.checked_at,
          checkedBy: row.checked_by,
          invoicedAt: row.invoiced_at,
          invoicedBy: row.invoiced_by,
          invoiceRef: row.invoice_ref,
          paidAt: row.paid_at,
          paidMarkedBy: row.paid_marked_by,
          aircraftId: row.aircraft_registration,
          itemDate: row.item_date,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        aircraft: row.aircraft_registration
          ? {
              id: row.aircraft_registration,
              registration: row.aircraft_registration,
              name: plane?.name || row.aircraft_registration,
              minuteRate: getRentalRate(row.aircraft_registration),
              hourlyRate: getRentalRate(row.aircraft_registration) * 60,
              active: true,
              createdAt: "",
              updatedAt: "",
            }
          : undefined,
      }
    })
  } catch (error) {
    console.error("Error fetching flight logs:", error)
    return []
  }
}

// Get flight summary for the current user
export async function getMyFlightSummary(): Promise<MemberFlightSummary | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return null
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_flights,
        COALESCE(SUM(quantity), 0) as total_minutes,
        COALESCE(SUM(total_price), 0) as total_cost,
        COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_price ELSE 0 END), 0) as unpaid_amount,
        MAX(item_date) as last_flight_date
       FROM billable_items
       WHERE member_id = $1 AND billable_type = 'flight'`,
      [session.user.id]
    )

    const row = result.rows[0]
    return {
      totalFlights: parseInt(row.total_flights, 10),
      totalMinutes: parseFloat(row.total_minutes),
      totalCost: parseFloat(row.total_cost),
      unpaidAmount: parseFloat(row.unpaid_amount),
      lastFlightDate: row.last_flight_date || undefined,
    }
  } catch (error) {
    console.error("Error fetching flight summary:", error)
    return null
  }
}

// Get latest Hobbs reading for an aircraft
export async function getAircraftLatestHobbs(
  registration: string
): Promise<number | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return null
    }

    return await getLatestHobbs(registration)
  } catch (error) {
    console.error("Error fetching latest Hobbs:", error)
    return null
  }
}

// Get all billable items for the current user (flights and other charges)
export async function getMyBillingItems(): Promise<BillableItem[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return []
    }

    if (!hasPermission(session.user.roles, "VIEW_OWN_BILLING")) {
      return []
    }

    const result = await pool.query(
      `SELECT * FROM billable_items
       WHERE member_id = $1
       ORDER BY item_date DESC, created_at DESC`,
      [session.user.id]
    )

    return result.rows.map((row) => ({
      id: row.id,
      billableType: row.billable_type,
      memberId: row.member_id,
      externalRef: row.external_ref,
      description: row.description,
      billingPeriod: row.billing_period,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      unitLabel: row.unit_label,
      totalPrice: parseFloat(row.total_price),
      paymentStatus: row.payment_status,
      checkedAt: row.checked_at,
      checkedBy: row.checked_by,
      invoicedAt: row.invoiced_at,
      invoicedBy: row.invoiced_by,
      invoiceRef: row.invoice_ref,
      paidAt: row.paid_at,
      paidMarkedBy: row.paid_marked_by,
      aircraftId: row.aircraft_id,
      itemDate: row.item_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error("Error fetching billing items:", error)
    return []
  }
}

// Get billing summary for the current user
export async function getMyBillingSummary(): Promise<{
  totalUnpaid: number
  itemsByStatus: Record<string, number>
} | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return null
    }

    const result = await pool.query(
      `SELECT
        payment_status,
        SUM(total_price) as total
       FROM billable_items
       WHERE member_id = $1
       GROUP BY payment_status`,
      [session.user.id]
    )

    const itemsByStatus: Record<string, number> = {}
    let totalUnpaid = 0

    for (const row of result.rows) {
      itemsByStatus[row.payment_status] = parseFloat(row.total)
      if (row.payment_status !== "paid") {
        totalUnpaid += parseFloat(row.total)
      }
    }

    return { totalUnpaid, itemsByStatus }
  } catch (error) {
    console.error("Error fetching billing summary:", error)
    return null
  }
}
