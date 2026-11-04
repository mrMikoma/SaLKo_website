"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveFreeHour,
  setEquipmentFee,
  setPurposePayer,
} from "@/utilities/billingActions";
import type { BillingSettings } from "@/utilities/billingData";

/**
 * The forms of /admin/laskutus/asetukset. Each saves on its own and refreshes
 * the page from the server.
 */

const inputClassName =
  "min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sblue focus:outline-none focus:ring-2 focus:ring-sblue/30";
const buttonClassName =
  "min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60";
const centsToEuros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

type Result = { status: "success" } | { status: "error"; error: string };

// Runs an action, shows its error, and refreshes the page when it succeeds
function useSave() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = (action: () => Promise<Result>, onSuccess?: () => void, onError?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setError(result.error);
        onError?.();
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };
  const errorText = error && (
    <p className="text-red-700 text-sm" role="alert">
      {error}
    </p>
  );
  return { save, isPending, errorText };
}

export const EquipmentFees = ({
  season,
  members,
}: {
  season: number;
  members: BillingSettings["members"];
}) => {
  const { save, errorText } = useSave();
  // Ticks show at once; one that fails to save is taken back
  const [paid, setPaid] = useState(() => new Set(members.filter((m) => m.paid).map((m) => m.id)));
  const mark = (userId: string, on: boolean) =>
    setPaid((current) => {
      const next = new Set(current);
      if (on) next.add(userId);
      else next.delete(userId);
      return next;
    });
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {paid.size} / {members.length} jäsentä maksanut kauden {season} kalustomaksun.
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
        {members.map((member) => (
          <li key={member.id}>
            <label className="flex min-h-11 items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={paid.has(member.id)}
                onChange={(e) => {
                  const on = e.target.checked;
                  mark(member.id, on);
                  save(
                    () => setEquipmentFee({ userId: member.id, season, paid: on }),
                    undefined,
                    () => mark(member.id, !on)
                  );
                }}
              />
              <span>
                {member.name}
                <span className="block text-xs text-gray-600">{member.email}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {errorText}
    </div>
  );
};

export const FreeHour = ({
  aircraft,
  freeHour,
}: Pick<BillingSettings, "aircraft" | "freeHour">) => {
  const { save, isPending, errorText } = useSave();
  const [settings, setSettings] = useState(freeHour);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(() => saveFreeHour(settings));
      }}
      className="space-y-3"
    >
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
        />
        Vapaatunti käytössä
      </label>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="free-paid" className="block text-sm text-gray-700 mb-1">Maksettuja minuutteja</label>
          <input
            id="free-paid"
            type="number"
            min={1}
            value={settings.paidMinutes}
            onChange={(e) => setSettings({ ...settings, paidMinutes: Number(e.target.value) })}
            className={`${inputClassName} w-28`}
          />
        </div>
        <div>
          <label htmlFor="free-free" className="block text-sm text-gray-700 mb-1">Sen jälkeen ilmaisia</label>
          <input
            id="free-free"
            type="number"
            min={0}
            value={settings.freeMinutes}
            onChange={(e) => setSettings({ ...settings, freeMinutes: Number(e.target.value) })}
            className={`${inputClassName} w-28`}
          />
        </div>
        <fieldset>
          <legend className="text-sm text-gray-700 mb-1">Koneet</legend>
          <div className="flex gap-4">
            {aircraft.map((reg) => (
              <label key={reg} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.aircraft.includes(reg)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aircraft: e.target.checked
                        ? [...settings.aircraft, reg]
                        : settings.aircraft.filter((a) => a !== reg),
                    })
                  }
                />
                {reg}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={isPending} className={buttonClassName}>
          Tallenna
        </button>
      </div>
      {errorText}
    </form>
  );
};

const PAYERS = [
  ["pic", "Päällikkö"],
  ["student", "Oppilas (yksin: päällikkö)"],
  ["none", "Ei laskuteta"],
] as const;

export const PurposePayers = ({ purposes }: Pick<BillingSettings, "purposes">) => {
  const { save, isPending, errorText } = useSave();
  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600">
          <tr>
            <th scope="col" className="py-1 pr-4 font-medium">Koodi</th>
            <th scope="col" className="py-1 pr-4 font-medium">Tarkoitus</th>
            <th scope="col" className="py-1 font-medium">Maksaja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {purposes.map((purpose) => (
            <tr key={purpose.code}>
              <td className="py-1 pr-4 font-medium">{purpose.code}</td>
              <td className="py-1 pr-4">
                {purpose.name}
                {purpose.isTraining && <span className="text-gray-600"> · koulutus, alempi hinta</span>}
              </td>
              <td className="py-1">
                <select
                  aria-label={`Maksaja: ${purpose.code}`}
                  value={purpose.payer}
                  disabled={isPending}
                  onChange={(e) =>
                    save(() => setPurposePayer(purpose.code, e.target.value as (typeof PAYERS)[number][0]))
                  }
                  className={`${inputClassName} min-h-9`}
                >
                  {PAYERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {errorText}
    </div>
  );
};
