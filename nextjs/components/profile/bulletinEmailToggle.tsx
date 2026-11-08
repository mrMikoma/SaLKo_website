"use client";

import { useState, useTransition } from "react";
import { setBulletinEmails } from "@/utilities/userManagement";
import { callAction } from "@/utilities/callAction";

/** The member's choice of getting the club's bulletins by email */
const BulletinEmailToggle = ({ initial }: { initial: boolean }) => {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const change = (next: boolean) => {
    setError(null);
    setEnabled(next);
    startTransition(async () => {
      const result = await callAction(() => setBulletinEmails(next));
      if (result.status === "error") {
        setEnabled(!next);
        setError(result.error);
      }
    });
  };

  return (
    <div className="mt-6 pt-6 border-t-2 border-swhite/10">
      <label className="flex items-start gap-3 cursor-pointer text-swhite">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isPending}
          onChange={(e) => change(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>
          <span className="font-bold block">Kerhon tiedotteet sähköpostiin</span>
          <span className="text-swhite/80 text-sm">
            Saat kerhon tiedotteet myös sähköpostina osoitteeseen, jolla kirjaudut. Tiedotteet näkyvät aina
            myös sivustolla.
          </span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-sred font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default BulletinEmailToggle;
