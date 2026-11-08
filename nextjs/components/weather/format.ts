import { CLOUD_COVER_OKTAS, formatFeet, formatVisibility, type DecodedMetar, type DecodedWind, type FlightCategory } from "@/utilities/metarDecode";
import type { RunwayEndWind, RunwayWindSummary } from "@/utilities/runwayWind";

// CLUB_ZONE in utilities/clubTime.ts. Not imported from there: that module sets
// Luxon's default zone, which would bring Luxon into the home page's bundle.
const ZONE = "Europe/Helsinki";

const localClock = new Intl.DateTimeFormat("fi-FI", { hour: "2-digit", minute: "2-digit", timeZone: ZONE });
const localHour = new Intl.DateTimeFormat("fi-FI", { hour: "numeric", hourCycle: "h23", timeZone: ZONE });

/** 21.20, Finnish time */
export const localTime = (ms: number) => localClock.format(ms);

/** The local hour 0–23, for the chart's ticks */
export const localHourOf = (ms: number) => Number(localHour.format(ms));

/** 1920Z */
export function utcTime(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}Z`;
}

export function ageText(ms: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - ms) / 60000));
  if (minutes < 1) return "juuri äsken";
  if (minutes < 60) return `${minutes} min sitten`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min sitten` : `${hours} h sitten`;
  }
  return `${Math.floor(minutes / 1440)} pv sitten`;
}

const ms = (kt: number) => Math.round(kt * 0.514444);

/** "230° 8 kt", "tyyntä", "vaihteleva 3 kt" */
export function windText(wind: DecodedWind | null): string {
  if (!wind || wind.speedKt === null) return "ei tietoa";
  if (wind.calm) return "tyyntä";
  const direction = wind.variable || wind.direction === null ? "vaihteleva" : `${String(wind.direction).padStart(3, "0")}°`;
  return `${direction} ${wind.speedKt} kt`;
}

/** The second line under the wind: m/s, gusts, the direction range */
export function windDetails(wind: DecodedWind | null): string[] {
  if (!wind || wind.speedKt === null || wind.calm) return [];
  const details = [`${ms(wind.speedKt)} m/s`];
  if (wind.gustKt !== null) details.push(`puuskat ${wind.gustKt} kt (${ms(wind.gustKt)} m/s)`);
  if (wind.varyingFrom !== null && wind.varyingTo !== null) {
    details.push(`vaihtelee ${String(wind.varyingFrom).padStart(3, "0")}°–${String(wind.varyingTo).padStart(3, "0")}°`);
  }
  return details;
}

export function visibilityText(metar: DecodedMetar): string {
  if (!metar.visibility) return "ei tietoa";
  return formatVisibility(metar.visibility.metres);
}

export function minimumVisibilityText(metar: DecodedMetar): string | null {
  const minimum = metar.visibility?.minimum;
  if (!minimum) return null;
  return `pienin ${formatVisibility(minimum.metres)}${minimum.direction ? ` suunnassa ${minimum.direction}` : ""}`;
}

export interface CloudLine {
  code: string;
  text: string;
  note: string | null;
}

/** One line per layer, or what the METAR says instead of layers */
export function cloudLines(metar: DecodedMetar): CloudLine[] {
  if (metar.cavok) return [{ code: "CAVOK", text: "ei pilviä alle 5 000 ft", note: "ei CB- eikä TCU-pilviä" }];
  if (metar.clouds.length === 0) {
    if (metar.noCloud === "NCD") return [{ code: "NCD", text: "ei havaittuja pilviä", note: "automaattiasema" }];
    if (metar.noCloud === "NSC") return [{ code: "NSC", text: "ei merkittäviä pilviä", note: null }];
    if (metar.noCloud) return [{ code: metar.noCloud, text: "selkeää", note: null }];
    return [];
  }
  return metar.clouds.map((layer) => {
    const type = layer.type === "CB" ? "cumulonimbus (ukkospilvi)" : layer.type === "TCU" ? "kohoava kumpupilvi" : null;
    if (layer.cover === null) {
      return {
        code: layer.code,
        text: type ? `${layer.type} havaittu` : "pilviä",
        note: layer.heightFt === null ? "määrä ja korkeus tuntematon" : `korkeus ${formatFeet(layer.heightFt)}, määrä tuntematon`,
      };
    }
    if (layer.cover === "VV") {
      return {
        code: layer.code,
        text: `pystynäkyvyys ${layer.heightFt === null ? "tuntematon" : formatFeet(layer.heightFt)}`,
        note: "taivas ei näy",
      };
    }
    const height = layer.heightFt === null ? "korkeus tuntematon" : formatFeet(layer.heightFt);
    return {
      code: layer.code,
      text: `${layer.cover} ${height}${layer.type ? ` ${layer.type}` : ""}`,
      note: [CLOUD_COVER_OKTAS[layer.cover], type].filter(Boolean).join(", "),
    };
  });
}

export function temperatureText(metar: DecodedMetar): string {
  if (metar.temperatureC === null) return "ei tietoa";
  const dew = metar.dewPointC === null ? "" : `, kastepiste ${metar.dewPointC} °C`;
  return `${metar.temperatureC} °C${dew}`;
}

const SIDE = { left: "vasemmalta", right: "oikealta" } as const;

/** "vastatuuli 2 kt", "myötätuuli 2 kt" */
export function alongText(end: RunwayEndWind, gust = false): string {
  const value = gust ? end.gustHeadwindKt : end.headwindKt;
  if (value === null) return "";
  return value < 0 ? `myötätuuli ${-value} kt` : `vastatuuli ${value} kt`;
}

/** "sivutuuli 8 kt vasemmalta" */
export function acrossText(end: RunwayEndWind, gust = false): string {
  const value = gust ? end.gustCrosswindKt : end.crosswindKt;
  if (value === null) return "";
  return value === 0 ? "ei sivutuulta" : `sivutuuli ${value} kt ${end.crosswindFrom ? SIDE[end.crosswindFrom] : ""}`.trim();
}

/** The compact widget's runway row: the runway end with the most headwind */
export function runwayLine(summary: RunwayWindSummary | null): { runway: string | null; text: string } | null {
  if (!summary) return null;
  if (summary.kind === "calm") return { runway: null, text: "tyyntä, kumpi tahansa" };
  if (summary.kind === "variable") return { runway: null, text: `suunta vaihtelee, sivutuulta voi olla ${summary.maxCrosswindKt} kt` };
  const best = summary.ends[0];
  const gust = best.gustCrosswindKt !== null ? `, puuskissa ${best.gustCrosswindKt} kt` : "";
  return { runway: best.runway, text: `${alongText(best)}, ${acrossText(best)}${gust}` };
}

export const CATEGORY_TEXT: Record<FlightCategory, string> = {
  VFR: "hyvä näkyvyys, pilvikatto yli 3 000 ft",
  MVFR: "näkyvyys 5–8 km tai pilvikatto 1 000–3 000 ft",
  IFR: "näkyvyys 1,6–5 km tai pilvikatto 500–999 ft",
  LIFR: "näkyvyys alle 1,6 km tai pilvikatto alle 500 ft",
};
