"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginWithCredentials, loginWithGoogle } from "@/app/auth/actions";
import { FcGoogle } from "react-icons/fc";

// References:
// - https://nextjs.org/docs/app/building-your-application/authentication

const Login = () => {
  const [state, action, pending] = useActionState(loginWithCredentials, undefined);

  // Note: On successful login, NextAuth handles the redirect server-side
  // The page will redirect before this component receives a response
  // Only errors will be shown in the state

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 font-finlandica">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-2 text-center text-2xl/9 font-semibold tracking-tight text-sblued">
          Kirjaudu jäsenalueelle
        </h2>
        <span className="border-b-2 border-sred block w-3/4 mx-auto mt-2"></span>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action={action} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-md font-medium text-sblued"
            >
              Sähköposti
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Sähköposti"
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-sblued outline outline-1 -outline-offset-1 outline-sblue placeholder:text-text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-sblue sm:text-sm/6"
              />
            </div>
            {state?.errors?.email && <p>{state.errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-md font-medium text-sblued"
              >
                Salasana
              </label>
              <div className="relative group">
                <Link href="/yhteystiedot">
                  <span className="font-semibold text-sgrey hover:text-sred cursor-pointer">
                    Unohtuiko salasana?
                  </span>
                  <div className="absolute top-6 left-0 hidden w-max bg-sblack text-white text-sm rounded-md py-1 px-2 shadow-md group-hover:block opacity-80">
                    Ota yhteyttä ylläpitoon
                  </div>
                </Link>
              </div>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Salasana"
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-sblued outline outline-1 -outline-offset-1 outline-sblue placeholder:text-text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-sblue sm:text-sm/6"
              />
            </div>
            {state?.errors?.password && (
              <div>
                <p>Salasanan täytyy:</p>
                <ul>
                  {state.errors.password.map((error) => (
                    <li key={error}>- {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <button
              disabled={pending}
              type="submit"
              className="flex w-full justify-center rounded-md bg-sblue px-3 py-1.5 text-md font-semibold tracking-wide text-white shadow-lg hover:bg-sred"
            >
              Kirjaudu sisään
            </button>
          </div>
          {state?.errors?.general && (
            <div>
              <ul className="text-center">
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
              <div className="w-full border-t border-sgrey/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-sgrey font-semibold">Tai</span>
            </div>
          </div>

          <div className="mt-6">
            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-sblued shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <FcGoogle className="h-5 w-5" />
                <span>Kirjaudu Google Workspacella</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className=" text-sm/6 text-sgrey font-semibold">
            Eikö sinulla ole vielä tunnusta?
          </p>
          <Link
            href="/yhteystiedot"
            className="font-semibold text-sblued hover:text-sred"
          >
            Ota yhteyttä ylläpitoon
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
