"use client";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRecentMETARs, type METARObservation } from "@/utilities/metarActions";
import { decodeMetar, formatFeet, type DecodedMetar } from "@/utilities/metarDecode";
import { runwayWind } from "@/utilities/runwayWind";
import FlightCategoryBadge from "@/components/weather/FlightCategoryBadge";
import MetarTable from "@/components/weather/MetarTable";
import RunwayWindFigure from "@/components/weather/RunwayWindFigure";
import WindTrendChart, { type TrendPoint } from "@/components/weather/WindTrendChart";
import {
  ageText,
  cloudLines,
  localTime,
  minimumVisibilityText,
  runwayLine,
  temperatureText,
  utcTime,
  visibilityText,
  windDetails,
  windText,
} from "@/components/weather/format";

const REFRESH_MS = 60_000;
// A runway state group (R12/490395), shown as written
const RUNWAY_STATE = /^R\d{2}[LCR]?\/([\d/]{6}|CLRD[\d/]{2})$/;
// EFSA reports every 30 minutes; past this the latest one is overdue
const STALE_MS = 75 * 60_000;

const CloudIcon = () => (
  <svg className="w-6 h-6 text-sbluel" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
    />
  </svg>
);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2 border-b border-swhite/10 last:border-0">
      <dt className="text-sm text-swhite/60">{label}</dt>
      <dd className="text-swhite">{children}</dd>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="block text-sm text-swhite/60">{children}</span>;
const Code = ({ children }: { children: ReactNode }) => <span className="font-mono text-sm text-swhite/70 mr-2">{children}</span>;

function DecodedRows({ metar, full }: { metar: DecodedMetar; full: boolean }) {
  const clouds = cloudLines(metar);
  const runway = full ? null : runwayLine(runwayWind(metar.wind));
  const minimum = minimumVisibilityText(metar);
  return (
    <dl>
      <Row label="Tuuli">
        <span className="font-semibold">{windText(metar.wind)}</span>
        {windDetails(metar.wind).length > 0 && (
          <Muted>
            {windDetails(metar.wind).map((detail, i) => (
              <Fragment key={detail}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">{detail}</span>
              </Fragment>
            ))}
          </Muted>
        )}
      </Row>
      {runway && (
        <Row label="Kiitotie">
          {runway.runway && <span className="font-semibold mr-2">{runway.runway}</span>}
          {runway.text}
        </Row>
      )}
      <Row label="Näkyvyys">
        <span className="font-semibold">{visibilityText(metar)}</span>
        {minimum && <Muted>{minimum}</Muted>}
        {metar.rvr.map((rvr) => (
          <Muted key={rvr.code}>
            RVR {rvr.runway}: {rvr.text}
          </Muted>
        ))}
      </Row>
      {metar.weather.length > 0 && (
        <Row label="Sää">
          {metar.weather.map((w) => (
            <span key={w.code} className="block">
              <Code>{w.code}</Code>
              {w.text}
            </span>
          ))}
        </Row>
      )}
      <Row label="Pilvet">
        {clouds.length === 0 && "ei tietoa"}
        {clouds.map((line) => (
          <span key={line.code} className="block">
            {line.text}
            {line.note && <span className="text-sm text-swhite/60"> · {line.note}</span>}
          </span>
        ))}
      </Row>
      {full && (
        <Row label="Pilvikatto">{metar.ceilingFt === null ? "ei pilvikattoa" : formatFeet(metar.ceilingFt)}</Row>
      )}
      <Row label="Lämpötila">{temperatureText(metar)}</Row>
      <Row label="QNH">{metar.qnhHpa === null ? "ei tietoa" : `${metar.qnhHpa} hPa`}</Row>
      {metar.recentWeather.length > 0 && (
        <Row label="Äskettäin">
          {metar.recentWeather.map((w) => (
            <span key={w.code} className="block">
              <Code>{w.code}</Code>
              {w.text}
            </span>
          ))}
        </Row>
      )}
      {metar.trend.length > 0 && (
        <Row label="Muutokset">
          {metar.trend.map((t) => (
            <span key={t.code} className="block">
              {t.text}
              <Muted>
                <span className="font-mono">{t.code}</span>
              </Muted>
            </span>
          ))}
        </Row>
      )}
      {full && (metar.other.length > 0 || metar.remarks) && (
        <Row label="Muut">
          {metar.other.map((token) => (
            <span key={token} className="block">
              <Code>{token}</Code>
              {RUNWAY_STATE.test(token) && <span className="text-sm text-swhite/60">kiitotien kunto</span>}
            </span>
          ))}
          {metar.remarks && <Code>RMK {metar.remarks}</Code>}
        </Row>
      )}
    </dl>
  );
}

/**
 * EFSA's latest METAR, decoded the way aviation weather services show it:
 * the flight category, the raw report, and the groups in aviation units.
 * "full" adds the runway wind figure, the 12-hour wind chart and the reports
 * as a table (/kerho/kentta); "compact" has one runway line instead (home page).
 */
export default function WeatherWidget({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const [observations, setObservations] = useState<METARObservation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const response = await getRecentMETARs();
        if (cancelled) return;
        // A failed refresh keeps the reports already shown; their age tells
        if (response.success) setObservations(response.observations);
        setFailed(!response.success);
      } catch {
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setNow(Date.now());
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Oldest first, for the chart
  const points = useMemo<TrendPoint[]>(
    () =>
      (observations ?? [])
        .map((o) => ({ time: Date.parse(o.observedAt), metar: decodeMetar(o.raw) }))
        .sort((a, b) => a.time - b.time),
    [observations]
  );

  if (!observations && !failed) {
    return (
      <div className="glass rounded-2xl p-6 border border-sred/20 shadow-xl" aria-busy>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-sbluel/30 rounded w-3/4"></div>
          <div className="h-4 bg-sbluel/30 rounded w-1/2"></div>
          <div className="h-4 bg-sbluel/30 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const latest = points.at(-1);
  if (!latest) {
    return (
      <div className="glass rounded-2xl p-6 border border-sred/20 shadow-xl text-center">
        <p className="text-swhite/70">Säätietoja ei voitu ladata.</p>
        <p className="mt-2 text-sm text-swhite/60">
          Ajantasainen ilmailusää:{" "}
          <a href="https://www.ilmailusaa.fi" className="underline hover:text-swhite" target="_blank" rel="noopener noreferrer">
            ilmailusaa.fi
          </a>
        </p>
      </div>
    );
  }

  const metar = latest.metar;
  const full = variant === "full";
  const age = now - latest.time;

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 border border-sred/20 shadow-xl text-swhite">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b-2 border-sred">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CloudIcon />
            EFSA Savonlinna
          </h3>
          <p className="mt-1 text-sm text-swhite/70">
            Havainto klo {localTime(latest.time)} ({utcTime(latest.time)}) · {ageText(latest.time, now)}
            {metar.auto && " · automaattinen"}
            {metar.correction && " · korjattu"}
          </p>
        </div>
        <FlightCategoryBadge category={metar.category} />
      </div>

      {(age > STALE_MS || failed) && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-[#fab219]/40 bg-sblack/30 px-3 py-2 text-sm">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#fab219]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {age > STALE_MS ? `Havainto on ${ageText(latest.time, now).replace(" sitten", "")} vanha: uudempaa ei ole saatu.` : "Päivitys epäonnistui, näytetään edellinen havainto."}
        </p>
      )}

      <p className="font-mono text-sm leading-relaxed bg-sblack/40 rounded-lg px-3 py-2 break-words text-swhite/90">{metar.raw}</p>

      {full ? (
        <>
          <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start">
            <DecodedRows metar={metar} full />
            <RunwayWindFigure wind={metar.wind} summary={runwayWind(metar.wind)} />
          </div>
          {points.length > 1 && (
            <div className="mt-8">
              <WindTrendChart points={points} />
            </div>
          )}
          <details className="mt-6 group">
            <summary className="cursor-pointer text-sm font-semibold text-swhite/85 hover:text-swhite">
              Havainnot taulukkona ({points.length} kpl, 12 h)
            </summary>
            <div className="mt-3">
              <MetarTable points={points} />
            </div>
          </details>
          <div className="mt-6 space-y-1 text-xs text-swhite/55">
            <p>
              Sääluokka (VFR, MVFR, IFR, LIFR) on Yhdysvaltain ilmailuhallinnon FAA:n luokitus pilvikaton ja näkyvyyden
              mukaan, sama kuin aviationweather.gov:ssa. Se ei ole SERA:n VMC-minimi.
            </p>
            <p>
              Lähde: NOAA Aviation Weather Center. Lentoa suunnitellessa käytä virallista ilmailusäätä:{" "}
              <a href="https://www.ilmailusaa.fi" className="underline hover:text-swhite" target="_blank" rel="noopener noreferrer">
                ilmailusaa.fi
              </a>
              .
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3">
            <DecodedRows metar={metar} full={false} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-swhite/55">
            <span>Lähde: NOAA Aviation Weather Center</span>
            <Link href="/kerho/kentta#saa" className="text-sm font-semibold text-swhite/85 hover:text-swhite">
              Kiitotien tuulet ja 12 h historia →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
