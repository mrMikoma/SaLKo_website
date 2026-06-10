"use client";

import { useState, useTransition } from "react";
import {
  User,
  updateUserRoles,
  deleteUser,
  resetUserPassword,
} from "@/utilities/adminUserActions";
import { getRoleDisplayName } from "@/utilities/roles";
import RoleBadge from "./RoleBadge";
import AuthProviderBadge from "./AuthProviderBadge";
import EditGuestInfoForm from "./EditGuestInfoForm";

const AVAILABLE_ROLES = ["admin", "user", "guest"] as const;

interface UserTableRowProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

const UserTableRow = ({ user, onSuccess, onError }: UserTableRowProps) => {
  const [isPending, startTransition] = useTransition();
  const [editingRoles, setEditingRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);

  const isSystemUser =
    user.auth_provider === "system" ||
    user.email === "vieras@savonlinnanlentokerho.fi";

  const canEditInfo =
    user.roles.includes("guest") && !isSystemUser;

  const handleRoleEdit = () => {
    setEditingRoles(true);
    setSelectedRoles([...user.roles]);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleRoleSave = () => {
    if (selectedRoles.length === 0) {
      onError("Käyttäjällä täytyy olla vähintään yksi rooli");
      return;
    }
    startTransition(async () => {
      const result = await updateUserRoles(user.id, selectedRoles);
      if (result.success) {
        onSuccess("Roolit päivitetty onnistuneesti");
        setEditingRoles(false);
      } else {
        onError(result.error || "Roolien päivitys epäonnistui");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Haluatko varmasti poistaa käyttäjän "${user.name}"?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        onSuccess("Käyttäjä poistettu onnistuneesti");
      } else {
        onError(result.error || "Käyttäjän poisto epäonnistui");
      }
    });
  };

  const handleResetPassword = () => {
    startTransition(async () => {
      const result = await resetUserPassword(user.id, newPassword);
      if (result.success) {
        onSuccess("Salasana vaihdettu onnistuneesti");
        setResettingPassword(false);
        setNewPassword("");
      } else {
        onError(result.error || "Salasanan vaihto epäonnistui");
      }
    });
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.full_name}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.email}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {editingRoles ? (
            <div className="flex flex-col gap-1">
              {AVAILABLE_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
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
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <AuthProviderBadge provider={user.auth_provider} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.phone || <span className="text-gray-400 italic">-</span>}
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
              <div className="text-xs text-gray-400" suppressHydrationWarning>
                {new Date(user.last_login).toLocaleTimeString("fi-FI", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ) : (
            <span className="text-gray-400 italic">-</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          {editingRoles ? (
            <div className="flex gap-2">
              <button
                onClick={handleRoleSave}
                disabled={isPending}
                className="text-green-600 hover:text-green-900 disabled:text-gray-400"
              >
                Tallenna
              </button>
              <button
                onClick={() => setEditingRoles(false)}
                disabled={isPending}
                className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
              >
                Peruuta
              </button>
            </div>
          ) : resettingPassword ? (
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
                onClick={handleResetPassword}
                disabled={isPending || newPassword.length < 8}
                className="text-green-600 hover:text-green-900 disabled:text-gray-400"
              >
                Tallenna
              </button>
              <button
                onClick={() => {
                  setResettingPassword(false);
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
                onClick={handleRoleEdit}
                disabled={isPending}
                className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
              >
                Muokkaa rooleja
              </button>
              {canEditInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  disabled={isPending}
                  className="text-orange-600 hover:text-orange-900 disabled:text-gray-400"
                >
                  Muokkaa tietoja
                </button>
              )}
              {user.auth_provider === "credentials" && (
                <button
                  onClick={() => setResettingPassword(true)}
                  disabled={isPending}
                  className="text-purple-600 hover:text-purple-900 disabled:text-gray-400"
                >
                  Vaihda salasana
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={isPending || isSystemUser}
                className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                title={isSystemUser ? "Järjestelmäkäyttäjää ei voi poistaa" : ""}
              >
                Poista
              </button>
            </div>
          )}
        </td>
      </tr>
      {editingInfo && (
        <EditGuestInfoForm
          user={user}
          onSuccess={() => {
            onSuccess("Käyttäjän tiedot päivitetty onnistuneesti");
            setEditingInfo(false);
          }}
          onCancel={() => setEditingInfo(false)}
          onError={onError}
        />
      )}
    </>
  );
};

export default UserTableRow;
