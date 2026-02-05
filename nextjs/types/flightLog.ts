// Flight logging and billing types

// Billable item types matching PostgreSQL enum
export type BillableType =
  | "flight"
  | "membership"
  | "hangar"
  | "instruction"
  | "other"

// Payment status workflow matching PostgreSQL enum
export type PaymentStatus = "recorded" | "checked" | "invoiced" | "paid"

// Billing period types matching PostgreSQL enum
export type BillingPeriod = "one_time" | "monthly" | "quarterly" | "yearly"

// Flight types for categorizing flights
export type FlightLogType =
  | "training"
  | "solo"
  | "checkout"
  | "cross_country"
  | "local"
  | "maintenance"
  | "other"

export const FLIGHT_LOG_TYPE_LABELS: Record<FlightLogType, string> = {
  training: "Koulutus",
  solo: "Solo",
  checkout: "Checkout",
  cross_country: "Matkalento",
  local: "Paikallislento",
  maintenance: "Huolto",
  other: "Muu",
}

// Aircraft type for database entity
export interface Aircraft {
  id: string
  registration: string
  name: string
  minuteRate: number
  hourlyRate: number
  active: boolean
  createdAt: string
  updatedAt: string
}

// Billable item from PostgreSQL
export interface BillableItem {
  id: string
  billableType: BillableType
  memberId: string
  externalRef?: string
  description: string
  billingPeriod: BillingPeriod
  periodStart?: string
  periodEnd?: string
  quantity: number
  unitPrice: number
  unitLabel?: string
  totalPrice: number
  paymentStatus: PaymentStatus
  checkedAt?: string
  checkedBy?: string
  invoicedAt?: string
  invoicedBy?: string
  invoiceRef?: string
  paidAt?: string
  paidMarkedBy?: string
  aircraftId?: string
  itemDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Flight log entry for Google Sheets
export interface FlightLogEntry {
  logId: string
  date: string
  pilotId: string
  pilotName: string
  hobbsStart: number
  hobbsEnd: number
  flightMinutes: number
  flightType: FlightLogType
  remarks?: string
  createdAt: string
  createdBy: string
}

// Combined flight data with billing info
export interface FlightWithBilling extends FlightLogEntry {
  billableItem?: BillableItem
  aircraft?: Aircraft
}

// Form data for creating a new flight log
export interface FlightLogFormData {
  aircraftRegistration: string
  date: string
  hobbsStart: number
  hobbsEnd: number
  flightType: FlightLogType
  remarks?: string
}

// Form data for creating non-flight billable items
export interface BillableItemFormData {
  billableType: Exclude<BillableType, "flight">
  memberId: string
  description: string
  billingPeriod: BillingPeriod
  periodStart?: string
  periodEnd?: string
  quantity: number
  unitPrice: number
  unitLabel?: string
  itemDate: string
  notes?: string
}

// Response types for server actions
export interface FlightLogResponse {
  status: "success" | "error"
  result?: FlightLogEntry
  error?: string
}

export interface BillableItemResponse {
  status: "success" | "error"
  result?: BillableItem
  error?: string
}

// Payment status update data
export interface PaymentStatusUpdate {
  billableItemId: string
  newStatus: PaymentStatus
  invoiceRef?: string
}

// Filter options for querying flights
export interface FlightLogFilter {
  pilotId?: string
  aircraftRegistration?: string
  startDate?: string
  endDate?: string
  flightType?: FlightLogType
}

// Filter options for querying billable items
export interface BillableItemFilter {
  memberId?: string
  billableType?: BillableType
  paymentStatus?: PaymentStatus
  startDate?: string
  endDate?: string
}

// Summary statistics for a member
export interface MemberFlightSummary {
  totalFlights: number
  totalMinutes: number
  totalCost: number
  unpaidAmount: number
  lastFlightDate?: string
}

// Type guards
export function isBillableType(value: string): value is BillableType {
  return ["flight", "membership", "hangar", "instruction", "other"].includes(
    value
  )
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return ["recorded", "checked", "invoiced", "paid"].includes(value)
}

export function isBillingPeriod(value: string): value is BillingPeriod {
  return ["one_time", "monthly", "quarterly", "yearly"].includes(value)
}

export function isFlightLogType(value: string): value is FlightLogType {
  return [
    "training",
    "solo",
    "checkout",
    "cross_country",
    "local",
    "maintenance",
    "other",
  ].includes(value)
}

// Helper to format flight minutes as hours and minutes
export function formatFlightTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) {
    return `${mins} min`
  }
  return `${hours} h ${mins} min`
}

// Helper to format currency (euros)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

// Payment status labels in Finnish
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  recorded: "Kirjattu",
  checked: "Tarkistettu",
  invoiced: "Laskutettu",
  paid: "Maksettu",
}

// Payment status colors for UI
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  recorded: "blue",
  checked: "orange",
  invoiced: "purple",
  paid: "green",
}

// Billable type labels in Finnish
export const BILLABLE_TYPE_LABELS: Record<BillableType, string> = {
  flight: "Lento",
  membership: "Jäsenmaksu",
  hangar: "Hallipaikka",
  instruction: "Opetus",
  other: "Muu",
}

// Billing period labels in Finnish
export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  one_time: "Kertaluontoinen",
  monthly: "Kuukausittainen",
  quarterly: "Neljännesvuosittainen",
  yearly: "Vuosittainen",
}
