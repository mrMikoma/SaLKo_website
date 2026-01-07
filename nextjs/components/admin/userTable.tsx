"use client";

import { useState, useTransition } from "react";
import {
  User,
  updateUserRole,
  deleteUser,
  createCredentialUser,
  resetUserPassword,
} from "@/utilities/adminUserActions";
import { getRoleDisplayName } from "@/utilities/roles";

interface UserTableProps {
  users: User[];
}

const UserTable = ({ users }: UserTableProps) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "user" | "guest">(
    "user"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<
    string | null
  >(null);
  const [newPassword, setNewPassword] = useState("");

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    full_name: "",
    role: "user" as "admin" | "user" | "guest",
  });

  const handleRoleEdit = (
    userId: string,
    currentRole: "admin" | "user" | "guest"
  ) => {
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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCredentialUser(newUser);
      if (result.success) {
        setSuccess("Käyttäjä luotu onnistuneesti");
        setShowCreateForm(false);
        setNewUser({
          email: "",
          password: "",
          name: "",
          full_name: "",
          role: "user",
        });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Käyttäjän luonti epäonnistui");
      }
    });
  };

  const handleResetPassword = (userId: string) => {
    startTransition(async () => {
      const result = await resetUserPassword(userId, newPassword);
      if (result.success) {
        setSuccess("Salasana vaihdettu onnistuneesti");
        setResettingPasswordUserId(null);
        setNewPassword("");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Salasanan vaihto epäonnistui");
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

      {/* Create User Button and Form */}
      <div className="mx-6 mt-4">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Luo uusi käyttäjä
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Luo uusi käyttäjä
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sähköposti *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salasana * (min. 8 merkkiä)
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    minLength={8}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nimi *
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Koko nimi *
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rooli *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as "admin" | "user" | "guest",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={isPending}
                  >
                    <option value="user">Käyttäjä</option>
                    <option value="admin">Järjestelmänvalvoja</option>
                    <option value="guest">Vieras</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isPending ? "Luodaan..." : "Luo käyttäjä"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewUser({
                      email: "",
                      password: "",
                      name: "",
                      full_name: "",
                      role: "user",
                    });
                  }}
                  disabled={isPending}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        )}
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
                Auth
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puhelin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liittynyt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Viimeisin kirjautuminen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toiminnot
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                  <div className="text-sm text-gray-500">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUserId === user.id ? (
                    <select
                      value={selectedRole}
                      onChange={(e) =>
                        setSelectedRole(
                          e.target.value as "admin" | "user" | "guest"
                        )
                      }
                      className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900"
                      disabled={isPending}
                    >
                      <option value="admin">Järjestelmänvalvoja</option>
                      <option value="user">Käyttäjä</option>
                      <option value="guest">Vieras</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : user.role === "user"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.auth_provider === "google"
                        ? "bg-blue-100 text-blue-800"
                        : user.auth_provider === "credentials"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.auth_provider === "google"
                      ? "Google"
                      : user.auth_provider === "credentials"
                      ? "Salasana"
                      : user.auth_provider}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.phone || (
                    <span className="text-gray-400 italic">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString("fi-FI")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.last_login ? (
                    <div>
                      <div>
                        {new Date(user.last_login).toLocaleDateString("fi-FI")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(user.last_login).toLocaleTimeString("fi-FI", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">- </span>
                  )}
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
                  ) : resettingPasswordUserId === user.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Uusi salasana"
                        className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                        minLength={8}
                        disabled={isPending}
                      />
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={isPending || newPassword.length < 8}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        Tallenna
                      </button>
                      <button
                        onClick={() => {
                          setResettingPasswordUserId(null);
                          setNewPassword("");
                        }}
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
                      {user.auth_provider === "credentials" && (
                        <button
                          onClick={() => setResettingPasswordUserId(user.id)}
                          disabled={isPending}
                          className="text-purple-600 hover:text-purple-900 disabled:text-gray-400"
                        >
                          Vaihda salasana
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={
                          isPending ||
                          user.auth_provider === "system" ||
                          user.email === "vieras@savonlinnanlentokerho.fi"
                        }
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                        title={
                          user.auth_provider === "system" ||
                          user.email === "vieras@savonlinnanlentokerho.fi"
                            ? "Järjestelmäkäyttäjää ei voi poistaa"
                            : ""
                        }
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
          <div className="text-center py-8 text-gray-500">Ei käyttäjiä</div>
        )}
      </div>
    </div>
  );
};

export default UserTable;
