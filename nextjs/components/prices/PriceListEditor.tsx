"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePriceItem,
  movePriceItem,
  savePriceItem,
  savePriceListValidFrom,
} from "@/utilities/priceListActions";
import { formatEuros, formatPrice, PriceItem, PriceSection } from "@/utilities/priceFormat";

/**
 * One section of the price list on /admin/hinnasto. Each row saves on its
 * own and the page reloads from the server, which the public pages read.
 */

const inputClassName =
  "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sblue focus:outline-none focus:ring-2 focus:ring-sblue/30";
const primaryButton =
  "min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60";
const rowButton =
  "min-h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50";

type Result = { status: "success" } | { status: "error"; error: string };

function useSave() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = (action: () => Promise<Result>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => ({ status: "error" as const, error: "Yhteys katkesi. Yritä uudelleen." }));
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };
  return { save, isPending, error };
}

interface Draft {
  id: number | null;
  name: string;
  description: string;
  price: string;
  unit: string;
  note: string;
  active: boolean;
}

const draftOf = (item: PriceItem): Draft => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: item.priceCents === null ? "" : formatEuros(item.priceCents).replace(/\s/g, ""),
  unit: item.unit,
  note: item.note,
  active: item.active,
});

const UNITS: Partial<Record<PriceSection, string>> = {
  membership: "€/vuosi",
  equipment: "€/kausi",
  hangar: "€/vuosi",
  training: "€",
};

function ItemForm({
  section,
  draft,
  code,
  onCancel,
}: {
  section: PriceSection;
  draft: Draft;
  code: string | null;
  onCancel: () => void;
}) {
  const { save, isPending, error } = useSave();
  const [value, setValue] = useState(draft);
  const isNote = section === "note";
  const field = (key: keyof Draft) => `price-${draft.id ?? `new-${section}`}-${key}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(() => savePriceItem({ ...value, section, price: isNote ? "" : value.price }), onCancel);
      }}
      className="grid gap-3 sm:grid-cols-2 rounded-lg border border-sblue/30 bg-sblue/5 p-4"
    >
      <div className={isNote ? "sm:col-span-2" : ""}>
        <label htmlFor={field("name")} className="block text-sm text-gray-700 mb-1">
          {isNote ? "Huomio" : "Nimi"}
          {code && <span className="text-gray-500"> (Koulutus-sivun tunnus {code})</span>}
        </label>
        {isNote ? (
          <textarea
            id={field("name")}
            rows={4}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            className={`${inputClassName} py-2`}
          />
        ) : (
          <input
            id={field("name")}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            className={inputClassName}
          />
        )}
      </div>
      {!isNote && (
        <>
          <div>
            <label htmlFor={field("description")} className="block text-sm text-gray-700 mb-1">
              Kuvaus
            </label>
            <input
              id={field("description")}
              value={value.description}
              onChange={(e) => setValue({ ...value, description: e.target.value })}
              className={inputClassName}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={field("price")} className="block text-sm text-gray-700 mb-1">
                Hinta €
              </label>
              <input
                id={field("price")}
                inputMode="decimal"
                placeholder="ei hintaa"
                value={value.price}
                onChange={(e) => setValue({ ...value, price: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor={field("unit")} className="block text-sm text-gray-700 mb-1">
                Yksikkö
              </label>
              <input
                id={field("unit")}
                value={value.unit}
                onChange={(e) => setValue({ ...value, unit: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>
          <div>
            <label htmlFor={field("note")} className="block text-sm text-gray-700 mb-1">
              Lisätieto hinnan alla
            </label>
            <input
              id={field("note")}
              value={value.note}
              onChange={(e) => setValue({ ...value, note: e.target.value })}
              className={inputClassName}
            />
          </div>
        </>
      )}
      <label className="flex items-center gap-2 text-sm text-gray-800 sm:col-span-2">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(e) => setValue({ ...value, active: e.target.checked })}
          className="h-5 w-5"
        />
        Näytetään sivuilla
      </label>
      {error && (
        <p className="text-red-700 text-sm sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={isPending} className={primaryButton}>
          {isPending ? "Tallennetaan…" : "Tallenna"}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending} className={rowButton}>
          Peru
        </button>
      </div>
    </form>
  );
}

export function PriceSectionEditor({ section, items }: { section: PriceSection; items: PriceItem[] }) {
  const { save, isPending, error } = useSave();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const isNote = section === "note";
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <li key={item.id} className="py-3">
            {editing === item.id ? (
              <ItemForm section={section} draft={draftOf(item)} code={item.code} onCancel={() => setEditing(null)} />
            ) : (
              <div className={`flex flex-wrap items-start justify-between gap-3 ${item.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className={isNote ? "whitespace-pre-line text-gray-800" : "font-medium text-gray-900"}>
                    {isNote && <span className="font-semibold">{index + 1}* </span>}
                    {item.name}
                    {!item.active && <span className="ml-2 text-xs text-gray-600">(piilotettu)</span>}
                  </p>
                  {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                </div>
                {!isNote && (
                  <p className="tabular-nums font-semibold text-gray-900 whitespace-nowrap">
                    {formatPrice(item, "ei hintaa")}
                    {item.note && <span className="block text-xs font-normal text-gray-600">{item.note}</span>}
                  </p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(item.id)} className={rowButton} aria-label={`Muokkaa: ${item.name.slice(0, 40)}`}>
                    Muokkaa
                  </button>
                  <button
                    type="button"
                    disabled={isPending || index === 0}
                    onClick={() => save(() => movePriceItem(item.id, "up"))}
                    className={rowButton}
                    aria-label={`Siirrä ylös: ${item.name.slice(0, 40)}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={isPending || index === items.length - 1}
                    onClick={() => save(() => movePriceItem(item.id, "down"))}
                    className={rowButton}
                    aria-label={`Siirrä alas: ${item.name.slice(0, 40)}`}
                  >
                    ↓
                  </button>
                  {!item.code && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (window.confirm(`Poistetaanko "${item.name.slice(0, 60)}" hinnastosta?`)) {
                          save(() => deletePriceItem(item.id));
                        }
                      }}
                      className={`${rowButton} text-red-700`}
                      aria-label={`Poista: ${item.name.slice(0, 40)}`}
                    >
                      Poista
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-red-700 text-sm" role="alert">
          {error}
        </p>
      )}
      {editing === "new" ? (
        <ItemForm
          section={section}
          draft={{ id: null, name: "", description: "", price: "", unit: UNITS[section] ?? "€", note: "", active: true }}
          code={null}
          onCancel={() => setEditing(null)}
        />
      ) : (
        section !== "training" && (
          <button type="button" onClick={() => setEditing("new")} className={rowButton}>
            + Lisää {isNote ? "huomio" : "rivi"}
          </button>
        )
      )}
    </div>
  );
}

export function ValidFromForm({ validFrom }: { validFrom: string | null }) {
  const { save, isPending, error } = useSave();
  const [date, setDate] = useState(validFrom ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(() => savePriceListValidFrom(date));
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div>
        <label htmlFor="price-list-valid-from" className="block text-sm text-gray-700 mb-1">
          Hinnasto voimassa alkaen
        </label>
        <input
          id="price-list-valid-from"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClassName} w-auto`}
        />
      </div>
      <button type="submit" disabled={isPending} className={primaryButton}>
        Tallenna päivä
      </button>
      {error && (
        <p className="text-red-700 text-sm" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
