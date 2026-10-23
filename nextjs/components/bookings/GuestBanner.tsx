"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Login from "@/components/auth/login";

/**
 * For visitors who aren't logged in: they can book as guests, or log in
 * right here and come back to the same day and view of the calendar
 */
const GuestBanner = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const here = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="mb-3 rounded-xl bg-sblued/80 border border-swhite/10 shadow-xl text-swhite">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
        <p className="flex-1 text-sm sm:text-base">
          <strong>Et ole kirjautunut.</strong> Voit varata myös vieraana. Kirjautuneena voit muokata
          ja poistaa omia varauksiasi.
        </p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="calendar-login"
          className="min-h-11 px-5 rounded-lg bg-swhite text-sblue font-semibold shadow-md hover:bg-swhite/90 focus:outline-none focus:ring-2 focus:ring-swhite/60 focus:ring-offset-2 focus:ring-offset-sblue"
        >
          {open ? "Sulje" : "Kirjaudu sisään"}
        </button>
      </div>
      {open && (
        <div id="calendar-login" className="border-t border-swhite/10">
          <Login redirectTo={here} />
        </div>
      )}
    </div>
  );
};

export default GuestBanner;
