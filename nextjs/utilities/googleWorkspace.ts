/** The club's Google Workspace domain: Google logins must come from it */
export const WORKSPACE_DOMAIN = "savonlinnanlentokerho.fi";

interface GoogleProfile {
  email?: unknown;
  email_verified?: unknown;
  hd?: unknown;
}

/**
 * The address of a Google login if Google says it belongs to the club's
 * Workspace, otherwise null. The ID token's hd claim names the account's
 * Workspace, and email_verified says Google has checked the address. The hd
 * parameter of the sign-in request is only a hint for the account chooser,
 * and an address that merely ends in the domain proves nothing.
 */
export function workspaceEmail(profile: GoogleProfile | null | undefined): string | null {
  if (profile?.hd !== WORKSPACE_DOMAIN || profile.email_verified !== true) return null;
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  return email.endsWith(`@${WORKSPACE_DOMAIN}`) ? email : null;
}
