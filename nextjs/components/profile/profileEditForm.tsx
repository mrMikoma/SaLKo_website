"use client";

import { useActionState } from "react";
import { updateProfile, UpdateProfileState } from "@/utilities/userManagement";
import { UserData } from "@/utilities/definitions";

interface ProfileEditFormProps {
  user: UserData;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, onCancel }: ProfileEditFormProps) => {
  const [state, formAction, isPending] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.status === "success" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {state.message}
        </div>
      )}

      {state?.errors?.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {state.errors.general.map((error, idx) => (
            <p key={idx}>{error}</p>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1">
          Koko nimi *
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          defaultValue={user.full_name}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          required
          disabled={isPending}
        />
        {state?.errors?.full_name && (
          <p className="text-red-500 text-sm mt-1">{state.errors.full_name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">
          Puhelinnumero
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          defaultValue={user.phone || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          disabled={isPending}
        />
        {state?.errors?.phone && (
          <p className="text-red-500 text-sm mt-1">{state.errors.phone[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Katuosoite
        </label>
        <input
          type="text"
          id="address"
          name="address"
          defaultValue={user.address || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          disabled={isPending}
        />
        {state?.errors?.address && (
          <p className="text-red-500 text-sm mt-1">{state.errors.address[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium mb-1">
          Kaupunki
        </label>
        <input
          type="text"
          id="city"
          name="city"
          defaultValue={user.city || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          disabled={isPending}
        />
        {state?.errors?.city && (
          <p className="text-red-500 text-sm mt-1">{state.errors.city[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="postal_code" className="block text-sm font-medium mb-1">
          Postinumero
        </label>
        <input
          type="text"
          id="postal_code"
          name="postal_code"
          defaultValue={user.postalCode || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
          disabled={isPending}
        />
        {state?.errors?.postal_code && (
          <p className="text-red-500 text-sm mt-1">{state.errors.postal_code[0]}</p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending ? "Tallennetaan..." : "Tallenna"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          Peruuta
        </button>
      </div>
    </form>
  );
};

export default ProfileEditForm;
