/**
 * Head- and crosswind components on EFSA's runway from a METAR wind. METAR
 * wind directions are true, so the runway's true bearings are used, not the
 * magnetic runway numbers.
 */
import type { DecodedWind } from "@/utilities/metarDecode";

export interface RunwayEnd {
  id: string;
  trueBearing: number;
}

/** EF AD 2 EFSA AD 2.12 (eAIP AIRAC 006-2025): RWY 12/30, 2300 x 45 m. */
export const EFSA_RUNWAY_ENDS: RunwayEnd[] = [
  { id: "12", trueBearing: 125.66 },
  { id: "30", trueBearing: 305.69 },
];

export interface RunwayEndWind {
  runway: string;
  /** Rounded knots; negative is a tailwind */
  headwindKt: number;
  /** Rounded knots, always 0 or more */
  crosswindKt: number;
  /** The side the crosswind comes from; null when it rounds to 0 */
  crosswindFrom: "left" | "right" | null;
  /** The same in the gusts, when the METAR has them */
  gustHeadwindKt: number | null;
  gustCrosswindKt: number | null;
}

export interface RunwayWindSummary {
  kind: "calm" | "variable" | "steady";
  /** Both ends, the one with the most headwind first; empty when calm or VRB */
  ends: RunwayEndWind[];
  /**
   * The largest crosswind anywhere in the reported direction range (dddVddd),
   * at gust speed when there are gusts; for VRB the whole wind speed.
   */
  maxCrosswindKt: number | null;
}

const RADIANS = Math.PI / 180;

// Rounds without producing -0, so a tailwind of 0.3 kt reads "0 kt"
const round = (value: number) => Math.round(value) || 0;

/** Signed components: headwind > 0 into the runway, crosswind > 0 from the right. */
export function windComponents(directionTrue: number, speedKt: number, runwayBearingTrue: number) {
  const angle = (directionTrue - runwayBearingTrue) * RADIANS;
  return { headwind: speedKt * Math.cos(angle), crosswind: speedKt * Math.sin(angle) };
}

function endWind(wind: DecodedWind, end: RunwayEnd): RunwayEndWind {
  const { headwind, crosswind } = windComponents(wind.direction as number, wind.speedKt as number, end.trueBearing);
  const gust = wind.gustKt === null ? null : windComponents(wind.direction as number, wind.gustKt, end.trueBearing);
  const crosswindKt = Math.abs(round(crosswind));
  return {
    runway: end.id,
    headwindKt: round(headwind),
    crosswindKt,
    crosswindFrom: crosswindKt === 0 ? null : crosswind > 0 ? "right" : "left",
    gustHeadwindKt: gust ? round(gust.headwind) : null,
    gustCrosswindKt: gust ? Math.abs(round(gust.crosswind)) : null,
  };
}

/** The largest |crosswind| over a clockwise direction range, checked degree by degree. */
function maxCrosswindInRange(from: number, to: number, speedKt: number, ends: RunwayEnd[]): number {
  const span = (to - from + 360) % 360;
  let max = 0;
  for (let step = 0; step <= span; step++) {
    const direction = (from + step) % 360;
    for (const end of ends) {
      max = Math.max(max, Math.abs(windComponents(direction, speedKt, end.trueBearing).crosswind));
    }
  }
  return round(max);
}

export function runwayWind(wind: DecodedWind | null, ends: RunwayEnd[] = EFSA_RUNWAY_ENDS): RunwayWindSummary | null {
  if (!wind || wind.speedKt === null) return null;
  if (wind.calm || wind.speedKt === 0) return { kind: "calm", ends: [], maxCrosswindKt: null };
  const strongest = wind.gustKt ?? wind.speedKt;
  if (wind.variable || wind.direction === null) return { kind: "variable", ends: [], maxCrosswindKt: strongest };

  const perEnd = ends.map((end) => endWind(wind, end)).sort((a, b) => b.headwindKt - a.headwindKt);
  const ranged =
    wind.varyingFrom !== null && wind.varyingTo !== null
      ? maxCrosswindInRange(wind.varyingFrom, wind.varyingTo, strongest, ends)
      : null;
  return { kind: "steady", ends: perEnd, maxCrosswindKt: ranged };
}
