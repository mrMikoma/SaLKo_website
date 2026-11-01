import type { FlightCategory } from "@/utilities/metarDecode";

/*
 * The weather widget's data colours, on its .glass surface (sblued #162752).
 * Checked with the dataviz skill's validate_palette.js, dark mode, against
 * that surface:
 *
 * - Flight categories, in their usual hues (VFR green, MVFR blue, IFR red,
 *   LIFR magenta, here a violet so it stays apart from the red). In this order
 *   they pass every check; as all pairs, VFR/IFR and MVFR/LIFR fall below the
 *   colour-blind separation, as green/red always does. So a category colour
 *   never appears alone: it is a dot beside the category's name.
 * - The wind chart: mean wind and gusts pass every check. They are kept apart
 *   from the category colours, and the chart's tooltip gives the category as
 *   text only.
 */
export const CATEGORY_COLOR: Record<FlightCategory, string> = {
  VFR: "#0ca30c",
  MVFR: "#3987e5",
  IFR: "#e66767",
  LIFR: "#b660d6",
};

export const WIND_COLOR = "#2f9fc2";
export const GUST_COLOR = "#d95926";

/** The surface, for the 2 px ring around dots */
export const SURFACE = "#162752";
export const GRID = "rgba(246, 244, 243, 0.10)";
export const AXIS = "rgba(246, 244, 243, 0.28)";
