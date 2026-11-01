/**
 * Decodes a METAR (ICAO Annex 3 / WMO FM 15) into structured data, for the
 * weather widget. Pure functions only, so the client and the tests use it.
 *
 * The cronjob also stores a few display strings in metar_data, but they lose
 * too much (CAVOK, cloud layers, CB, weather), so the widget decodes
 * raw_metar itself.
 */

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export interface DecodedWind {
  /** 00000KT */
  calm: boolean;
  /** VRB: no mean direction */
  variable: boolean;
  /** Degrees true, as METARs report it; null when calm, VRB or missing */
  direction: number | null;
  speedKt: number | null;
  gustKt: number | null;
  /** dddVddd: the direction varies clockwise from `from` to `to` */
  varyingFrom: number | null;
  varyingTo: number | null;
}

export interface DecodedVisibility {
  /** Prevailing visibility in metres; 10000 for 9999 or CAVOK */
  metres: number;
  /** 9999 or CAVOK: 10 km or more */
  tenOrMore: boolean;
  /** The lowest visibility in one direction, when reported; direction null when not given */
  minimum: { metres: number; direction: string | null } | null;
}

export type CloudCover = "FEW" | "SCT" | "BKN" | "OVC" | "VV";

export interface CloudLayer {
  /** null when an automatic station could not tell the amount (///) */
  cover: CloudCover | null;
  /** Feet above the aerodrome; null when unknown */
  heightFt: number | null;
  /** CB or TCU, the only types a METAR names */
  type: "CB" | "TCU" | null;
  code: string;
}

export interface WeatherGroup {
  code: string;
  text: string;
}

export interface TrendGroup {
  kind: "NOSIG" | "BECMG" | "TEMPO";
  code: string;
  text: string;
}

export interface RunwayVisualRange {
  runway: string;
  code: string;
  text: string;
}

export interface DecodedMetar {
  raw: string;
  station: string | null;
  /** The DDHHMMZ group as the METAR has it, e.g. 011920Z */
  timeCode: string | null;
  auto: boolean;
  correction: boolean;
  /** NIL: the report is missing */
  missing: boolean;
  wind: DecodedWind | null;
  cavok: boolean;
  visibility: DecodedVisibility | null;
  rvr: RunwayVisualRange[];
  weather: WeatherGroup[];
  recentWeather: WeatherGroup[];
  clouds: CloudLayer[];
  /** NSC, NCD, SKC or CLR, when that is all the METAR says about cloud */
  noCloud: "NSC" | "NCD" | "SKC" | "CLR" | null;
  temperatureC: number | null;
  dewPointC: number | null;
  qnhHpa: number | null;
  trend: TrendGroup[];
  remarks: string | null;
  /** Groups the widget does not decode (runway state, wind shear...), as written */
  other: string[];
  /** The lowest BKN, OVC or VV layer, in feet */
  ceilingFt: number | null;
  category: FlightCategory | null;
}

const WIND = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/;
const WIND_VARIATION = /^(\d{3})V(\d{3})$/;
const VISIBILITY = /^(\d{4})(NDV)?$/;
// Automatic stations leave out the direction when they cannot tell it (9999 1800)
const MIN_VISIBILITY = /^(\d{4})(N|NE|E|SE|S|SW|W|NW)?$/;
const VISIBILITY_SM = /^(P|M)?(\d{1,2})SM$/;
const VISIBILITY_SM_FRACTION = /^(M)?(\d)\/(\d{1,2})SM$/;
const RVR = /^R(\d{2}[LCR]?)\/([PM]?)(\d{4})(?:V([PM]?)(\d{4}))?(FT)?\/?([UDN])?$/;
const WEATHER =
  /^(RE)?(\+|-|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)*)$/;
const CLOUD = /^(FEW|SCT|BKN|OVC|\/{3})(\d{3}|\/{3})(CB|TCU|\/{3})?$/;
const VERTICAL_VISIBILITY = /^VV(\d{3}|\/{3})$/;
const TEMPERATURE = /^(M?\d{2})\/(M?\d{2})?$/;
const QNH = /^Q(\d{4})$/;
const ALTIMETER = /^A(\d{4})$/;
const TIME = /^(\d{2})(\d{2})(\d{2})Z$/;
const TREND_TIME = /^(FM|TL|AT)(\d{2})(\d{2})$/;

const KT_PER_MPS = 1 / 0.514444;
const KT_PER_KMH = 1 / 1.852;
const METRES_PER_SM = 1609.344;

const DESCRIPTOR_ADJECTIVE: Record<string, string> = {
  MI: "matala",
  BC: "hajanainen",
  PR: "osittainen",
  DR: "ajelehtiva",
  BL: "pöllyävä",
  FZ: "jäätävä",
};

const PHENOMENON: Record<string, string> = {
  DZ: "tihku",
  RA: "sade",
  SN: "lumisade",
  SG: "lumijyväset",
  IC: "jääneulaset",
  PL: "jääjyväset",
  GR: "rakeet",
  GS: "lumirakeet",
  UP: "tuntematon sade",
  BR: "utu",
  FG: "sumu",
  FU: "savu",
  VA: "tuhka",
  DU: "pöly",
  SA: "hiekka",
  HZ: "auer",
  PY: "vesipöly",
  PO: "pölypyörteitä",
  SQ: "puuskia",
  FC: "trombi",
  SS: "hiekkamyrsky",
  DS: "pölymyrsky",
};

// The first part of "...kuuroja": sadekuuroja, lumikuuroja, raekuuroja
const SHOWER_STEM: Record<string, string> = {
  RA: "sade",
  SN: "lumi",
  GR: "rae",
  GS: "lumirae",
  PL: "jääjyvä",
  UP: "",
};

export const CLOUD_COVER_OKTAS: Record<CloudCover, string> = {
  FEW: "1–2/8",
  SCT: "3–4/8",
  BKN: "5–7/8",
  OVC: "8/8",
  VV: "taivas ei näy",
};

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const signedTemperature = (value: string) => (value.startsWith("M") ? -Number(value.slice(1)) : Number(value));

const toKnots = (value: number, unit: string) =>
  unit === "MPS" ? Math.round(value * KT_PER_MPS) : unit === "KMH" ? Math.round(value * KT_PER_KMH) : value;

function phenomenaText(codes: string[]): string {
  const joined = codes.join("");
  if (joined === "RASN" || joined === "SNRA") return "räntäsade";
  return codes.map((code) => PHENOMENON[code] ?? code).join(" ja ");
}

/** "-SHRA" -> "heikkoja sadekuuroja", "BCFG" -> "hajanainen sumu" and so on. */
export function describeWeather(code: string): string {
  if (code === "//") return "ei havaittu";
  const match = code.match(WEATHER);
  if (!match) return code;
  const [, , intensity, descriptor, phenomenaPart] = match;
  const phenomena = phenomenaPart.match(/.{2}/g) ?? [];
  const nearby = intensity === "VC";
  let text: string;

  if (descriptor === "SH") {
    const stems = phenomena.map((p) => SHOWER_STEM[p] ?? PHENOMENON[p] ?? p).filter(Boolean);
    const showers = stems.length === 0 ? "kuuroja" : stems.length === 1 ? `${stems[0]}kuuroja` : `${stems.slice(0, -1).join("-, ")}- ja ${stems.at(-1)}kuuroja`;
    const adjective = intensity === "-" ? "heikkoja " : intensity === "+" ? "voimakkaita " : "";
    text = adjective + showers;
  } else if (descriptor === "TS") {
    const adjective = intensity === "+" ? "voimakas " : "";
    const rest = phenomena.length ? ` ja ${intensity === "-" ? "heikko " : ""}${phenomenaText(phenomena)}` : "";
    text = `${adjective}ukkonen${rest}`;
  } else if (descriptor === "BC" && phenomena.join("") === "FG") {
    text = "sumupaikkoja";
  } else {
    const adjective = intensity === "-" ? "heikko " : intensity === "+" ? "voimakas " : "";
    const describing = descriptor ? `${DESCRIPTOR_ADJECTIVE[descriptor]} ` : "";
    // Blowing or drifting snow is snow lifted by the wind, not snowfall
    const lifted = descriptor === "BL" || descriptor === "DR";
    const named = lifted ? phenomena.map((p) => (p === "SN" ? "lumi" : PHENOMENON[p] ?? p)).join(" ja ") : phenomenaText(phenomena);
    text = adjective + describing + (phenomena.length ? named : "");
  }
  text = text.trim();
  return nearby ? `${text} lähistöllä` : text;
}

function decodeVisibility(metres: number) {
  return { metres: metres >= 9999 ? 10000 : metres, tenOrMore: metres >= 9999 };
}

function decodeRvr(match: RegExpMatchArray, code: string): RunwayVisualRange {
  const [, runway, prefix, value, varPrefix, varValue, feet, tendency] = match;
  const unit = feet ? "ft" : "m";
  const bound = (p: string | undefined) => (p === "P" ? "yli " : p === "M" ? "alle " : "");
  const amount = (p: string | undefined, v: string) => `${bound(p)}${Number(v).toLocaleString("fi-FI")} ${unit}`;
  const range = varValue ? `${amount(prefix, value)}–${amount(varPrefix, varValue)}` : amount(prefix, value);
  const trend = tendency === "U" ? ", paranee" : tendency === "D" ? ", heikkenee" : tendency === "N" ? ", ei muutosta" : "";
  return { runway, code, text: `${range}${trend}` };
}

/** Decodes the groups of one BECMG or TEMPO trend into short Finnish text. */
function describeTrendGroups(tokens: string[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    const time = token.match(TREND_TIME);
    const wind = token.match(WIND);
    const visibility = token.match(VISIBILITY);
    const cloud = token.match(CLOUD);
    const vv = token.match(VERTICAL_VISIBILITY);
    if (time) {
      const word = time[1] === "FM" ? "alkaen" : time[1] === "TL" ? "asti" : "klo";
      parts.push(`${time[2]}${time[3]}Z ${word}`);
    } else if (token === "CAVOK") {
      parts.push("CAVOK");
    } else if (token === "NSW") {
      parts.push("ei merkittävää säätä");
    } else if (token === "NSC") {
      parts.push("ei merkittäviä pilviä");
    } else if (wind) {
      const speed = toKnots(Number(wind[2]), wind[4]);
      const gust = wind[3] ? `, puuskat ${toKnots(Number(wind[3]), wind[4])} kt` : "";
      parts.push(`tuuli ${wind[1] === "VRB" ? "vaihteleva" : `${wind[1]}°`} ${speed} kt${gust}`);
    } else if (visibility) {
      parts.push(`näkyvyys ${formatVisibility(decodeVisibility(Number(visibility[1])).metres)}`);
    } else if (cloud) {
      const height = cloud[2].startsWith("/") ? "" : ` ${formatFeet(Number(cloud[2]) * 100)}`;
      parts.push(`${cloud[1]}${height}${cloud[3] && !cloud[3].startsWith("/") ? ` ${cloud[3]}` : ""}`);
    } else if (vv) {
      parts.push(`pystynäkyvyys ${vv[1].startsWith("/") ? "?" : formatFeet(Number(vv[1]) * 100)}`);
    } else if (WEATHER.test(token) && token !== "" && !/^(RE)?(\+|-|VC)?$/.test(token)) {
      parts.push(describeWeather(token));
    } else {
      parts.push(token);
    }
  }
  return parts.join(", ");
}

export function formatFeet(feet: number): string {
  return `${feet.toLocaleString("fi-FI")} ft`;
}

export function formatVisibility(metres: number): string {
  if (metres >= 10000) return "10 km tai yli";
  if (metres >= 5000) return `${(Math.floor(metres / 100) / 10).toLocaleString("fi-FI")} km`;
  return `${metres.toLocaleString("fi-FI")} m`;
}

export function compassPoint(degrees: number): string {
  return COMPASS[Math.round(degrees / 45) % 8];
}

/**
 * The flight category as aviationweather.gov and most flight-planning apps
 * show it: the worse of ceiling and visibility. It is the FAA's scheme, not a
 * legal minimum in Finland (SERA's VMC minima differ).
 */
export function flightCategory(visibilityMetres: number | null, ceilingFt: number | null, cloudKnown: boolean): FlightCategory | null {
  if (visibilityMetres === null || !cloudKnown) return null;
  const byVisibility: FlightCategory =
    visibilityMetres < METRES_PER_SM ? "LIFR" : visibilityMetres < 3 * METRES_PER_SM ? "IFR" : visibilityMetres <= 5 * METRES_PER_SM ? "MVFR" : "VFR";
  const byCeiling: FlightCategory =
    ceilingFt === null ? "VFR" : ceilingFt < 500 ? "LIFR" : ceilingFt < 1000 ? "IFR" : ceilingFt <= 3000 ? "MVFR" : "VFR";
  const order: FlightCategory[] = ["VFR", "MVFR", "IFR", "LIFR"];
  return order[Math.max(order.indexOf(byVisibility), order.indexOf(byCeiling))];
}

export function decodeMetar(raw: string): DecodedMetar {
  const result: DecodedMetar = {
    raw: raw.trim(),
    station: null,
    timeCode: null,
    auto: false,
    correction: false,
    missing: false,
    wind: null,
    cavok: false,
    visibility: null,
    rvr: [],
    weather: [],
    recentWeather: [],
    clouds: [],
    noCloud: null,
    temperatureC: null,
    dewPointC: null,
    qnhHpa: null,
    trend: [],
    remarks: null,
    other: [],
    ceilingFt: null,
    category: null,
  };

  let tokens = result.raw.replace(/=$/, "").split(/\s+/).filter(Boolean);
  if (tokens[0] === "METAR" || tokens[0] === "SPECI") tokens = tokens.slice(1);

  const remarksAt = tokens.indexOf("RMK");
  if (remarksAt >= 0) {
    result.remarks = tokens.slice(remarksAt + 1).join(" ") || null;
    tokens = tokens.slice(0, remarksAt);
  }

  const trendAt = tokens.findIndex((t) => t === "NOSIG" || t === "BECMG" || t === "TEMPO");
  if (trendAt >= 0) {
    let current: { kind: TrendGroup["kind"]; tokens: string[] } | null = null;
    for (const token of tokens.slice(trendAt)) {
      if (token === "NOSIG" || token === "BECMG" || token === "TEMPO") {
        if (current) result.trend.push(finishTrend(current));
        current = { kind: token, tokens: [] };
      } else {
        current?.tokens.push(token);
      }
    }
    if (current) result.trend.push(finishTrend(current));
    tokens = tokens.slice(0, trendAt);
  }

  let visibilitySeen = false;
  let i = 0;
  if (tokens[i] === "COR") {
    result.correction = true;
    i++;
  }
  if (tokens[i] && /^[A-Z]{4}$/.test(tokens[i]) && tokens[i + 1] && TIME.test(tokens[i + 1])) {
    result.station = tokens[i];
    i++;
  }

  for (; i < tokens.length; i++) {
    const token = tokens[i];
    let match: RegExpMatchArray | null;

    if (!result.timeCode && TIME.test(token)) {
      result.timeCode = token;
    } else if (token === "AUTO") {
      result.auto = true;
    } else if (token === "COR") {
      result.correction = true;
    } else if (token === "NIL") {
      result.missing = true;
    } else if (!result.wind && (match = token.match(WIND))) {
      const [, direction, speed, gust, unit] = match;
      const speedKt = toKnots(Number(speed), unit);
      result.wind = {
        calm: direction === "000" && speedKt === 0,
        variable: direction === "VRB",
        direction: direction === "VRB" || (direction === "000" && speedKt === 0) ? null : Number(direction),
        speedKt,
        gustKt: gust ? toKnots(Number(gust), unit) : null,
        varyingFrom: null,
        varyingTo: null,
      };
    } else if (/^\/{3,5}(KT|MPS)$/.test(token) || /^\d{3}\/\/(KT|MPS)$/.test(token)) {
      // An automatic station without a wind reading
      result.other.push(token);
    } else if (result.wind && (match = token.match(WIND_VARIATION))) {
      result.wind.varyingFrom = Number(match[1]);
      result.wind.varyingTo = Number(match[2]);
    } else if (token === "CAVOK") {
      result.cavok = true;
      result.visibility = { ...decodeVisibility(9999), minimum: null };
    } else if (!visibilitySeen && (match = token.match(VISIBILITY))) {
      visibilitySeen = true;
      result.visibility = { ...decodeVisibility(Number(match[1])), minimum: null };
    } else if (result.visibility && !result.visibility.minimum && !result.cavok && (match = token.match(MIN_VISIBILITY))) {
      result.visibility.minimum = { metres: Number(match[1]), direction: match[2] ?? null };
    } else if (!visibilitySeen && (match = token.match(VISIBILITY_SM))) {
      visibilitySeen = true;
      const miles = Number(match[2]);
      const metres = Math.round(miles * METRES_PER_SM);
      result.visibility = {
        metres: match[1] === "P" || miles >= 7 ? 10000 : metres,
        tenOrMore: match[1] === "P" || miles >= 7,
        minimum: null,
      };
    } else if (!visibilitySeen && (match = token.match(VISIBILITY_SM_FRACTION))) {
      visibilitySeen = true;
      // "1 1/2SM" is two groups; the whole miles went to `other` a step ago
      const whole = /^\d$/.test(tokens[i - 1] ?? "") ? Number(tokens[i - 1]) : 0;
      if (whole && result.other.at(-1) === tokens[i - 1]) result.other.pop();
      result.visibility = {
        metres: Math.round((whole + Number(match[2]) / Number(match[3])) * METRES_PER_SM),
        tenOrMore: false,
        minimum: null,
      };
    } else if (token === "////" && !visibilitySeen) {
      visibilitySeen = true;
    } else if ((match = token.match(RVR))) {
      result.rvr.push(decodeRvr(match, token));
    } else if ((match = token.match(CLOUD))) {
      const [, cover, height, type] = match;
      result.clouds.push({
        cover: cover.startsWith("/") ? null : (cover as CloudCover),
        heightFt: height.startsWith("/") ? null : Number(height) * 100,
        type: type === "CB" || type === "TCU" ? type : null,
        code: token,
      });
    } else if ((match = token.match(VERTICAL_VISIBILITY))) {
      result.clouds.push({
        cover: "VV",
        heightFt: match[1].startsWith("/") ? null : Number(match[1]) * 100,
        type: null,
        code: token,
      });
    } else if (token === "NSC" || token === "NCD" || token === "SKC" || token === "CLR") {
      result.noCloud = token;
    } else if ((match = token.match(TEMPERATURE))) {
      result.temperatureC = signedTemperature(match[1]);
      result.dewPointC = match[2] ? signedTemperature(match[2]) : null;
    } else if ((match = token.match(QNH))) {
      result.qnhHpa = Number(match[1]);
    } else if ((match = token.match(ALTIMETER))) {
      result.qnhHpa = Math.round((Number(match[1]) / 100) * 33.8639);
    } else if (token === "//") {
      result.weather.push({ code: token, text: describeWeather(token) });
    } else if ((match = token.match(WEATHER)) && (match[3] || match[4])) {
      const group = { code: token, text: describeWeather(token.replace(/^RE/, "")) };
      if (match[1]) result.recentWeather.push(group);
      else result.weather.push(group);
    } else {
      result.other.push(token);
    }
  }

  const ceilings = result.clouds
    .filter((c) => (c.cover === "BKN" || c.cover === "OVC" || c.cover === "VV") && c.heightFt !== null)
    .map((c) => c.heightFt as number);
  result.ceilingFt = ceilings.length ? Math.min(...ceilings) : null;
  const cloudKnown = result.cavok || result.noCloud !== null || result.clouds.some((c) => c.cover !== null);
  result.category = result.missing ? null : flightCategory(result.visibility?.metres ?? null, result.ceilingFt, cloudKnown);
  return result;
}

function finishTrend(group: { kind: TrendGroup["kind"]; tokens: string[] }): TrendGroup {
  const code = [group.kind, ...group.tokens].join(" ");
  if (group.kind === "NOSIG") return { kind: "NOSIG", code, text: "ei merkittäviä muutoksia seuraavan 2 tunnin aikana" };
  const word = group.kind === "BECMG" ? "muuttumassa" : "ajoittain";
  return { kind: group.kind, code, text: `${word}: ${describeTrendGroups(group.tokens)}` };
}
