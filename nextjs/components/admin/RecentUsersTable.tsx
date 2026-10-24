"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { RecentUser } from "@/utilities/adminStats";
import RoleBadge from "@/components/admin/users/RoleBadge";

// Rendered on the server too, so the zone is explicit (the server runs in UTC)
const inHelsinki = (iso: string) =>
  DateTime.fromJSDate(new Date(iso)).setZone("Europe/Helsinki");

interface RecentUsersTableProps {
  users: RecentUser[];
}

const RecentUsersTable = ({ users }: RecentUsersTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Viimeisimmät käyttäjät
          </h2>
          <Link
            href="/admin/users"
            className="min-h-11 inline-flex items-center px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Näytä kaikki →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-left text-sm font-medium text-gray-600">
                Nimi
              </th>
              <th className="px-6 py-2 text-left text-sm font-medium text-gray-600">
                Sähköposti
              </th>
              <th className="px-6 py-2 text-left text-sm font-medium text-gray-600">
                Rooli
              </th>
              <th className="px-6 py-2 text-left text-sm font-medium text-gray-600">
                Liittynyt
              </th>
              <th className="px-6 py-2 text-left text-sm font-medium text-gray-600">
                Viimeisin kirjautuminen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.full_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role: string) => (
                      <RoleBadge key={role} role={role} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {inHelsinki(user.created_at).toFormat("d.M.yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.last_login ? (
                    <div>
                      <div>{inHelsinki(user.last_login).toFormat("d.M.yyyy")}</div>
                      <div className="text-xs text-gray-400">
                        {inHelsinki(user.last_login).toFormat("HH.mm")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Ei vielä</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentUsersTable;
