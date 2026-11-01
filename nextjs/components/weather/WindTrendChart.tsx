"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DecodedMetar } from "@/utilities/metarDecode";
import { AXIS, GRID, GUST_COLOR, SURFACE, WIND_COLOR } from "@/components/weather/colors";
import { localHourOf, localTime, utcTime, windText } from "@/components/weather/format";

export interface TrendPoint {
  time: number;
  metar: DecodedMetar;
}

const HEIGHT = 196;
const M = { top: 30, right: 44, bottom: 26, left: 30 };
const HOUR = 3600_000;

function niceMax(value: number) {
  return Math.max(10, Math.ceil(value / 5) * 5);
}

/**
 * Mean wind and gusts over the last 12 hours, one axis in knots, with the
 * direction as small downwind arrows along the top. Hover or focus shows every
 * value at a time; the observation table below has them all as text.
 */
export default function WindTrendChart({ points }: { points: TrendPoint[] }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasGusts = points.some((p) => p.metar.wind?.gustKt !== null && p.metar.wind?.gustKt !== undefined);
  const first = points[0]?.time ?? 0;
  const last = points.at(-1)?.time ?? 0;
  const span = Math.max(last - first, HOUR);
  const start = last - span;
  const plotWidth = Math.max(0, width - M.left - M.right);
  const plotHeight = HEIGHT - M.top - M.bottom;
  const top = niceMax(Math.max(0, ...points.map((p) => Math.max(p.metar.wind?.speedKt ?? 0, p.metar.wind?.gustKt ?? 0))));
  const step = top <= 20 ? 5 : 10;
  const x = (time: number) => M.left + ((time - start) / span) * plotWidth;
  const y = (kt: number) => M.top + plotHeight - (kt / top) * plotHeight;

  // The mean wind as one path, broken where a report has no wind
  let path = "";
  let pen = false;
  for (const p of points) {
    const speed = p.metar.wind?.speedKt;
    if (speed === null || speed === undefined) {
      pen = false;
      continue;
    }
    path += `${pen ? "L" : "M"} ${x(p.time).toFixed(1)} ${y(speed).toFixed(1)} `;
    pen = true;
  }

  // A tick every 2 hours of Finnish time (3 when narrow); whole UTC hours are
  // whole Finnish hours, as the offset is +2 or +3
  const every = plotWidth < 360 ? 3 : 2;
  const ticks: number[] = [];
  for (let t = Math.ceil(start / HOUR) * HOUR; t <= last; t += HOUR) {
    if (localHourOf(t) % every === 0) ticks.push(t);
  }

  // Direction arrows, at least 18 px apart
  const arrows: TrendPoint[] = [];
  for (const p of points) {
    const previous = arrows.at(-1);
    if (!previous || x(p.time) - x(previous.time) >= 18) arrows.push(p);
  }

  const lastWithWind = [...points].reverse().find((p) => p.metar.wind?.speedKt !== null && p.metar.wind?.speedKt !== undefined);

  const nearest = (clientX: number) => {
    const box = wrapper.current?.getBoundingClientRect();
    if (!box || points.length === 0) return null;
    const time = start + ((clientX - box.left - M.left) / plotWidth) * span;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].time - time) < Math.abs(points[best].time - time)) best = i;
    }
    return best;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => setActive(nearest(event.clientX));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = active ?? points.length - 1;
    setActive(Math.min(points.length - 1, Math.max(0, current + (event.key === "ArrowLeft" ? -1 : 1))));
  };

  const focused = active === null ? null : points[active];
  // Beside the crosshair, on the side with more room, so it never covers the legend
  const TOOLTIP_WIDTH = 168;
  const tooltipLeft = focused
    ? x(focused.time) > M.left + plotWidth / 2
      ? Math.max(0, x(focused.time) - 12 - TOOLTIP_WIDTH)
      : Math.min(width - TOOLTIP_WIDTH, x(focused.time) + 12)
    : 0;

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-swhite">Tuuli 12 h</span>
        <span className="flex items-center gap-4 text-xs text-swhite/70">
          {hasGusts && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: WIND_COLOR }} />
                Keskituuli
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GUST_COLOR }} />
                Puuskat
              </span>
            </>
          )}
          <span>solmua · Suomen aikaa</span>
        </span>
      </figcaption>

      <div
        ref={wrapper}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-sbluel rounded-md touch-pan-y"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="group"
        aria-label="Tuulen nopeus ja suunta 12 tunnin ajalta. Nuolinäppäimet siirtävät havainnosta toiseen."
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden className="block">
            {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((kt) => (
              <g key={kt}>
                <line x1={M.left} x2={M.left + plotWidth} y1={y(kt)} y2={y(kt)} stroke={kt === 0 ? AXIS : GRID} strokeWidth={1} />
                <text x={M.left - 6} y={y(kt)} textAnchor="end" dominantBaseline="central" className="fill-swhite/60 text-[11px] tabular-nums">
                  {kt}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t} x={x(t)} y={HEIGHT - 8} textAnchor="middle" className="fill-swhite/60 text-[11px] tabular-nums">
                {localTime(t)}
              </text>
            ))}

            {arrows.map((p) => {
              const wind = p.metar.wind;
              const cx = x(p.time);
              const cy = 12;
              if (!wind || wind.speedKt === null) return null;
              if (wind.calm || wind.variable || wind.direction === null) {
                return <circle key={p.time} cx={cx} cy={cy} r={3} fill="none" className="stroke-swhite/60" strokeWidth={1.5} />;
              }
              // Pointing downwind, the way the air moves
              return (
                <g key={p.time} transform={`rotate(${wind.direction + 180} ${cx} ${cy})`}>
                  <line x1={cx} y1={cy + 6} x2={cx} y2={cy - 4} className="stroke-swhite/70" strokeWidth={1.5} strokeLinecap="round" />
                  <path d={`M ${cx - 3.5} ${cy - 1.5} L ${cx} ${cy - 6} L ${cx + 3.5} ${cy - 1.5}`} fill="none" className="stroke-swhite/70" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            })}

            <path d={path} fill="none" stroke={WIND_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p) =>
              p.metar.wind?.gustKt !== null && p.metar.wind?.gustKt !== undefined ? (
                <circle key={p.time} cx={x(p.time)} cy={y(p.metar.wind.gustKt)} r={4} fill={GUST_COLOR} stroke={SURFACE} strokeWidth={2} />
              ) : null
            )}
            {lastWithWind && (
              <text x={x(lastWithWind.time) + 8} y={y(lastWithWind.metar.wind!.speedKt!)} dominantBaseline="central" className="fill-swhite text-[12px] font-semibold">
                {lastWithWind.metar.wind!.speedKt} kt
              </text>
            )}

            {focused && (
              <g>
                <line x1={x(focused.time)} x2={x(focused.time)} y1={M.top - 4} y2={M.top + plotHeight} className="stroke-swhite/40" strokeWidth={1} />
                {focused.metar.wind?.speedKt !== null && focused.metar.wind?.speedKt !== undefined && (
                  <circle cx={x(focused.time)} cy={y(focused.metar.wind.speedKt)} r={4.5} fill={WIND_COLOR} stroke={SURFACE} strokeWidth={2} />
                )}
              </g>
            )}
          </svg>
        )}

        {focused && (
          <div
            className="pointer-events-none absolute rounded-lg border border-swhite/15 bg-sblack/90 px-3 py-2 text-xs text-swhite/70 shadow-lg"
            style={{ left: tooltipLeft, top: M.top, width: TOOLTIP_WIDTH }}
            aria-live="polite"
          >
            <p>
              klo {localTime(focused.time)} ({utcTime(focused.time)})
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span aria-hidden className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: WIND_COLOR }} />
              <span className="font-semibold text-swhite text-sm">{windText(focused.metar.wind)}</span>
            </p>
            {focused.metar.wind?.gustKt !== null && focused.metar.wind?.gustKt !== undefined && (
              <p className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GUST_COLOR }} />
                <span className="font-semibold text-swhite text-sm">{focused.metar.wind.gustKt} kt</span> puuskat
              </p>
            )}
            {focused.metar.category && (
              <p className="mt-1">
                <span className="font-semibold text-swhite">{focused.metar.category}</span> sääluokka
              </p>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
