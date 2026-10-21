import { MyFlight } from "@/utilities/flightLogData";
import {
  formatClock,
  formatFlightDate,
  formatMinutes,
  formatMonth,
  statusLabel,
} from "@/utilities/flightFormat";

interface MyFlightsProps {
  flights: MyFlight[];
}

/**
 * The member's own flights from the flight log, newest month first, with
 * month totals
 */
const MyFlights = ({ flights }: MyFlightsProps) => {
  if (flights.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-gray-700 space-y-2">
        <p className="font-semibold text-gray-900">Ei vielä lentoja</p>
        <p>
          Lennot näkyvät täällä, kun ne on kirjattu kerhon lentopäiväkirjaan ja
          nimesi on yhdistetty jäsentietoihisi. Ota yhteyttä laskuttajaan, jos
          lentojasi puuttuu.
        </p>
      </div>
    );
  }

  const months = new Map<string, MyFlight[]>();
  for (const flight of flights) {
    const month = flight.flightDate.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), flight]);
  }

  const year = flights[0].flightDate.slice(0, 4);
  const yearFlights = flights.filter((flight) => flight.flightDate.startsWith(year));
  const yearMinutes = yearFlights.reduce((sum, f) => sum + (f.airborneMinutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
        <p className="text-sm text-gray-600">Vuonna {year}</p>
        <p className="text-2xl font-bold">
          {yearFlights.length} lentoa · {formatMinutes(yearMinutes)} h
        </p>
      </div>

      {[...months].map(([month, monthFlights]) => {
        const minutes = monthFlights.reduce((sum, f) => sum + (f.airborneMinutes ?? 0), 0);
        return (
          <section key={month} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <h2 className="flex justify-between items-baseline px-4 py-3 bg-gray-50 text-gray-900">
              <span className="font-semibold capitalize">{formatMonth(month)}</span>
              <span className="text-sm text-gray-600 tabular-nums">
                {monthFlights.length} lentoa · {formatMinutes(minutes)}
              </span>
            </h2>
            <ul className="divide-y divide-gray-200">
              {monthFlights.map((flight) => (
                <li
                  key={flight.id}
                  className="px-4 py-3 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 items-baseline text-gray-900"
                >
                  <span className="whitespace-nowrap">{formatFlightDate(flight.flightDate)}</span>
                  <span>
                    {flight.registration} {flight.departure ?? "?"}–{flight.arrival ?? "?"}
                    <span className="text-gray-600">
                      {" "}
                      · {flight.purposeName ?? flight.purposeCode ?? "–"}
                      {flight.role === "second" && " · oppilaana / SIC"}
                    </span>
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatMinutes(flight.airborneMinutes)}
                  </span>
                  <span />
                  <span className="text-sm text-gray-600 tabular-nums">
                    {formatClock(flight.takeoffAt)}–{formatClock(flight.landingAt)} ·{" "}
                    {flight.landings ?? 0} laskua
                  </span>
                  <span className="text-right text-xs text-gray-600">
                    {statusLabel(flight.status)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default MyFlights;
