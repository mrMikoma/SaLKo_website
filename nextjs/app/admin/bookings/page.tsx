export const dynamic = 'force-dynamic';
import pool from "@/utilities/db";
import BookingsTable from "@/components/admin/bookingsTable";

async function getAllBookings() {
  try {
    const bookings = await pool.query(
      `SELECT
        b.id,
        b.user_id,
        b.plane,
        b.start_time,
        b.end_time,
        b.type,
        b.title,
        b.description,
        b.created_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        gb.contact_name as guest_name,
        gb.contact_email as guest_email,
        gb.contact_phone as guest_phone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN guest_bookings gb ON b.id = gb.booking_id
      ORDER BY b.start_time DESC`
    );

    return bookings.rows;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return null;
  }
}

export default async function BookingsPage() {
  const bookings = await getAllBookings();

  if (!bookings) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Virhe varausten lataamisessa</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Varaushallinta</h1>
        <p className="text-gray-600 mt-2">Hallinnoi kaikkia järjestelmän varauksia</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <BookingsTable bookings={bookings} />
      </div>
    </div>
  );
}
