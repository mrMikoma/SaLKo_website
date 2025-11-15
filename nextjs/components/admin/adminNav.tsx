"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const AdminNav = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/users", label: "Käyttäjät" },
    { href: "/admin/settings", label: "Asetukset" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="font-bold text-xl hover:text-blue-200">
              SaLKo
            </Link>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
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
          <div className="flex items-center space-x-4">
            <span className="text-sm text-blue-200">Admin</span>
            <Link
              href="/profiili"
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
      </div>
    </nav>
  );
};

export default AdminNav;
