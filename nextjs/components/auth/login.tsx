"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginWithCredentials, loginWithGoogle } from "@/utilities/authActions";
import { FcGoogle } from "react-icons/fc";

// References:
// - https://nextjs.org/docs/app/building-your-application/authentication

const Login = () => {
  const [state, action, pending] = useActionState(
    loginWithCredentials,
    undefined
  );

  // Note: On successful login, NextAuth handles the redirect server-side
  // The page will redirect before this component receives a response
  // Only errors will be shown in the state

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-4 py-8 lg:px-8 font-finlandica">
      <div className="sm:mx-auto w-full max-w-md">
        <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-swhite mb-3">
          Kirjaudu jäsenalueelle
        </h2>
        <span className="border-b-2 border-sred block w-3/4 mx-auto"></span>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <form action={action} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-swhite mb-2"
            >
              Sähköposti
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Sähköposti"
              className="block w-full rounded-lg bg-white/95 px-4 py-2.5 text-base text-sblued border-2 border-sblue/30 placeholder:text-gray-400 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md"
            />
            {state?.errors?.email && (
              <p className="text-sred text-sm mt-2 font-medium">{state.errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-swhite"
              >
                Salasana
              </label>
              <div className="relative group">
                <Link href="/yhteystiedot">
                  <span className="text-sm font-medium text-sbluel hover:text-sred cursor-pointer transition-colors duration-200">
                    Unohtuiko salasana?
                  </span>
                  <div className="absolute top-full right-0 mt-2 hidden w-max glass rounded-lg py-2 px-3 shadow-xl group-hover:block z-10 border border-sred/20">
                    <p className="text-swhite text-xs">Ota yhteyttä ylläpitoon</p>
                  </div>
                </Link>
              </div>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Salasana"
              className="block w-full rounded-lg bg-white/95 px-4 py-2.5 text-base text-sblued border-2 border-sblue/30 placeholder:text-gray-400 focus:border-sred focus:ring-2 focus:ring-sred/20 focus:outline-none transition-all duration-200 shadow-md"
            />
            {state?.errors?.password && (
              <div className="text-sred text-sm mt-2 font-medium">
                <p>Salasanan täytyy:</p>
                <ul className="ml-4 list-disc">
                  {state.errors.password.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              disabled={pending}
              type="submit"
              className="flex w-full justify-center rounded-lg bg-sred px-4 py-3 text-base font-bold tracking-wide text-swhite shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 border-2 border-transparent hover:border-sred/50"
            >
              {pending ? "Kirjaudutaan..." : "Kirjaudu sisään"}
            </button>
          </div>
          {state?.errors?.general && (
            <div className="glass rounded-lg p-3 border border-sred/50">
              <ul className="text-center text-sred text-sm font-medium">
                {state.errors.general.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        {/* Google OAuth Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-swhite/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="glass px-3 py-1 text-swhite font-semibold rounded-md border border-sred/20">
                Tai
              </span>
            </div>
          </div>

          <div className="mt-6">
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-sblued shadow-xl hover:shadow-2xl hover:-translate-y-0.5 border-2 border-sblue/30 hover:border-sbluel transition-all duration-300"
              >
                <FcGoogle className="h-5 w-5" />
                <span>Kirjaudu Google Workspacella</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center space-y-1">
          <p className="text-sm text-swhite/80 font-medium">
            Eikö sinulla ole vielä tunnusta?
          </p>
          <Link
            href="/yhteystiedot"
            className="block font-bold text-sbluel hover:text-sred transition-colors duration-200 text-base"
          >
            Ota yhteyttä ylläpitoon
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
