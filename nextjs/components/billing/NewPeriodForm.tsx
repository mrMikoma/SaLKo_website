"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBillingPeriod } from "@/utilities/billingActions";

interface NewPeriodFormProps {
  // The month after the latest period, or this month
  suggestion: { name: string; startsOn: string; endsOn: string };
}

const inputClassName =
  "min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sblue focus:outline-none focus:ring-2 focus:ring-sblue/30";

const NewPeriodForm = ({ suggestion }: NewPeriodFormProps) => {
  const router = useRouter();
  const [period, setPeriod] = useState(suggestion);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPeriod(period);
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      router.push(`/admin/laskutus/${result.result.id}`);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
      className="bg-white rounded-lg shadow p-6 space-y-4 text-gray-900"
    >
      <h2 className="text-xl font-semibold">Uusi laskutusjakso</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="period-name" className="block text-sm text-gray-700 mb-1">
            Nimi (myös taulukon Laskutusjakso)
          </label>
          <input
            id="period-name"
            value={period.name}
            onChange={(e) => setPeriod({ ...period, name: e.target.value })}
            className={`${inputClassName} w-40`}
          />
        </div>
        <div>
          <label htmlFor="period-start" className="block text-sm text-gray-700 mb-1">
            Alkaa
          </label>
          <input
            id="period-start"
            type="date"
            value={period.startsOn}
            onChange={(e) => setPeriod({ ...period, startsOn: e.target.value })}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="period-end" className="block text-sm text-gray-700 mb-1">
            Päättyy
          </label>
          <input
            id="period-end"
            type="date"
            value={period.endsOn}
            onChange={(e) => setPeriod({ ...period, endsOn: e.target.value })}
            className={inputClassName}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60"
        >
          {isPending ? "Luodaan…" : "Luo jakso"}
        </button>
      </div>
      {error && (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default NewPeriodForm;
