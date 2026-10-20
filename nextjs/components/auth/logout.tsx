"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

// next-auth's client signOut clears the session cookie, tells SessionProvider
// and other tabs, and then loads / again, so the navbar can't keep showing the
// old session (it sometimes did with a server action, when useSession()
// refetched before the cookie was gone)
const Logout = ({ onHandleLogout }: { onHandleLogout: () => void }) => {
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          onHandleLogout();
          await signOut({ redirectTo: "/" });
        }}
      >
        Kirjaudu ulos
      </button>
    </div>
  );
};

export default Logout;
