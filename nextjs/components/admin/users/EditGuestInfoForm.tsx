"use client";

import React, { useState, useTransition } from "react";
import { User, updateGuestUserInfo } from "@/utilities/adminUserActions";

interface EditGuestInfoFormProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const EditGuestInfoForm = ({
  user,
  onSuccess,
  onCancel,
  onError,
}: EditGuestInfoFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [editedInfo, setEditedInfo] = useState({
    name: user.name,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    postal_code: user.postal_code || "",
  });

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateGuestUserInfo(user.id, editedInfo);
      if (result.success) {
        onSuccess();
      } else {
        onError(result.error || "Tietojen päivitys epäonnistui");
      }
    });
  };

  return (
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
                value={editedInfo.name}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, name: e.target.value })
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
                value={editedInfo.full_name}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, full_name: e.target.value })
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
                value={editedInfo.email}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, email: e.target.value })
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
                value={editedInfo.phone}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, phone: e.target.value })
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
                value={editedInfo.address}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, address: e.target.value })
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
                value={editedInfo.city}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, city: e.target.value })
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
                value={editedInfo.postal_code}
                onChange={(e) =>
                  setEditedInfo({ ...editedInfo, postal_code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isPending ? "Tallennetaan..." : "Tallenna"}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
            >
              Peruuta
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default EditGuestInfoForm;
