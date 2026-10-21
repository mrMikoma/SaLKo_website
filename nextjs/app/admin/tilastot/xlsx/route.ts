import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { getYearStats, getYearTotals, thisYear } from "@/utilities/statsData";
import { statsWorkbook } from "@/utilities/statsWorkbook";
import { writeXlsx } from "@/utilities/xlsx";

/** The statistics page as an Excel workbook (?vuosi=2025&kone=OH-CON) */
export async function GET(request: Request) {
  if (!isFlightLogEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.roles || !hasPermission(session.user.roles, "VIEW_STATISTICS")) {
    return new Response("Forbidden", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const requested = Number(params.get("vuosi"));
  const year = Number.isInteger(requested) && requested > 1950 && requested < 2100 ? requested : thisYear();
  const [stats, yearTotals] = await Promise.all([
    getYearStats(year, params.get("kone")),
    getYearTotals(),
  ]);

  const file = `lentotilastot-${year}${stats.registration ? `-${stats.registration}` : ""}.xlsx`;
  return new Response(new Uint8Array(writeXlsx(statsWorkbook(stats, yearTotals))), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
