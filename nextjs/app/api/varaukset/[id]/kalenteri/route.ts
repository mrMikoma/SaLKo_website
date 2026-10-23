import { auth } from "@/auth";
import connectionPool from "@/utilities/db";
import { buildIcs, CalendarEvent } from "@/utilities/calendarExport";

/**
 * GET /api/varaukset/:id/kalenteri — the booking as an .ics file, and with
 * ?sarja=1 also the bookings after it in the same repeat group. Served as
 * text/calendar so iPhones offer "Add to Calendar" instead of saving a file.
 * Logged-in members only, like the booking details in the calendar.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Kirjaudu sisään", { status: 401 });
  }

  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId) || bookingId < 0 || bookingId > 2_147_483_647) {
    return new Response("Varausta ei löytynyt", { status: 404 });
  }

  const series = new URL(request.url).searchParams.get("sarja") === "1";

  try {
    const response = series
      ? await connectionPool.query(
          `SELECT b.id, b.plane, b.title, b.description, b.start_time, b.end_time
           FROM bookings b
           JOIN bookings origin ON origin.id = $1
           WHERE b.id = origin.id
              OR (b.repeat_group_id = origin.repeat_group_id
                  AND b.start_time >= origin.start_time)
           ORDER BY b.start_time`,
          [bookingId]
        )
      : await connectionPool.query(
          `SELECT id, plane, title, description, start_time, end_time
           FROM bookings WHERE id = $1`,
          [bookingId]
        );

    if (response.rowCount === 0) {
      return new Response("Varausta ei löytynyt", { status: 404 });
    }

    const events: CalendarEvent[] = response.rows.map((row) => ({
      id: row.id,
      plane: row.plane,
      title: row.title,
      description: row.description,
      start_time: new Date(row.start_time).toISOString(),
      end_time: new Date(row.end_time).toISOString(),
    }));

    return new Response(buildIcs(events), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="varaus-${events[0].plane}-${bookingId}.ics"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting booking to calendar:", error);
    return new Response("Kalenteritiedoston luonti epäonnistui", { status: 500 });
  }
}
