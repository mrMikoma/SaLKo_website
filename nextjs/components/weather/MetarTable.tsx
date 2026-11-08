import FlightCategoryBadge from "@/components/weather/FlightCategoryBadge";
import { cloudLines, localTime, utcTime, visibilityText, windText } from "@/components/weather/format";
import type { TrendPoint } from "@/components/weather/WindTrendChart";

/** The last 12 hours as a table, newest first: the chart's values as text, and the raw reports. */
export default function MetarTable({ points }: { points: TrendPoint[] }) {
  const rows = [...points].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-swhite/60">
          <tr className="border-b border-swhite/15">
            <th scope="col" className="py-2 pr-3 font-medium">Aika</th>
            <th scope="col" className="py-2 pr-3 font-medium">Luokka</th>
            <th scope="col" className="py-2 pr-3 font-medium">Tuuli</th>
            <th scope="col" className="py-2 pr-3 font-medium">Näkyvyys</th>
            <th scope="col" className="py-2 pr-3 font-medium">Pilvet</th>
            <th scope="col" className="py-2 pr-3 font-medium">Lämpötila</th>
            <th scope="col" className="py-2 pr-3 font-medium">QNH</th>
            <th scope="col" className="py-2 font-medium">METAR</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(({ time, metar }) => (
            <tr key={time} className="border-b border-swhite/10 align-top">
              <td className="py-2 pr-3 whitespace-nowrap">
                {localTime(time)} <span className="text-swhite/50">{utcTime(time)}</span>
              </td>
              <td className="py-2 pr-3">
                <FlightCategoryBadge category={metar.category} size="sm" />
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {windText(metar.wind)}
                {metar.wind?.gustKt !== null && metar.wind?.gustKt !== undefined && <> G{metar.wind.gustKt}</>}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{visibilityText(metar)}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{cloudLines(metar).map((line) => line.code).join(" ") || "–"}</td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {metar.temperatureC ?? "–"}/{metar.dewPointC ?? "–"} °C
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{metar.qnhHpa ?? "–"}</td>
              {/* The row has the time, and the station is always EFSA */}
              <td className="py-2 font-mono text-xs text-swhite/70 min-w-[14rem]">{metar.raw.replace(/^(METAR|SPECI)\s+(COR\s+)?[A-Z]{4}\s+\d{6}Z\s+/, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
