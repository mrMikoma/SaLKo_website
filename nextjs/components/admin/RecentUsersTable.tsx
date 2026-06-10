"use client";

import Link from "next/link";
import { RecentUser } from "@/utilities/adminStats";
import { getRoleDisplayName } from "@/utilities/roles";

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
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Näytä kaikki →
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nimi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sähköposti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rooli
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liittynyt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <span
                        key={role}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : role === "user"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getRoleDisplayName(role)}
                      </span>
                    ))}
                  </div>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                  suppressHydrationWarning
                >
                  {new Date(user.created_at).toLocaleDateString("fi-FI")}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"
                  suppressHydrationWarning
                >
                  {user.last_login ? (
                    <div>
                      <div suppressHydrationWarning>
                        {new Date(user.last_login).toLocaleDateString("fi-FI")}
                      </div>
                      <div
                        className="text-xs text-gray-400"
                        suppressHydrationWarning
                      >
                        {new Date(user.last_login).toLocaleTimeString("fi-FI", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
