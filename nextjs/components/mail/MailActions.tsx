"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryEmail, sendTestEmail } from "@/utilities/mailActions";

type Result = { status: "success"; result: { text: string } } | { status: "error"; error: string };

// Runs a mail action, says how it went, and refreshes the page
function useMailAction() {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.status === "success"
          ? { ok: true, text: result.result.text }
          : { ok: false, text: result.error }
      );
      router.refresh();
    });
  };
  const messageText = message && (
    <p
      className={message.ok ? "text-green-800 text-sm" : "text-red-700 text-sm"}
      role={message.ok ? "status" : "alert"}
    >
      {message.text}
    </p>
  );
  return { run, isPending, messageText };
}

/** Sends a test message from the billing address to the admin themself */
export const TestEmailButton = () => {
  const { run, isPending, messageText } = useMailAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run(sendTestEmail)}
        disabled={isPending}
        className="min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60"
      >
        {isPending ? "Lähetetään…" : "Lähetä testiviesti itselleni"}
      </button>
      {messageText}
    </div>
  );
};

export const RetryEmailButton = ({ id, subject }: { id: number; subject: string }) => {
  const { run, isPending, messageText } = useMailAction();
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => run(() => retryEmail(id))}
        disabled={isPending}
        className="min-h-11 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        aria-label={`Yritä uudelleen: ${subject}`}
      >
        {isPending ? "Lähetetään…" : "Yritä uudelleen"}
      </button>
      {messageText}
    </div>
  );
};
