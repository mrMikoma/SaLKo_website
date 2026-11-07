import type { ReactNode } from "react";

/**
 * The box an error or "not found" page shows its explanation and ways on in:
 * dark glass on the public site and the member pages, a white card in the
 * admin site. No hooks, so the error pages (client) and the not-found pages
 * (server) share it.
 */
export default function ErrorPanel({
  tone,
  title,
  children,
  actions,
  code,
}: {
  tone: "dark" | "light";
  // For the admin pages, whose page heading is the admin site's own
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  // The error's digest, to quote to the admin
  code?: string | null;
}) {
  const dark = tone === "dark";
  return (
    <div
      role="alert"
      className={
        dark
          ? "glass rounded-xl p-6 md:p-10 border border-sred/20 text-swhite space-y-4"
          : "bg-white rounded-xl shadow-md p-6 md:p-8 text-gray-900 space-y-4"
      }
    >
      {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
      <div className={`space-y-2 text-base md:text-lg ${dark ? "text-swhite/90" : "text-gray-700"}`}>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-3 pt-2">{actions}</div>}
      {code && (
        <p className={`text-sm ${dark ? "text-swhite/60" : "text-gray-500"}`}>
          Virhekoodi: <span className="font-mono">{code}</span>
        </p>
      )}
    </div>
  );
}

// Buttons and links on the panels: the primary one first
export const primaryAction = (tone: "dark" | "light") =>
  tone === "dark"
    ? "inline-flex items-center min-h-11 px-6 rounded-lg bg-sred-dark text-swhite font-semibold shadow-lg hover:bg-sred-dark/90 transition-colors"
    : "inline-flex items-center min-h-11 px-5 rounded-lg bg-sblue text-white font-semibold hover:bg-sblue/90 transition-colors";

export const secondaryAction = (tone: "dark" | "light") =>
  tone === "dark"
    ? "inline-flex items-center min-h-11 px-6 rounded-lg border-2 border-swhite/40 text-swhite font-semibold hover:bg-swhite/10 transition-colors"
    : "inline-flex items-center min-h-11 px-5 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition-colors";
