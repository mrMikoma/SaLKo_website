import { BillLine, euros, LineKind } from "@/utilities/billing";
import { formatFullDate, formatMinutes } from "@/utilities/flightFormat";

const KIND_LABEL: Record<LineKind, string> = {
  flight: "",
  minimum: "Minimilaskutus",
  credit: "Hyvitys",
  adjustment: "Korjaus",
  unbilled: "Ei laskuteta",
};

// Credits and corrections can be negative: "−0:20"
export const signedMinutes = (minutes: number) =>
  `${minutes < 0 ? "−" : ""}${formatMinutes(Math.abs(minutes))}`;

/** The lines of one payer's bill */
const BillLines = ({ lines, totalCents }: { lines: BillLine[]; totalCents?: number }) => (
  <table className="w-full text-sm text-gray-900">
    <thead className="text-left text-gray-600">
      <tr>
        <th scope="col" className="px-2 py-1 font-medium">Päivä</th>
        <th scope="col" className="px-2 py-1 font-medium hidden sm:table-cell">Kone</th>
        <th scope="col" className="px-2 py-1 font-medium">Tarkoitus</th>
        <th scope="col" className="px-2 py-1 font-medium">Selite</th>
        <th scope="col" className="px-2 py-1 font-medium text-right">Aika</th>
        <th scope="col" className="px-2 py-1 font-medium text-right hidden sm:table-cell">€/min</th>
        <th scope="col" className="px-2 py-1 font-medium text-right">Summa</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {lines.map((line, i) => (
        <tr key={`${line.flightId}-${line.kind}-${i}`} className={line.kind === "flight" ? "" : "text-gray-700"}>
          <td className="px-2 py-1 whitespace-nowrap tabular-nums">
            {line.flightDate ? formatFullDate(line.flightDate) : "–"}
          </td>
          <td className="px-2 py-1 whitespace-nowrap hidden sm:table-cell">{line.registration ?? "–"}</td>
          <td className="px-2 py-1">{line.purposeCode ?? "–"}</td>
          <td className="px-2 py-1">
            {KIND_LABEL[line.kind] && line.kind !== "credit" && line.kind !== "adjustment" && (
              <span className="font-medium">{KIND_LABEL[line.kind]}: </span>
            )}
            {line.description}
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{signedMinutes(line.minutes)}</td>
          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">
            {line.centsPerMinute !== null ? (line.centsPerMinute / 100).toFixed(2).replace(".", ",") : ""}
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{euros(line.amountCents)}</td>
        </tr>
      ))}
    </tbody>
    {totalCents !== undefined && (
      <tfoot className="font-semibold">
        <tr>
          {/* Two columns are hidden on phones */}
          <td className="px-2 py-1 sm:hidden" colSpan={4}>
            Yhteensä
          </td>
          <td className="px-2 py-1 hidden sm:table-cell" colSpan={6}>
            Yhteensä
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{euros(totalCents)}</td>
        </tr>
      </tfoot>
    )}
  </table>
);

export default BillLines;
