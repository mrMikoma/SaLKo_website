"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeBillingPeriod, deleteBillingPeriod, setPayerPaid } from "@/utilities/billingActions";
import { euros } from "@/utilities/billing";

/** Closing or removing an open period */
export const OpenPeriodActions = ({
  periodId,
  name,
  canClose,
}: {
  periodId: number;
  name: string;
  canClose: boolean;
}) => {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    if (
      !window.confirm(
        `Suljetaanko jakso ${name}? Laskut tallennetaan ja lennot merkitään taulukkoon laskutetuiksi. Suljettua jaksoa ei voi avata uudelleen.`
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await closeBillingPeriod(periodId);
      if (result.status === "error") {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setMessage({
        ok: true,
        text: `Jakso suljettu: ${result.result.payers} maksajaa, yhteensä ${euros(result.result.totalCents)}.`,
      });
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm(`Poistetaanko avoin jakso ${name}? Lentoihin ei kosketa.`)) return;
    startTransition(async () => {
      const result = await deleteBillingPeriod(periodId);
      if (result.status === "error") {
        setMessage({ ok: false, text: result.error });
        return;
      }
      router.push("/admin/laskutus");
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={close}
          disabled={isPending || !canClose}
          className="min-h-11 px-5 rounded-lg bg-sred text-white font-semibold hover:bg-sred/90 disabled:opacity-50"
        >
          {isPending ? "Suljetaan…" : "Sulje jakso"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="min-h-11 px-4 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          Poista jakso
        </button>
      </div>
      {message && (
        <p className={message.ok ? "text-green-800" : "text-red-700"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </div>
  );
};

/** A payer's bill in a closed period: paid, or not yet */
export const PaidToggle = ({
  periodId,
  payerKey,
  payerName,
  paidLabel,
}: {
  periodId: number;
  payerKey: string;
  payerName: string;
  paidLabel: string | null; // "21.10.2026 klo 18.30, Name" when paid
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (paid: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setPayerPaid(periodId, payerKey, paid);
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="text-sm">
      {paidLabel ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-900">
            Maksettu
          </span>
          <span className="text-gray-600">{paidLabel}</span>
          <button
            type="button"
            onClick={() => toggle(false)}
            disabled={isPending}
            className="text-gray-700 underline disabled:opacity-50"
            aria-label={`Peru maksu: ${payerName}`}
          >
            Peru
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => toggle(true)}
          disabled={isPending}
          className="min-h-11 px-3 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          aria-label={`Merkitse maksetuksi: ${payerName}`}
        >
          {isPending ? "Tallennetaan…" : "Merkitse maksetuksi"}
        </button>
      )}
      {error && (
        <p className="text-red-700 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
