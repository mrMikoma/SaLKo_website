export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import { getAircraftSheets, getFlightFormOptions } from "@/utilities/flightLogData";
import PaperPageEntry from "@/components/flightLogs/PaperPageEntry";

export const metadata = {
  title: "Paperisivun kirjaus | Ylläpito",
};

export default async function PaperPageImportPage() {
  // Still being built: shown in dev, hidden in production
  if (!isFlightLogEnabled()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "MANAGE_FLIGHT_LOG")) {
    redirect("/");
  }

  const [aircraft, options] = await Promise.all([
    getAircraftSheets(),
    getFlightFormOptions(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/lennot" className="text-sm text-sblue hover:underline">
          ← Lennot
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Paperisivun kirjaus</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Kirjoita matkapäiväkirjan sivu taulukkoon. Tarkistus vertaa rivejä
          lentäjien jo kirjaamiin lentoihin: samat vahvistetaan, erot korjataan
          paperin mukaan ja puuttuvat lisätään. Kaikki sivun lennot merkitään
          tarkistetuiksi.
        </p>
      </div>
      <PaperPageEntry
        aircraft={aircraft.map((a) => a.registration)}
        purposes={options.purposes.map(({ code, name }) => ({ code, name }))}
        pilotNames={options.pilotNames}
        airfields={options.airfields}
        today={DateTime.now().setZone(SHEET_ZONE).toISODate()!}
      />
    </div>
  );
}
