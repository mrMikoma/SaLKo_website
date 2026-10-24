import "server-only"

// Features that are still being built: on in the dev environment and in local
// development, hidden in production until they are ready.
//
// A feature is on when its variable is "true". Under `next dev` it defaults to
// on, so set it to "false" there to see the production behaviour.

function isEnabled(variable: string | undefined): boolean {
  if (variable === undefined) {
    return process.env.NODE_ENV === "development"
  }
  return variable === "true"
}

export function isFlightLogEnabled(): boolean {
  return isEnabled(process.env.FEATURE_FLIGHT_LOG)
}

// Billing periods, invoices and the member's bills, built on the flight log.
// Switched on in production in its own stage, after the treasurer has
// confirmed prices and practices (docs/GO_LIVE.md, stage C). Until then the
// treasurer can check flights but nothing is billed or numbered.
export function isBillingEnabled(): boolean {
  return isFlightLogEnabled() && isEnabled(process.env.FEATURE_BILLING)
}

// Development only: the button on /admin/lennot that fills an aircraft's tab
// with made-up flights (utilities/sampleFlights.ts). Off in production.
export function isSampleFlightsEnabled(): boolean {
  return isEnabled(process.env.FLIGHT_LOG_SAMPLE_DATA)
}

// Pages written from the old site that wait for the club members' review:
// Historiaa and Hallit. Shown in the dev environment, where members read them,
// and hidden in production until the review is done (docs/GO_LIVE.md).
export function isPagesInReviewEnabled(): boolean {
  return isEnabled(process.env.FEATURE_PAGES_IN_REVIEW)
}
