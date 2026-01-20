"use client";

import React, { useState, useTransition } from "react";
import {
  User,
  updateUserRoles,
  deleteUser,
  createCredentialUser,
  resetUserPassword,
  updateGuestUserInfo,
} from "@/utilities/adminUserActions";
import { getRoleDisplayName } from "@/utilities/roles";

interface UserTableProps {
  users: User[];
}

const AVAILABLE_ROLES = ["admin", "user", "guest"] as const;

const UserTable = ({ users }: UserTableProps) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<
    string | null
  >(null);
  const [newPassword, setNewPassword] = useState("");

  // Guest user info editing state
  const [editingUserInfoId, setEditingUserInfoId] = useState<string | null>(null);
  const [editedUserInfo, setEditedUserInfo] = useState<{
    name: string;
    full_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
  }>({
    name: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
  });

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    full_name: "",
    roles: ["user"] as string[],
  });

  const handleRoleEdit = (userId: string, currentRoles: string[]) => {
    setEditingUserId(userId);
    setSelectedRoles([...currentRoles]);
    setError(null);
    setSuccess(null);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleRoleSave = (userId: string) => {
    if (selectedRoles.length === 0) {
      setError("Käyttäjällä täytyy olla vähintään yksi rooli");
      return;
    }
    startTransition(async () => {
      const result = await updateUserRoles(userId, selectedRoles);
      if (result.success) {
        setSuccess("Roolit päivitetty onnistuneesti");
        setEditingUserId(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Roolien päivitys epäonnistui");
      }
    });
  };

  const handleRoleCancel = () => {
    setEditingUserId(null);
    setError(null);
  };

  // Guest user info editing handlers
  const handleEditUserInfo = (user: User) => {
    setEditingUserInfoId(user.id);
    setEditedUserInfo({
      name: user.name,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      postal_code: user.postal_code || "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveUserInfo = (userId: string) => {
    startTransition(async () => {
      const result = await updateGuestUserInfo(userId, editedUserInfo);
      if (result.success) {
        setSuccess("Käyttäjän tiedot päivitetty onnistuneesti");
        setEditingUserInfoId(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Tietojen päivitys epäonnistui");
      }
    });
  };

  const handleCancelUserInfoEdit = () => {
    setEditingUserInfoId(null);
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
    if (newUser.roles.length === 0) {
      setError("Käyttäjällä täytyy olla vähintään yksi rooli");
      return;
    }
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
          roles: ["user"],
        });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Käyttäjän luonti epäonnistui");
      }
    });
  };

  const handleNewUserRoleToggle = (role: string) => {
    setNewUser((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
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
                    Salasana {newUser.roles.length === 1 && newUser.roles[0] === "guest" ? "(ei tarvita)" : "* (min. 8 merkkiä)"}
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required={!(newUser.roles.length === 1 && newUser.roles[0] === "guest")}
                    minLength={newUser.roles.length === 1 && newUser.roles[0] === "guest" ? undefined : 8}
                    disabled={isPending}
                    placeholder={newUser.roles.length === 1 && newUser.roles[0] === "guest" ? "Vieras ei voi kirjautua" : ""}
                  />
                  {newUser.roles.length === 1 && newUser.roles[0] === "guest" && (
                    <p className="text-xs text-gray-500 mt-1">Vieraskäyttäjät eivät voi kirjautua sisään</p>
                  )}
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
                    Roolit *
                  </label>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {AVAILABLE_ROLES.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newUser.roles.includes(role)}
                          onChange={() => handleNewUserRoleToggle(role)}
                          disabled={isPending}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {getRoleDisplayName(role)}
                        </span>
                      </label>
                    ))}
                  </div>
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
                      roles: ["user"],
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
            <React.Fragment key={user.id}>
              <tr className="hover:bg-gray-50">
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
                    <div className="flex flex-col gap-1">
                      {AVAILABLE_ROLES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            disabled={isPending}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {getRoleDisplayName(role)}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
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
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleRoleEdit(user.id, user.roles)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                      >
                        Muokkaa rooleja
                      </button>
                      {/* Show "Edit Info" button only for guest role users (not the system guest) */}
                      {user.roles.includes("guest") &&
                        user.auth_provider !== "system" &&
                        user.email !== "vieras@savonlinnanlentokerho.fi" && (
                          <button
                            onClick={() => handleEditUserInfo(user)}
                            disabled={isPending}
                            className="text-orange-600 hover:text-orange-900 disabled:text-gray-400"
                          >
                            Muokkaa tietoja
                          </button>
                        )}
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
              {/* Guest user info editing row */}
              {editingUserInfoId === user.id && (
                <tr className="bg-orange-50">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="bg-white p-4 rounded-lg border border-orange-200">
                      <h4 className="text-md font-semibold mb-4 text-gray-900">
                        Muokkaa käyttäjän tietoja
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nimi
                          </label>
                          <input
                            type="text"
                            value={editedUserInfo.name}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Koko nimi
                          </label>
                          <input
                            type="text"
                            value={editedUserInfo.full_name}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                full_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sähköposti
                          </label>
                          <input
                            type="email"
                            value={editedUserInfo.email}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Puhelin
                          </label>
                          <input
                            type="tel"
                            value={editedUserInfo.phone}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Osoite
                          </label>
                          <input
                            type="text"
                            value={editedUserInfo.address}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kaupunki
                          </label>
                          <input
                            type="text"
                            value={editedUserInfo.city}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                city: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postinumero
                          </label>
                          <input
                            type="text"
                            value={editedUserInfo.postal_code}
                            onChange={(e) =>
                              setEditedUserInfo({
                                ...editedUserInfo,
                                postal_code: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSaveUserInfo(user.id)}
                          disabled={isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {isPending ? "Tallennetaan..." : "Tallenna"}
                        </button>
                        <button
                          onClick={handleCancelUserInfoEdit}
                          disabled={isPending}
                          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
                        >
                          Peruuta
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
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
