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

/**
 * Where the login page sends the member back to: `?paluu=` (a path, from
 * proxy.ts or the navbar), or Auth.js's own `callbackUrl`, which is a full
 * address. Of an address only the path and query are kept, so it can't lead
 * to another site. The login pages themselves lead to the front page, so a
 * login never ends on another login page.
 */
export function returnPath(value: unknown): string {
  let path = typeof value === "string" ? value : "";
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      path = url.pathname + url.search;
    } catch {
      path = "";
    }
  }
  const safe = safeRedirect(path);
  return safe === "/auth" || safe.startsWith("/auth/") || safe.startsWith("/auth?") ? "/" : safe;
}
