"use server"

import { google, sheets_v4 } from "googleapis"

// Initialize Google Sheets client using service account credentials
function getGoogleSheetsClient(): sheets_v4.Sheets {
  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"
  )

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  return google.sheets({ version: "v4", auth })
}

// Get the spreadsheet ID from environment
function getSpreadsheetId(): string {
  const id = process.env.FLIGHT_LOG_SPREADSHEET_ID
  if (!id) {
    throw new Error("FLIGHT_LOG_SPREADSHEET_ID environment variable is not set")
  }
  return id
}

// Flight log entry structure matching the Google Sheet schema
export interface FlightLogEntry {
  logId: string
  date: string
  pilotId: string
  pilotName: string
  hobbsStart: number
  hobbsEnd: number
  flightMinutes: number
  flightType: string
  remarks?: string
  createdAt: string
  createdBy: string
}

// Raw row data from Google Sheets
type SheetRow = (string | number | null | undefined)[]

// Convert a flight log entry to a row array for the sheet
function entryToRow(entry: FlightLogEntry): SheetRow {
  return [
    entry.logId,
    entry.date,
    entry.pilotId,
    entry.pilotName,
    entry.hobbsStart,
    entry.hobbsEnd,
    // Column G is a formula, leave empty
    null,
    entry.flightType,
    entry.remarks || "",
    entry.createdAt,
    entry.createdBy,
  ]
}

// Convert a row from the sheet to a flight log entry
function rowToEntry(row: SheetRow): FlightLogEntry | null {
  if (!row || row.length < 6 || !row[0]) {
    return null
  }

  return {
    logId: String(row[0]),
    date: String(row[1]),
    pilotId: String(row[2]),
    pilotName: String(row[3] || ""),
    hobbsStart: Number(row[4]) || 0,
    hobbsEnd: Number(row[5]) || 0,
    flightMinutes: Number(row[6]) || 0,
    flightType: String(row[7] || ""),
    remarks: row[8] ? String(row[8]) : undefined,
    createdAt: String(row[9] || ""),
    createdBy: String(row[10] || ""),
  }
}

// Generate the next log ID for an aircraft
export async function generateNextLogId(
  aircraftRegistration: string
): Promise<string> {
  const sheets = getGoogleSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const year = new Date().getFullYear()

  // Get all log IDs from the aircraft's sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${aircraftRegistration}!A:A`,
  })

  const rows = response.data.values || []
  let maxSequence = 0

  // Find the highest sequence number for this year
  const prefix = `${aircraftRegistration}-${year}-`
  for (const row of rows) {
    const logId = row[0]
    if (typeof logId === "string" && logId.startsWith(prefix)) {
      const sequence = parseInt(logId.substring(prefix.length), 10)
      if (sequence > maxSequence) {
        maxSequence = sequence
      }
    }
  }

  // Generate next log ID
  const nextSequence = (maxSequence + 1).toString().padStart(4, "0")
  return `${prefix}${nextSequence}`
}

// Append a flight log entry to the appropriate aircraft sheet
export async function appendFlightLog(
  aircraftRegistration: string,
  entry: FlightLogEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const row = entryToRow(entry)

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${aircraftRegistration}!A:K`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error appending flight log:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get all flight logs for an aircraft
export async function getFlightLogs(
  aircraftRegistration: string
): Promise<FlightLogEntry[]> {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${aircraftRegistration}!A2:K`, // Skip header row
    })

    const rows = response.data.values || []
    const entries: FlightLogEntry[] = []

    for (const row of rows) {
      const entry = rowToEntry(row as SheetRow)
      if (entry) {
        entries.push(entry)
      }
    }

    return entries
  } catch (error) {
    console.error("Error fetching flight logs:", error)
    return []
  }
}

// Get flight logs for a specific pilot across all aircraft
export async function getFlightLogsForPilot(
  pilotId: string,
  aircraftRegistrations: string[]
): Promise<FlightLogEntry[]> {
  const allEntries: FlightLogEntry[] = []

  for (const registration of aircraftRegistrations) {
    const logs = await getFlightLogs(registration)
    const pilotLogs = logs.filter((log) => log.pilotId === pilotId)
    allEntries.push(...pilotLogs)
  }

  // Sort by date descending
  allEntries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return allEntries
}

// Get all log IDs from all aircraft sheets for sync purposes
export async function getAllLogIds(
  aircraftRegistrations: string[]
): Promise<Set<string>> {
  const logIds = new Set<string>()

  for (const registration of aircraftRegistrations) {
    const logs = await getFlightLogs(registration)
    for (const log of logs) {
      logIds.add(log.logId)
    }
  }

  return logIds
}

// Get the latest Hobbs reading for an aircraft
export async function getLatestHobbs(
  aircraftRegistration: string
): Promise<number | null> {
  try {
    const logs = await getFlightLogs(aircraftRegistration)
    if (logs.length === 0) {
      return null
    }

    // Sort by date and get the most recent entry
    logs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return logs[0].hobbsEnd
  } catch (error) {
    console.error("Error fetching latest Hobbs:", error)
    return null
  }
}

// Get available aircraft sheets in the workbook
export async function getAircraftSheets(): Promise<string[]> {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    })

    const sheetNames =
      response.data.sheets?.map((sheet) => sheet.properties?.title || "") || []

    // Filter to only return aircraft registration sheets (OH-XXX format)
    return sheetNames.filter((name) => /^OH-\w+$/.test(name))
  } catch (error) {
    console.error("Error fetching aircraft sheets:", error)
    return []
  }
}
