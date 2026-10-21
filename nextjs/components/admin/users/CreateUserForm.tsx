"use client";

import React, { useState, useTransition } from "react";
import { createCredentialUser } from "@/utilities/adminUserActions";
import { ASSIGNABLE_ROLES, getRoleDisplayName } from "@/utilities/roles";


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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="new-user-email" className="block text-sm font-medium text-gray-700 mb-1">
              Sähköposti *
            </label>
            <input
              id="new-user-email"
              type="email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="new-user-password" className="block text-sm font-medium text-gray-700 mb-1">
              Salasana {isGuestOnly ? "(ei tarvita)" : "*"}
            </label>
            <input
              id="new-user-password"
              type="password"
              autoComplete="new-password"
              aria-describedby="new-user-password-help"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
              required={!isGuestOnly}
              disabled={isPending}
              placeholder={isGuestOnly ? "Vieras ei voi kirjautua" : ""}
            />
            <p id="new-user-password-help" className="text-xs text-gray-500 mt-1">
              {isGuestOnly
                ? "Vieraskäyttäjät eivät voi kirjautua sisään"
                : "8–32 merkkiä, vähintään yksi kirjain, numero ja erikoismerkki. Käyttäjä voi vaihtaa sen vaihtolinkillä."}
            </p>
          </div>
          <div>
            <label htmlFor="new-user-name" className="block text-sm font-medium text-gray-700 mb-1">
              Käyttäjänimi *
            </label>
            <input
              id="new-user-name"
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="new-user-full-name" className="block text-sm font-medium text-gray-700 mb-1">
              Koko nimi *
            </label>
            <input
              id="new-user-full-name"
              type="text"
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({ ...newUser, full_name: e.target.value })
              }
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
              required
              disabled={isPending}
            />
          </div>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-1">
              Roolit *
            </legend>
            <div className="flex flex-wrap gap-3 mt-1">
              {ASSIGNABLE_ROLES.map((role) => (
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
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60"
          >
            {isPending ? "Luodaan..." : "Luo käyttäjä"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="min-h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Peruuta
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
