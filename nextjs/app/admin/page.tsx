export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/utilities/adminStats";
import StatCard from "@/components/admin/StatCard";
import RecentUsersTable from "@/components/admin/RecentUsersTable";
import QuickActionCard from "@/components/admin/QuickActionCard";
import FlightLogTasks from "@/components/admin/FlightLogTasks";
import { isFlightLogEnabled } from "@/utilities/features";

export default async function AdminDashboard() {
  const session = await auth();

  if (
    !session?.user?.roles ||
    !hasPermission(session.user.roles, "ACCESS_ADMIN_SITE")
  ) {
    redirect("/");
  }

  const stats = await getDashboardStats();

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
        <h1 className="text-3xl font-bold text-gray-900">Etusivu</h1>
        <p className="text-gray-600 mt-2">Järjestelmän yleiskatsaus</p>
      </div>

      {/* What the flight log needs, while the feature is on */}
      {isFlightLogEnabled() && <FlightLogTasks />}

      <section className="bg-white rounded-lg shadow p-6 text-gray-900">
        <h2 className="text-xl font-semibold mb-4">Käyttäjät ja varaukset</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Käyttäjät yhteensä"
            value={stats.users.total}
            subtitle={`${stats.users.admins} ylläpitäjää, ${stats.users.users} käyttäjää`}
          />
          <StatCard
            title="Google Workspace"
            value={stats.users.google_users}
            subtitle="Workspace-käyttäjiä"
          />
          <StatCard
            title="Varaukset yhteensä"
            value={stats.bookings.total}
            subtitle={`${stats.bookings.upcoming} tulevaa varausta`}
          />
          <StatCard
            title="Aiemmat varaukset"
            value={stats.bookings.past}
            subtitle="Menneitä varauksia"
          />
        </div>
      </section>

      {/* Recent Users */}
      <RecentUsersTable users={stats.recentUsers} />

      <section className="bg-white rounded-lg shadow p-6 text-gray-900">
        <h2 className="text-xl font-semibold mb-4">Ylläpito</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickActionCard
            href="/admin/users"
            title="Hallinnoi käyttäjiä"
            description="Tarkastele, muokkaa ja hallitse käyttäjätilejä"
          />
          <QuickActionCard
            href="/admin/bulletins"
            title="Tiedotteet"
            description="Kirjoita ja muokkaa kerhon tiedotteita"
          />
        </div>
      </section>
    </div>
  );
}
