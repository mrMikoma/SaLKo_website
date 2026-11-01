import type { FlightCategory } from "@/utilities/metarDecode";
import { CATEGORY_COLOR } from "@/components/weather/colors";
import { CATEGORY_TEXT } from "@/components/weather/format";

/** The category's name with its colour as a dot beside it, never the colour alone. */
export default function FlightCategoryBadge({ category, size = "md" }: { category: FlightCategory | null; size?: "sm" | "md" }) {
  if (!category) return null;
  const dot = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-swhite/15 bg-sblack/30 font-semibold text-swhite ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      title={`${category}: ${CATEGORY_TEXT[category]}`}
    >
      <span aria-hidden className={`${dot} rounded-full`} style={{ backgroundColor: CATEGORY_COLOR[category] }} />
      {category}
    </span>
  );
}
