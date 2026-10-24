import type { TemplateCell, TemplateSheet } from "@/utilities/flightSheetTemplate";
import type { YearStats } from "@/utilities/statsData";
import type { Totals, YearTotal } from "@/utilities/flightStats";
import { INTRO_FLIGHT_DAYS_PER_YEAR } from "@/utilities/flightStats";

/**
 * The statistics page as a workbook for utilities/xlsx.ts: one tab per
 * section. Times are durations ([h]:mm), dates real dates, so the numbers
 * can be summed and charted in Excel or Sheets.
 */

const MONTHS = [
  "tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu",
  "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu",
];

const header = (...labels: string[]): TemplateCell[] => labels.map((value) => ({ value, style: "header" }));
const title = (value: string): TemplateCell[] => [{ value, style: "title" }];
const text = (value: string | number): TemplateCell => ({ value });
const duration = (minutes: number): TemplateCell => ({ value: minutes / 1440, style: "duration" });
const totalsCells = (totals: Totals): TemplateCell[] => [
  text(totals.flights),
  duration(totals.minutes),
  text(totals.landings),
];
// Days since 1899-12-30, as spreadsheets count dates
const date = (iso: string): TemplateCell => ({
  value: (Date.parse(`${iso}T00:00:00Z`) - Date.parse("1899-12-30T00:00:00Z")) / 86_400_000,
  style: "date",
});

const tab = (name: string, widths: number[], rows: TemplateCell[][]): TemplateSheet => ({
  name,
  widths,
  rows,
  frozenRows: 0,
  validations: [],
});

export function statsWorkbook(stats: YearStats, yearTotals: YearTotal[]): TemplateSheet[] {
  const scope = stats.registration ?? "kaikki koneet";
  const years = [...new Set(yearTotals.map((t) => t.year))].sort((a, b) => b - a);
  const aircraft = [...new Set(yearTotals.map((t) => t.registration))].sort();

  return [
    tab("Yhteenveto", [22, 14], [
      title(`Lentotilastot ${stats.year}, ${scope}`),
      [],
      [text("Lentoja"), text(stats.totals.flights)],
      [text("Lentoaika"), duration(stats.totals.minutes)],
      [text("Laskuja"), text(stats.totals.landings)],
      [],
      [text(`Lentoja ${stats.year - 1}`), text(stats.previousTotals.flights)],
      [text(`Lentoaika ${stats.year - 1}`), duration(stats.previousTotals.minutes)],
      [text(`Laskuja ${stats.year - 1}`), text(stats.previousTotals.landings)],
    ]),
    tab("Kuukausittain", [14, 10, 10, 10, 14], [
      header("Kuukausi", "Lentoja", "Aika", "Laskuja", `Aika ${stats.year - 1}`),
      ...stats.months.map((month, i) => [
        text(MONTHS[i]),
        ...totalsCells(month),
        duration(stats.previousMonths[i].minutes),
      ]),
      [text("Yhteensä"), ...totalsCells(stats.totals), duration(stats.previousTotals.minutes)],
    ]),
    tab("Lentäjät", [26, 8, 12, 12, 14, 14], [
      header("Lentäjä", "Jäsen", "Lentoja (PIC)", "Aika (PIC)", "Lentoja (oppilas/SIC)", "Aika (oppilas/SIC)"),
      ...stats.pilots.map((pilot) => [
        text(pilot.name),
        text(pilot.member ? "kyllä" : "ei"),
        text(pilot.asPic.flights),
        duration(pilot.asPic.minutes),
        text(pilot.asSecond.flights),
        duration(pilot.asSecond.minutes),
      ]),
    ]),
    tab("Tarkoitukset", [10, 24, 10, 10, 10], [
      header("Koodi", "Tarkoitus", "Lentoja", "Aika", "Laskuja"),
      ...stats.purposes.map((purpose) => [text(purpose.code), text(purpose.name), ...totalsCells(purpose.totals)]),
    ]),
    tab("Lentotoimintailmoitus", [44, 10, 10, 10], [
      title(`Lentotoimintailmoitus ${stats.year}`),
      ...stats.reports.flatMap((report) => [
        [],
        title(report.registration),
        header("", "Lentoa", "Tuntia", "Laskua"),
        ...report.rows.map((row) => [
          { value: row.kind === "code" ? `  ${row.label}` : row.label, style: row.kind === "code" ? undefined : ("header" as const) },
          text(row.totals.flights),
          duration(row.totals.minutes),
          text(row.totals.landings),
        ]),
        ...(report.counters
          ? [
              [text("Kokonaisaika vuoden lopussa"), text(""), duration(report.counters.airframeMinutes), text(report.counters.totalLandings)],
              ...(report.counters.breaks.length > 0
                ? [[text(`Laskurit eivät jatku riveillä ${report.counters.breaks.join(", ")}`)]]
                : []),
            ]
          : []),
      ]),
    ]),
    tab("Esittelylennot", [12, 10, 14, 40], [
      title(`Esittelylentopäivät ${stats.year}: ${stats.introDays.length} / ${INTRO_FLIGHT_DAYS_PER_YEAR}`),
      header("Päivä", "Lentoja", "Lennätettäviä", "Lentäjät"),
      ...stats.introDays.map((day) => [date(day.date), text(day.flights), text(day.passengers), text(day.pilots.join(", "))]),
    ]),
    tab("Vuosittain", [8, ...aircraft.map(() => 10)], [
      header("Vuosi", ...aircraft),
      ...years.map((year) => [
        text(year),
        ...aircraft.map((reg) => {
          const total = yearTotals.find((t) => t.year === year && t.registration === reg);
          return total ? duration(total.minutes) : text("");
        }),
      ]),
    ]),
  ];
}
