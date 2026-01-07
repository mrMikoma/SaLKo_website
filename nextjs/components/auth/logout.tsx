"use client";
import { useActionState, startTransition } from "react";
import { logout } from "@/utilities/authActions";

const Logout = ({ onHandleLogout }: { onHandleLogout: () => void }) => {
  const [, action, pending] = useActionState(logout, undefined);

  return (
    <form
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => {
          action();
        });
        onHandleLogout();
      }}
    >
      <div>
        <button disabled={pending} type="button">
          Kirjaudu ulos
        </button>
      </div>
    </form>
  );
};

export default Logout;
