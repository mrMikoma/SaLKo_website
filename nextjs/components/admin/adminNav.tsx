"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canOpenAdminPath, ROLES } from "@/utilities/roles";

const AdminNav = ({
  showFlightLog = false,
  roles,
}: {
  showFlightLog?: boolean;
  roles: string[];
}) => {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Etusivu", exact: true },
    { href: "/admin/users", label: "Käyttäjät" },
    // The flight log is only on where FEATURE_FLIGHT_LOG is (utilities/features.ts)
    ...(showFlightLog
      ? [
          { href: "/admin/lennot", label: "Lennot" },
          { href: "/admin/laskutus", label: "Laskutus" },
          { href: "/admin/tilastot", label: "Tilastot" },
        ]
      : []),
    { href: "/admin/bulletins", label: "Tiedotteet" },
    // A treasurer sees only their own sections
  ].filter((item) => canOpenAdminPath(roles, item.href));

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Wraps onto two rows on a phone instead of overflowing the screen
  return (
    <nav className="bg-blue-900 text-white shadow-lg" aria-label="Ylläpito">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="font-bold text-xl hover:text-blue-200">
            SaLKo
          </Link>
          <div className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href, item.exact)
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-blue-200">
            {roles.includes(ROLES.ADMIN) ? "Admin" : "Laskuttaja"}
          </span>
          <Link
            href="/jasenalue/profiili"
            className="text-blue-100 hover:text-white text-sm"
          >
            Profiili
          </Link>
          <Link
            href="/"
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md text-sm"
          >
            Takaisin sivustolle
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
