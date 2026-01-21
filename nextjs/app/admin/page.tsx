export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/utilities/adminStats";
import StatCard from "@/components/admin/StatCard";
import RecentUsersTable from "@/components/admin/RecentUsersTable";
import QuickActionCard from "@/components/admin/QuickActionCard";

// Icons as components for cleaner code
const UsersIcon = () => (
  <svg
    className="w-8 h-8 text-blue-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg
    className="w-8 h-8 text-green-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-8 h-8 text-purple-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="w-8 h-8 text-gray-600"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Käyttäjät yhteensä"
          value={stats.users.total}
          subtitle={`${stats.users.admins} ylläpitäjää, ${stats.users.users} käyttäjää`}
          icon={<UsersIcon />}
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Google Workspace"
          value={stats.users.google_users}
          subtitle="Workspace-käyttäjiä"
          icon={<GoogleIcon />}
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Varaukset yhteensä"
          value={stats.bookings.total}
          subtitle={`${stats.bookings.upcoming} tulevaa varausta`}
          icon={<CalendarIcon />}
          iconBgColor="bg-purple-100"
        />
        <StatCard
          title="Aiemmat varaukset"
          value={stats.bookings.past}
          subtitle="Menneitä varauksia"
          icon={<ClockIcon />}
          iconBgColor="bg-gray-100"
        />
      </div>

      {/* Recent Users */}
      <RecentUsersTable users={stats.recentUsers} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          href="/admin/users"
          title="Hallinnoi käyttäjiä"
          description="Tarkastele, muokkaa ja hallitse käyttäjätilejä"
        />
        <QuickActionCard
          href="/admin/settings"
          title="Järjestelmän asetukset"
          description="Muokkaa järjestelmän asetuksia"
        />
      </div>
    </div>
  );
}
