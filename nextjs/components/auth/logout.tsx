"use client";
import { useActionState } from "react";
import { logout } from "@/utilities/authActions";

const Logout = ({ onHandleLogout }: { onHandleLogout: () => void }) => {
  const [, action, pending] = useActionState(logout, undefined);

  return (
    <form
      action={action}
      onSubmit={() => {
        onHandleLogout();
      }}
    >
      <div>
        <button disabled={pending} type="submit">
          Kirjaudu ulos
        </button>
      </div>
    </form>
  );
};

export default Logout;
