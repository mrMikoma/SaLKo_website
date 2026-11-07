"use client";
import { useState, type ButtonHTMLAttributes, type Ref } from "react";
import { signOut } from "next-auth/react";

type LogoutProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "children"> & {
  onHandleLogout: () => void;
  // signOut failed (no connection): the navbar shows the user again
  onLogoutFailed?: () => void;
  ref?: Ref<HTMLButtonElement>;
};

// next-auth's client signOut clears the session cookie, tells SessionProvider
// and other tabs, and then loads / again, so the navbar can't keep showing the
// old session (it sometimes did with a server action, when useSession()
// refetched before the cookie was gone).
//
// The button is the whole menu row (the caller passes the row's classes): it
// used to sit inside a padded row as a bare text button, so a click on the
// row beside the text only closed the menu, and logging out took several
// tries. Other props (a Headless UI MenuItem's role, focus state and ref)
// pass through to it.
const Logout = ({ onHandleLogout, onLogoutFailed, className, disabled, ...props }: LogoutProps) => {
  const [pending, setPending] = useState(false);

  return (
    <button
      {...props}
      type="button"
      className={className}
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        onHandleLogout();
        try {
          await signOut({ redirectTo: "/" });
        } catch {
          // Still logged in: the button and the user come back
          setPending(false);
          onLogoutFailed?.();
        }
      }}
    >
      Kirjaudu ulos
    </button>
  );
};

export default Logout;
