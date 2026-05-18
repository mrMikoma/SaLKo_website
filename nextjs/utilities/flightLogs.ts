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
  flightLogEditSchema,
  type FlightLogFormData,
  type FlightLogEditFormData,
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

interface PlaneJson {
  registeration: string
  name: string
  nickname: string | null
  description: string
  specs: Record<string, string>
  links: { text: string; url: string }[]
  images: { src: string; alt: string }[]
}

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

function getRentalRate(registration: string): number {
  const rate = pricesData.aircraftRentalRates.find(
    (r) => "registration" in r && r.registration === registration
  ) as AircraftRentalRate | undefined

  if (!rate) return 0
  return parseFloat(rate.pricePerMinuteWithEquipmentFee.replace("~", "")) || 0
}

function rowToFlightWithBilling(
  row: Record<string, unknown>,
  planes: PlaneJson[]
): FlightWithBilling {
  const registration = row.aircraft_registration as string | null
  const plane = registration
    ? planes.find((p) => p.registeration === registration)
    : undefined

  return {
    logId: (row.external_ref as string) || "",
    date: row.item_date as string,
    pilotId: row.member_id as string,
    pilotName: "",
    hobbsStart: row.hobbs_start != null ? parseFloat(row.hobbs_start as string) : 0,
    hobbsEnd: row.hobbs_end != null ? parseFloat(row.hobbs_end as string) : 0,
    flightMinutes: parseFloat(row.quantity as string),
    flightType: (row.flight_type as FlightLogEntry["flightType"]) || "local",
    departureIcao: (row.departure_icao as string) || undefined,
    arrivalIcao: (row.arrival_icao as string) || undefined,
    landings: row.landings != null ? (row.landings as number) : undefined,
    remarks: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    createdBy: "",
    billableItem: {
      id: row.id as string,
      billableType: row.billable_type as BillableItem["billableType"],
      memberId: row.member_id as string,
      externalRef: row.external_ref as string | undefined,
      description: row.description as string,
      billingPeriod: row.billing_period as BillableItem["billingPeriod"],
      periodStart: row.period_start as string | undefined,
      periodEnd: row.period_end as string | undefined,
      quantity: parseFloat(row.quantity as string),
      unitPrice: parseFloat(row.unit_price as string),
      unitLabel: row.unit_label as string | undefined,
      totalPrice: parseFloat(row.total_price as string),
      paymentStatus: row.payment_status as BillableItem["paymentStatus"],
      checkedAt: row.checked_at as string | undefined,
      checkedBy: row.checked_by as string | undefined,
      invoicedAt: row.invoiced_at as string | undefined,
      invoicedBy: row.invoiced_by as string | undefined,
      invoiceRef: row.invoice_ref as string | undefined,
      paidAt: row.paid_at as string | undefined,
      paidMarkedBy: row.paid_marked_by as string | undefined,
      aircraftId: registration || undefined,
      itemDate: row.item_date as string,
      notes: row.notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    },
    aircraft: registration
      ? {
          id: registration,
          registration,
          name: plane?.name || registration,
          minuteRate: getRentalRate(registration),
          hourlyRate: getRentalRate(registration) * 60,
          active: true,
          createdAt: "",
          updatedAt: "",
        }
      : undefined,
  }
}

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

    const validated = flightLogSchema.safeParse(data)
    if (!validated.success) {
      return {
        status: "error",
        error: validated.error.issues[0].message,
      }
    }

    const {
      aircraftRegistration,
      date,
      hobbsStart,
      hobbsEnd,
      flightType,
      departureIcao,
      arrivalIcao,
      landings,
      remarks,
    } = validated.data

    const aircraft = await getAircraftByRegistration(aircraftRegistration)
    if (!aircraft) {
      return { status: "error", error: "Lentokonetta ei löydy" }
    }

    const flightMinutes = Math.round((hobbsEnd - hobbsStart) * 60)
    const totalPrice = flightMinutes * aircraft.minuteRate

    const logId = await generateNextLogId(aircraftRegistration)

    const userResult = await pool.query(
      "SELECT full_name, email FROM users WHERE id = $1",
      [session.user.id]
    )
    const pilotName =
      userResult.rows[0]?.full_name || session.user.name || "Unknown"
    const createdBy = userResult.rows[0]?.email || "app"

    const now = DateTime.now().setZone("Europe/Helsinki").toISO()

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

    const sheetResult = await appendFlightLog(aircraftRegistration, flightEntry)
    if (!sheetResult.success) {
      return {
        status: "error",
        error: `Virhe Google Sheets -kirjauksessa: ${sheetResult.error}`,
      }
    }

    await pool.query(
      `INSERT INTO billable_items (
        billable_type, member_id, external_ref, description,
        quantity, unit_price, unit_label, total_price,
        aircraft_registration, item_date, notes,
        hobbs_start, hobbs_end, flight_type,
        departure_icao, arrival_icao, landings,
        created_at, updated_at
      ) VALUES (
        'flight', $1, $2, $3,
        $4, $5, 'minuuttia', $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        NOW(), NOW()
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
        hobbsStart,
        hobbsEnd,
        flightType,
        departureIcao || null,
        arrivalIcao || null,
        landings ?? null,
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
        departureIcao: departureIcao || undefined,
        arrivalIcao: arrivalIcao || undefined,
        landings: landings ?? undefined,
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

export async function editFlightLog(
  billableItemId: string,
  data: FlightLogEditFormData
): Promise<{ status: "success" | "error"; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: "error", error: "Kirjaudu sisään" }
    }

    const validated = flightLogEditSchema.safeParse(data)
    if (!validated.success) {
      return { status: "error", error: validated.error.issues[0].message }
    }

    const existing = await pool.query(
      `SELECT member_id, payment_status, hobbs_start, aircraft_registration
       FROM billable_items
       WHERE id = $1 AND deleted_at IS NULL`,
      [billableItemId]
    )

    if (existing.rows.length === 0) {
      return { status: "error", error: "Kirjausta ei löydy" }
    }

    const row = existing.rows[0]
    const isAdmin = hasPermission(session.user.roles, "ADMIN")

    if (row.member_id !== session.user.id && !isAdmin) {
      return { status: "error", error: "Ei oikeuksia muokata tätä kirjausta" }
    }

    if (row.payment_status !== "recorded" && !isAdmin) {
      return {
        status: "error",
        error: "Kirjausta ei voi muokata enää (tila on muuttunut)",
      }
    }

    const {
      hobbsEnd,
      flightType,
      departureIcao,
      arrivalIcao,
      landings,
      remarks,
    } = validated.data

    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (hobbsEnd !== undefined) {
      const hobbsStart = parseFloat(row.hobbs_start)
      const newMinutes = Math.round((hobbsEnd - hobbsStart) * 60)
      const minuteRate = getRentalRate(row.aircraft_registration || "")
      const newTotal = newMinutes * minuteRate

      setClauses.push(`hobbs_end = $${paramIdx++}`)
      params.push(hobbsEnd)
      setClauses.push(`quantity = $${paramIdx++}`)
      params.push(newMinutes)
      setClauses.push(`total_price = $${paramIdx++}`)
      params.push(newTotal)
    }

    if (flightType !== undefined) {
      setClauses.push(`flight_type = $${paramIdx++}`)
      params.push(flightType)
    }

    setClauses.push(`departure_icao = $${paramIdx++}`)
    params.push(departureIcao || null)
    setClauses.push(`arrival_icao = $${paramIdx++}`)
    params.push(arrivalIcao || null)
    setClauses.push(`landings = $${paramIdx++}`)
    params.push(landings ?? null)
    setClauses.push(`notes = $${paramIdx++}`)
    params.push(remarks || null)

    params.push(billableItemId)

    await pool.query(
      `UPDATE billable_items
       SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${paramIdx}`,
      params
    )

    revalidatePath("/jasenalue/lentopaivakirja")
    return { status: "success" }
  } catch (error) {
    console.error("Error editing flight log:", error)
    return { status: "error", error: "Muokkaus epäonnistui" }
  }
}

export async function deleteFlightLog(
  billableItemId: string
): Promise<{ status: "success" | "error"; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: "error", error: "Kirjaudu sisään" }
    }

    const existing = await pool.query(
      `SELECT member_id, payment_status
       FROM billable_items
       WHERE id = $1 AND deleted_at IS NULL`,
      [billableItemId]
    )

    if (existing.rows.length === 0) {
      return { status: "error", error: "Kirjausta ei löydy" }
    }

    const row = existing.rows[0]
    const isAdmin = hasPermission(session.user.roles, "ADMIN")

    if (row.member_id !== session.user.id && !isAdmin) {
      return { status: "error", error: "Ei oikeuksia poistaa tätä kirjausta" }
    }

    if (row.payment_status !== "recorded" && !isAdmin) {
      return {
        status: "error",
        error: "Kirjausta ei voi poistaa enää (tila on muuttunut)",
      }
    }

    await pool.query(
      `UPDATE billable_items SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [billableItemId]
    )

    revalidatePath("/jasenalue/lentopaivakirja")
    return { status: "success" }
  } catch (error) {
    console.error("Error deleting flight log:", error)
    return { status: "error", error: "Poisto epäonnistui" }
  }
}

export async function getMyFlightLogs(): Promise<FlightWithBilling[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return []
    }

    if (!hasPermission(session.user.roles, "VIEW_OWN_FLIGHTS")) {
      return []
    }

    const result = await pool.query(
      `SELECT * FROM billable_items
       WHERE member_id = $1 AND billable_type = 'flight' AND deleted_at IS NULL
       ORDER BY item_date DESC, created_at DESC`,
      [session.user.id]
    )

    const planes = planesData as PlaneJson[]
    return result.rows.map((row) => rowToFlightWithBilling(row, planes))
  } catch (error) {
    console.error("Error fetching flight logs:", error)
    return []
  }
}

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
       WHERE member_id = $1 AND billable_type = 'flight' AND deleted_at IS NULL`,
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
       WHERE member_id = $1 AND deleted_at IS NULL
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
       WHERE member_id = $1 AND deleted_at IS NULL
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
