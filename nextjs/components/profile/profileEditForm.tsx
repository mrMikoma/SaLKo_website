"use client";

import { useActionState } from "react";
import { updateProfile, UpdateProfileState } from "@/utilities/userManagement";
import { UserData } from "@/utilities/definitions";

interface ProfileEditFormProps {
  user: UserData;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, onCancel }: ProfileEditFormProps) => {
  const [state, formAction, isPending] = useActionState<
    UpdateProfileState,
    FormData
  >(updateProfile, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {state?.status === "success" && (
        <div className="glass border-2 border-success-green/50 bg-success-green/10 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-success-green"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-success-green font-bold">
                {state.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {state?.errors?.general && (
        <div className="glass border-2 border-sred/50 bg-sred/10 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-sred"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              {state.errors.general.map((error, idx) => (
                <p key={idx} className="text-sm text-sred font-bold">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label
            htmlFor="full_name"
            className="block text-sm font-semibold text-swhite mb-2"
          >
            Koko nimi *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            defaultValue={user.full_name}
            className="w-full px-4 py-3 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={isPending}
          />
          {state?.errors?.full_name && (
            <p className="text-sred text-sm mt-2 font-medium">
              {state.errors.full_name[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-semibold text-swhite mb-2"
          >
            Puhelinnumero
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            defaultValue={user.phone || ""}
            className="w-full px-4 py-3 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
          {state?.errors?.phone && (
            <p className="text-sred text-sm mt-2 font-medium">
              {state.errors.phone[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="postal_code"
            className="block text-sm font-semibold text-swhite mb-2"
          >
            Postinumero
          </label>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            defaultValue={user.postalCode || ""}
            className="w-full px-4 py-3 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
          {state?.errors?.postal_code && (
            <p className="text-sred text-sm mt-2 font-medium">
              {state.errors.postal_code[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-semibold text-swhite mb-2"
          >
            Katuosoite
          </label>
          <input
            type="text"
            id="address"
            name="address"
            defaultValue={user.address || ""}
            className="w-full px-4 py-3 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
          {state?.errors?.address && (
            <p className="text-sred text-sm mt-2 font-medium">
              {state.errors.address[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="city"
            className="block text-sm font-semibold text-swhite mb-2"
          >
            Asuinkunta
          </label>
          <input
            type="text"
            id="city"
            name="city"
            defaultValue={user.city || ""}
            className="w-full px-4 py-3 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
          />
          {state?.errors?.city && (
            <p className="text-sred text-sm mt-2 font-medium">
              {state.errors.city[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-swhite/10">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 sm:flex-none bg-sred text-swhite px-8 py-3 rounded-lg hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-300 font-bold shadow-xl border-2 border-transparent hover:border-sred/50"
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 inline text-swhite"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Tallennetaan...
            </>
          ) : (
            "Tallenna muutokset"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 sm:flex-none bg-sblue/30 text-swhite px-8 py-3 rounded-lg hover:bg-sblue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg border-2 border-sbluel/30 hover:border-sbluel"
        >
          Takaisin
        </button>
      </div>
    </form>
  );
};

export default ProfileEditForm;
