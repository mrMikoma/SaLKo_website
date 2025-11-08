export const dynamic = 'force-dynamic';
import pool from "@/utilities/db";
import Link from "next/link";

async function getStats() {
  try {
    const [userStats, bookingStats, recentUsers] = await Promise.all([
      // User statistics
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE role = 'user') as users,
          COUNT(*) FILTER (WHERE role = 'guest') as guests,
          COUNT(*) FILTER (WHERE auth_provider = 'google') as google_users
        FROM users`
      ),
      // Booking statistics
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE start_time >= NOW()) as upcoming,
          COUNT(*) FILTER (WHERE start_time < NOW()) as past
        FROM bookings`
      ),
      // Recent users
      pool.query(
        `SELECT id, name, email, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5`
      ),
    ]);

    return {
      users: userStats.rows[0],
      bookings: bookingStats.rows[0],
      recentUsers: recentUsers.rows,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Virhe tilastojen lataamisessa</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Järjestelmän yleiskatsaus</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Käyttäjät yhteensä</p>
              <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">{stats.users.admins}</span> ylläpitäjää, <span className="font-medium">{stats.users.users}</span> käyttäjää
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Google Workspace</p>
              <p className="text-3xl font-bold text-gray-900">{stats.users.google_users}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Workspace-käyttäjiä
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Varaukset yhteensä</p>
              <p className="text-3xl font-bold text-gray-900">{stats.bookings.total}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">{stats.bookings.upcoming}</span> tulevaa varaus
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aiemmat varaukset</p>
              <p className="text-3xl font-bold text-gray-900">{stats.bookings.past}</p>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Menneitä varauksia
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Viimeisimmät käyttäjät</h2>
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Näytä kaikki →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nimi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sähköposti</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooli</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liittynyt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'user' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('fi-FI')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hallinnoi käyttäjiä</h3>
          <p className="text-gray-600 text-sm">Tarkastele, muokkaa ja hallitse käyttäjätilejä</p>
        </Link>
        <Link href="/admin/settings" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Järjestelmän asetukset</h3>
          <p className="text-gray-600 text-sm">Muokkaa järjestelmän asetuksia</p>
        </Link>
      </div>
    </div>
  );
}
