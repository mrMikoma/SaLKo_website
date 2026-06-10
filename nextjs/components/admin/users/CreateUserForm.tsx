"use client";

import React, { useState, useTransition } from "react";
import { createCredentialUser } from "@/utilities/adminUserActions";
import { getRoleDisplayName } from "@/utilities/roles";

const AVAILABLE_ROLES = ["admin", "user", "guest"] as const;

interface CreateUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const CreateUserForm = ({
  onSuccess,
  onCancel,
  onError,
}: CreateUserFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    full_name: "",
    roles: ["user"] as string[],
  });

  const isGuestOnly =
    newUser.roles.length === 1 && newUser.roles[0] === "guest";

  const handleRoleToggle = (role: string) => {
    setNewUser((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.roles.length === 0) {
      onError("Käyttäjällä täytyy olla vähintään yksi rooli");
      return;
    }
    startTransition(async () => {
      const result = await createCredentialUser(newUser);
      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || "Käyttäjän luonti epäonnistui");
      }
    });
  };

  const handleCancel = () => {
    setNewUser({
      email: "",
      password: "",
      name: "",
      full_name: "",
      roles: ["user"],
    });
    onCancel();
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Luo uusi käyttäjä
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salasana {isGuestOnly ? "(ei tarvita)" : "* (min. 8 merkkiä)"}
            </label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              required={!isGuestOnly}
              minLength={isGuestOnly ? undefined : 8}
              disabled={isPending}
              placeholder={isGuestOnly ? "Vieras ei voi kirjautua" : ""}
            />
            {isGuestOnly && (
              <p className="text-xs text-gray-500 mt-1">
                Vieraskäyttäjät eivät voi kirjautua sisään
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nimi *
            </label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900  bg-white"
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
            onClick={handleCancel}
            disabled={isPending}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
          >
            Peruuta
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
