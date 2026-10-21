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
