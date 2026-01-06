"use client";

import { useActionState, useState } from "react";
import {
  changePassword,
  ChangePasswordState,
} from "@/utilities/userManagement";

interface ChangePasswordFormProps {
  onCancel: () => void;
}

const ChangePasswordForm = ({ onCancel }: ChangePasswordFormProps) => {
  const [state, formAction, isPending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePassword, undefined);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

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

      <div>
        <label
          htmlFor="currentPassword"
          className="block text-sm font-semibold text-swhite mb-2"
        >
          Nykyinen salasana *
        </label>
        <div className="relative">
          <input
            type={showPasswords.current ? "text" : "password"}
            id="currentPassword"
            name="currentPassword"
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sblue/70 hover:text-sblue transition-colors"
            disabled={isPending}
          >
            {showPasswords.current ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        {state?.errors?.currentPassword && (
          <p className="text-sred text-sm mt-2 font-medium">
            {state.errors.currentPassword[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-semibold text-swhite mb-2"
        >
          Uusi salasana *
        </label>
        <div className="relative">
          <input
            type={showPasswords.new ? "text" : "password"}
            id="newPassword"
            name="newPassword"
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sblue/70 hover:text-sblue transition-colors"
            disabled={isPending}
          >
            {showPasswords.new ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        {state?.errors?.newPassword && (
          <p className="text-sred text-sm mt-2 font-medium">
            {state.errors.newPassword[0]}
          </p>
        )}
        <p className="text-swhite/70 text-xs mt-2">
          Salasanan tulee olla vähintään 8 merkkiä pitkä ja sisältää vähintään
          yksi kirjain, numero ja erikoismerkki.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-semibold text-swhite mb-2"
        >
          Vahvista uusi salasana *
        </label>
        <div className="relative">
          <input
            type={showPasswords.confirm ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white/95 text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sblue/70 hover:text-sblue transition-colors"
            disabled={isPending}
          >
            {showPasswords.confirm ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        {state?.errors?.confirmPassword && (
          <p className="text-sred text-sm mt-2 font-medium">
            {state.errors.confirmPassword[0]}
          </p>
        )}
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
              Vaihdetaan...
            </>
          ) : (
            "Vaihda salasana"
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

export default ChangePasswordForm;
