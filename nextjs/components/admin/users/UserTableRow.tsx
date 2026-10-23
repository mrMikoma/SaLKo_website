"use client";

import { useState, useTransition } from "react";
import { DateTime } from "luxon";
import {
  User,
  updateUserRoles,
  setUserActive,
  anonymizeUser,
  deleteUser,
  createPasswordResetLink,
} from "@/utilities/adminUserActions";
import { ASSIGNABLE_ROLES, getRoleDisplayName } from "@/utilities/roles";
import RoleBadge from "./RoleBadge";
import AuthProviderBadge from "./AuthProviderBadge";
import EditUserForm from "./EditUserForm";

const SYSTEM_GUEST_EMAIL = "vieras@savonlinnanlentokerho.fi";

// Rendered on the server too, so the zone is explicit (the server runs in UTC)
const inHelsinki = (iso: string) =>
  DateTime.fromJSDate(new Date(iso)).setZone("Europe/Helsinki");

interface UserTableRowProps {
  user: User;
  isSelf: boolean;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

// Row actions as small buttons, as on the flight log and billing pages
const actionClassName =
  "min-h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50";
const dangerActionClassName =
  "min-h-11 px-3 rounded-lg border border-red-300 bg-white text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50";
const saveActionClassName =
  "min-h-11 px-3 rounded-lg bg-sblue text-sm font-medium text-white hover:bg-sblued transition-colors disabled:opacity-60";

const UserTableRow = ({ user, isSelf, onSuccess, onError }: UserTableRowProps) => {
  const [isPending, startTransition] = useTransition();
  const [editingRoles, setEditingRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const isSystemUser =
    user.auth_provider === "system" || user.email === SYSTEM_GUEST_EMAIL;
  const isDeactivated = Boolean(user.deactivated_at);
  const hasHistory = user.booking_count > 0 || user.bulletin_count > 0;

  const run = (
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    after?: () => void
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        onSuccess(successMessage);
        after?.();
      } else {
        onError(result.error || "Toiminto epäonnistui");
      }
    });
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleRoleSave = () => {
    if (selectedRoles.length === 0) {
      onError("Käyttäjällä täytyy olla vähintään yksi rooli");
      return;
    }
    run(() => updateUserRoles(user.id, selectedRoles), "Roolit päivitetty", () =>
      setEditingRoles(false)
    );
  };

  const handleAnonymize = () => {
    if (
      !confirm(
        `Anonymisoidaanko ${user.full_name}? Nimi, sähköposti ja yhteystiedot poistetaan pysyvästi. Varaukset jäävät nimellä "Poistettu käyttäjä".`
      )
    ) {
      return;
    }
    run(() => anonymizeUser(user.id), "Käyttäjä anonymisoitu");
  };

  const handleDelete = () => {
    if (!confirm(`Poistetaanko käyttäjä ${user.full_name} pysyvästi?`)) {
      return;
    }
    run(() => deleteUser(user.id), "Käyttäjä poistettu");
  };

  const handleResetLink = () => {
    startTransition(async () => {
      const result = await createPasswordResetLink(user.id);
      if (result.success && result.url) {
        setResetLink(result.url);
      } else {
        onError(result.error || "Linkin luonti epäonnistui");
      }
    });
  };

  return (
    <>
      <tr className={isDeactivated ? "bg-gray-50 text-gray-500" : "hover:bg-gray-50"}>
        <td className="px-4 py-4">
          <div className="text-sm font-medium text-gray-900">
            {user.full_name}
            {isSelf && <span className="ml-1 text-gray-500 font-normal">(sinä)</span>}
          </div>
          <div className="text-sm text-gray-500">{user.name}</div>
          {isDeactivated && (
            <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
              Poistettu käytöstä
            </span>
          )}
        </td>
        <td className="px-4 py-4 text-sm text-gray-600 break-all">{user.email}</td>
        <td className="px-4 py-4">
          {editingRoles ? (
            <fieldset className="flex flex-col gap-1">
              <legend className="sr-only">Roolit: {user.full_name}</legend>
              {ASSIGNABLE_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    disabled={isPending}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{getRoleDisplayName(role)}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          )}
        </td>
        <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap">
          <AuthProviderBadge provider={user.auth_provider} />
        </td>
        <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.phone || <span className="text-gray-400">–</span>}
        </td>
        <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-600">
          {inHelsinki(user.created_at).toFormat("d.M.yyyy")}
        </td>
        <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.last_login ? (
            <div>
              <div>{inHelsinki(user.last_login).toFormat("d.M.yyyy")}</div>
              <div className="text-xs text-gray-400">
                {inHelsinki(user.last_login).toFormat("HH.mm")}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">–</span>
          )}
        </td>
        <td className="px-4 py-4 text-sm font-medium">
          {isSystemUser ? (
            <span className="text-gray-400 font-normal">Järjestelmäkäyttäjä</span>
          ) : editingRoles ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRoleSave}
                disabled={isPending}
                className={saveActionClassName}
              >
                Tallenna
              </button>
              <button
                onClick={() => setEditingRoles(false)}
                disabled={isPending}
                className={actionClassName}
              >
                Peruuta
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 w-80">
              <button
                onClick={() => setEditingInfo(true)}
                disabled={isPending}
                className={actionClassName}
              >
                Muokkaa tietoja
              </button>
              {!isSelf && !isDeactivated && (
                <button
                  onClick={() => {
                    setSelectedRoles([...user.roles]);
                    setEditingRoles(true);
                  }}
                  disabled={isPending}
                  className={actionClassName}
                >
                  Muokkaa rooleja
                </button>
              )}
              {user.auth_provider === "credentials" && !isDeactivated && (
                <button onClick={handleResetLink} disabled={isPending} className={actionClassName}>
                  Salasanan vaihtolinkki
                </button>
              )}
              {!isSelf &&
                (isDeactivated ? (
                  <button
                    onClick={() => run(() => setUserActive(user.id, true), "Käyttäjä palautettu käyttöön")}
                    disabled={isPending}
                    className={actionClassName}
                  >
                    Palauta käyttöön
                  </button>
                ) : (
                  <button
                    onClick={() => run(() => setUserActive(user.id, false), "Käyttäjä poistettu käytöstä")}
                    disabled={isPending}
                    className={dangerActionClassName}
                  >
                    Poista käytöstä
                  </button>
                ))}
              {!isSelf && (
                <button
                  onClick={handleAnonymize}
                  disabled={isPending}
                  className={dangerActionClassName}
                >
                  Anonymisoi
                </button>
              )}
              {!isSelf && !hasHistory && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className={dangerActionClassName}
                >
                  Poista pysyvästi
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {resetLink && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-4 py-4 text-sm text-gray-900">
            <p className="font-medium">
              Salasanan vaihtolinkki käyttäjälle {user.full_name} (voimassa vuorokauden, toimii kerran):
            </p>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={resetLink}
                aria-label="Salasanan vaihtolinkki"
                onFocus={(e) => e.target.select()}
                className="flex-1 min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(resetLink);
                  onSuccess("Linkki kopioitu");
                }}
                className="min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued"
              >
                Kopioi
              </button>
              <button
                onClick={() => setResetLink(null)}
                className="min-h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50"
              >
                Sulje
              </button>
            </div>
            <p className="mt-2 text-gray-600">Lähetä linkki käyttäjälle esimerkiksi sähköpostilla.</p>
          </td>
        </tr>
      )}
      {editingInfo && (
        <EditUserForm
          user={user}
          onSuccess={() => {
            onSuccess("Käyttäjän tiedot päivitetty");
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
