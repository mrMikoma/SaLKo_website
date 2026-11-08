import type { ReactNode } from "react";
import type { DecodedWind } from "@/utilities/metarDecode";
import { EFSA_RUNWAY_ENDS, type RunwayWindSummary } from "@/utilities/runwayWind";
import { AXIS, WIND_COLOR } from "@/components/weather/colors";
import { windText } from "@/components/weather/format";

const along = (kt: number) => (kt < 0 ? `myötä ${-kt} kt` : `${kt} kt`);
const Muted = ({ children }: { children: ReactNode }) => <span className="block text-xs text-swhite/60">{children}</span>;

const SIZE = 220;
const C = SIZE / 2;
const RING = 86;

/** A point at a compass bearing (degrees true, clockwise from north) and radius */
const at = (bearing: number, radius: number) => {
  const r = (bearing * Math.PI) / 180;
  return { x: C + radius * Math.sin(r), y: C - radius * Math.cos(r) };
};

function sector(from: number, to: number) {
  const span = (to - from + 360) % 360;
  const a = at(from, RING);
  const b = at(to, RING);
  return `M ${C} ${C} L ${a.x} ${a.y} A ${RING} ${RING} 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

/**
 * EFSA's runway 12/30 on a compass, true north up, with the wind arrow
 * blowing from the METAR's direction and its direction range as a sector.
 */
export default function RunwayWindFigure({ wind, summary }: { wind: DecodedWind | null; summary: RunwayWindSummary | null }) {
  const bearing = EFSA_RUNWAY_ENDS[0].trueBearing;
  const steady = summary?.kind === "steady" && wind?.direction !== null && wind?.direction !== undefined;
  const tail = steady ? at(wind.direction as number, RING - 4) : null;
  const head = steady ? at(wind.direction as number, 22) : null;
  const headBase = steady ? at(wind.direction as number, 34) : null;
  const headLeft = steady ? at((wind.direction as number) - 90, 7) : null;
  const headRight = steady ? at((wind.direction as number) + 90, 7) : null;

  const label = steady
    ? `Kiitotie 12/30 ja tuuli ${windText(wind)}`
    : summary?.kind === "calm"
      ? "Kiitotie 12/30, tyyntä"
      : `Kiitotie 12/30, tuuli ${windText(wind)}`;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-5">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-48 h-48 shrink-0" role="img" aria-label={label}>
        <circle cx={C} cy={C} r={RING} fill="none" stroke={AXIS} strokeWidth={1} />
        {Array.from({ length: 12 }, (_, i) => {
          const outer = at(i * 30, RING);
          const inner = at(i * 30, RING - (i % 3 === 0 ? 8 : 4));
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={AXIS} strokeWidth={1} />;
        })}
        {(["N", "E", "S", "W"] as const).map((name, i) => {
          const p = at(i * 90, RING + 13);
          return (
            <text key={name} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-swhite/60 text-[12px]">
              {name}
            </text>
          );
        })}

        {wind && wind.varyingFrom !== null && wind.varyingTo !== null && (
          <path d={sector(wind.varyingFrom, wind.varyingTo)} fill={WIND_COLOR} fillOpacity={0.16} />
        )}

        <g transform={`rotate(${bearing} ${C} ${C})`}>
          <rect x={C - 8} y={C - 62} width={16} height={124} rx={2} className="fill-swhite/20" />
          <line x1={C} y1={C - 52} x2={C} y2={C + 52} className="stroke-swhite/70" strokeWidth={1} strokeDasharray="6 5" />
        </g>
        {EFSA_RUNWAY_ENDS.map((end) => {
          // A runway's number is painted at the threshold it is landed from,
          // the end opposite to its direction.
          const p = at(end.trueBearing + 180, 50);
          return (
            <text key={end.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-swhite text-[13px] font-semibold">
              {end.id}
            </text>
          );
        })}

        {steady && tail && head && headBase && headLeft && headRight && (
          <g>
            <line x1={tail.x} y1={tail.y} x2={headBase.x} y2={headBase.y} stroke={WIND_COLOR} strokeWidth={3} strokeLinecap="round" />
            <polygon
              points={`${head.x},${head.y} ${headBase.x + (headLeft.x - C)},${headBase.y + (headLeft.y - C)} ${headBase.x + (headRight.x - C)},${headBase.y + (headRight.y - C)}`}
              fill={WIND_COLOR}
            />
          </g>
        )}
        {!steady && (
          <text x={C} y={C} textAnchor="middle" dominantBaseline="central" className="fill-swhite text-[13px] font-semibold">
            {summary?.kind === "calm" ? "Tyyntä" : summary?.kind === "variable" ? "VRB" : ""}
          </text>
        )}
      </svg>

      <div className="text-sm text-swhite/85 space-y-3 min-w-0 w-full">
        {summary?.kind === "steady" && (
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-swhite/60">
              <tr className="border-b border-swhite/15">
                <th scope="col" className="py-1.5 pr-3 font-medium">Kiitotie</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Vasta-/myötätuuli</th>
                <th scope="col" className="py-1.5 font-medium">Sivutuuli</th>
              </tr>
            </thead>
            <tbody>
              {summary.ends.map((end, index) => (
                <tr key={end.runway} className="border-b border-swhite/10 align-top">
                  <th scope="row" className={`py-2 pr-3 text-base ${index === 0 ? "text-swhite" : "text-swhite/75 font-normal"}`}>
                    {end.runway}
                  </th>
                  <td className="py-2 pr-3">
                    {along(end.headwindKt)}
                    {end.gustHeadwindKt !== null && <Muted>puuskissa {along(end.gustHeadwindKt)}</Muted>}
                  </td>
                  <td className="py-2">
                    {end.crosswindKt === 0 ? "0 kt" : `${end.crosswindKt} kt ${end.crosswindFrom === "left" ? "vasemmalta" : "oikealta"}`}
                    {end.gustCrosswindKt !== null && <Muted>puuskissa {end.gustCrosswindKt} kt</Muted>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {summary?.kind === "steady" && summary.maxCrosswindKt !== null && (
          <p>Suunnan vaihtelussa sivutuulta enintään {summary.maxCrosswindKt} kt.</p>
        )}
        {summary?.kind === "variable" && <p>Suunta vaihtelee, joten sivutuulta voi olla koko {summary.maxCrosswindKt} kt.</p>}
        {summary?.kind === "calm" && <p>Tyyntä: kumpi tahansa kiitotie.</p>}
        {!summary && <p className="text-swhite/60">Tuulesta ei ole tietoa.</p>}
        <p className="text-xs text-swhite/50">
          Kiitotien todelliset suunnat 126° ja 306° (AIP), kuten METARin tuulen suunta.
        </p>
      </div>
    </div>
  );
}
