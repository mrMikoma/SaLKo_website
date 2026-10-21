"use client";

import React, { useState, useTransition } from "react";
import { User, updateUserInfo } from "@/utilities/adminUserActions";

interface EditUserFormProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

type Field = "name" | "full_name" | "email" | "phone" | "address" | "city" | "postal_code";

const FIELDS: { key: Field; label: string; type: string; autoComplete: string }[] = [
  { key: "full_name", label: "Koko nimi", type: "text", autoComplete: "off" },
  { key: "name", label: "Käyttäjänimi", type: "text", autoComplete: "off" },
  { key: "email", label: "Sähköposti", type: "email", autoComplete: "off" },
  { key: "phone", label: "Puhelin", type: "tel", autoComplete: "off" },
  { key: "address", label: "Osoite", type: "text", autoComplete: "off" },
  { key: "city", label: "Kaupunki", type: "text", autoComplete: "off" },
  { key: "postal_code", label: "Postinumero", type: "text", autoComplete: "off" },
];

/**
 * An admin edits a user's name and contact details. Members can still edit
 * their own in Profiili.
 */
const EditUserForm = ({ user, onSuccess, onCancel, onError }: EditUserFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [edited, setEdited] = useState<Record<Field, string>>({
    name: user.name,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    postal_code: user.postal_code || "",
  });
  // Google sign-in finds the account by its email, so it can't change here
  const emailLocked = user.auth_provider === "google";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateUserInfo(user.id, edited);
      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || "Tietojen päivitys epäonnistui");
      }
    });
  };

  return (
    <tr className="bg-orange-50">
      <td colSpan={8} className="px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg border border-orange-200"
        >
          <h4 className="text-md font-semibold mb-4 text-gray-900">
            Muokkaa käyttäjän {user.full_name} tietoja
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.map(({ key, label, type, autoComplete }) => {
              const id = `edit-${user.id}-${key}`;
              const readOnly = key === "email" && emailLocked;
              return (
                <div key={key}>
                  <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  <input
                    id={id}
                    type={type}
                    autoComplete={autoComplete}
                    value={edited[key]}
                    onChange={(e) => setEdited({ ...edited, [key]: e.target.value })}
                    readOnly={readOnly}
                    aria-describedby={readOnly ? `${id}-note` : undefined}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-base text-gray-900 ${
                      readOnly ? "bg-gray-100" : ""
                    }`}
                    disabled={isPending}
                  />
                  {readOnly && (
                    <p id={`${id}-note`} className="mt-1 text-xs text-gray-500">
                      Google-tilin sähköpostia ei voi muuttaa.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={isPending}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 disabled:bg-gray-400"
            >
              {isPending ? "Tallennetaan..." : "Tallenna"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
            >
              Peruuta
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
};

export default EditUserForm;
