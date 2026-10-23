/**
 * Where to go after logging in: a path on this site, such as the booking
 * calendar the login was opened from. Anything else, like another site's
 * address or "//evil.example", goes to the front page.
 */
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string" || value.length > 500) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\r\n\t]/.test(value)) return "/";
  return value;
}
