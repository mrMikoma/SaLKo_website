"use client";
import { signOut } from "next-auth/react";

const Logout = ({ onLogoutClick }: { onLogoutClick?: () => void }) => {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
    if (onLogoutClick) {
      onLogoutClick();
    }
  };

  return (
    <button onClick={handleLogout} type="button">
      Kirjaudu ulos
    </button>
  );
};

export default Logout;
