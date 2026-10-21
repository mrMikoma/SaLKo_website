"use client";

import { useActionState } from "react";
import { resetPasswordWithToken } from "@/utilities/passwordReset";

const inputClassName =
  "block w-full rounded-lg bg-white/95 px-4 py-2.5 text-base text-sblued border-2 border-sblue/30 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md";

const ResetPasswordForm = ({ token }: { token: string }) => {
  const [state, action, pending] = useActionState(resetPasswordWithToken, undefined);

  if (state?.status === "success") {
    return (
      <div className="space-y-3 text-swhite" role="status">
        <p className="text-xl font-semibold">Salasana vaihdettu</p>
        <p>
          Voit nyt kirjautua sisään uudella salasanalla sivun yläreunan
          Jäsenalue-valikosta.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-swhite mb-2">
          Uusi salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClassName}
        />
        <p className="mt-2 text-sm text-swhite/80">
          8–32 merkkiä, vähintään yksi kirjain, numero ja erikoismerkki.
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-semibold text-swhite mb-2">
          Uusi salasana uudelleen
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={inputClassName}
        />
      </div>
      {state?.status === "error" && (
        <p className="text-sred text-sm font-medium" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-11 rounded-lg bg-sred px-4 py-2.5 font-semibold text-swhite shadow-md hover:bg-sred/90 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Vaihda salasana"}
      </button>
    </form>
  );
};

export default ResetPasswordForm;
