"use client";

import { useState, useTransition } from "react";
import { User, updateUserRole, deleteUser } from "@/utilities/adminUserActions";
import { getRoleDisplayName } from "@/utilities/roles";

interface UserTableProps {
  users: User[];
}

const UserTable = ({ users }: UserTableProps) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "user" | "guest">("user");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRoleEdit = (userId: string, currentRole: "admin" | "user" | "guest") => {
    setEditingUserId(userId);
    setSelectedRole(currentRole);
    setError(null);
    setSuccess(null);
  };

  const handleRoleSave = (userId: string) => {
    startTransition(async () => {
      const result = await updateUserRole(userId, selectedRole);
      if (result.success) {
        setSuccess("Rooli päivitetty onnistuneesti");
        setEditingUserId(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Roolin päivitys epäonnistui");
      }
    });
  };

  const handleRoleCancel = () => {
    setEditingUserId(null);
    setError(null);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (!confirm(`Haluatko varmasti poistaa käyttäjän "${userName}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.success) {
        setSuccess("Käyttäjä poistettu onnistuneesti");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Käyttäjän poisto epäonnistui");
      }
    });
  };

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nimi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sähköposti</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooli</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puhelin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liittynyt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toiminnot</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUserId === user.id ? (
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as "admin" | "user" | "guest")}
                      className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900"
                      disabled={isPending}
                    >
                      <option value="admin">Järjestelmänvalvoja</option>
                      <option value="user">Käyttäjä</option>
                      <option value="guest">Vieras</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'user' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.auth_provider === 'google' ? 'bg-blue-100 text-blue-800' :
                    user.auth_provider === 'credentials' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.auth_provider === 'google' ? 'Google' :
                     user.auth_provider === 'credentials' ? 'Salasana' :
                     user.auth_provider}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.phone || <span className="text-gray-400 italic">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('fi-FI')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingUserId === user.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRoleSave(user.id)}
                        disabled={isPending}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        Tallenna
                      </button>
                      <button
                        onClick={handleRoleCancel}
                        disabled={isPending}
                        className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                      >
                        Peruuta
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRoleEdit(user.id, user.role)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                      >
                        Poista
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Ei käyttäjiä
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTable;
