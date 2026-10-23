"use client";

import { useState } from "react";
import { euros } from "@/utilities/billing";
import { InvoicePreset, lineAmount, parseEuros, parseQuantity } from "@/utilities/invoices";
import type { LineForm } from "@/utilities/invoiceActions";

export const fieldClassName =
  "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-sblue focus:outline-none focus:ring-2 focus:ring-sblue/30";
export const labelClassName = "block text-sm text-gray-700 mb-1";
export const primaryButton =
  "min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued disabled:opacity-60";
export const secondaryButton =
  "min-h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 disabled:opacity-60";
export const dangerButton =
  "min-h-11 px-4 rounded-lg border border-red-300 bg-white text-red-700 font-medium hover:bg-red-50 disabled:opacity-60";

const centsToText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const BLANK: LineForm = { description: "", quantity: "1", unit: "kpl", unitPrice: "", lineDate: "" };

/** One invoice line to add: picked from the price list, or typed in */
const LineFields = ({
  presets,
  onAdd,
  disabled = false,
  idPrefix,
}: {
  presets: InvoicePreset[];
  // Resolves false to keep the typed line, e.g. when saving it failed
  onAdd: (line: LineForm) => void | Promise<boolean>;
  disabled?: boolean;
  idPrefix: string;
}) => {
  const [line, setLine] = useState<LineForm>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const groups = [...new Set(presets.map((preset) => preset.group))];

  const quantity = parseQuantity(line.quantity);
  const unitCents = parseEuros(line.unitPrice);
  const amount = quantity !== null && unitCents !== null ? lineAmount(quantity, unitCents) : null;

  const pick = (index: string) => {
    const preset = presets[Number(index)];
    if (!preset) return;
    setLine({ ...line, description: preset.description, unit: preset.unit, unitPrice: centsToText(preset.unitCents) });
    setError(null);
  };

  const add = async () => {
    if (!line.description.trim()) return setError("Anna rivin selite");
    if (quantity === null) return setError("Määrä ei kelpaa");
    if (unitCents === null) return setError("Hinta ei kelpaa, esim. 60 tai 3,10");
    setError(null);
    const kept = await onAdd(line);
    if (kept !== false) setLine(BLANK);
  };

  // Laid out by its own width: it sits both in a wide form and in a side panel
  return (
    <div className="@container space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-preset`} className={labelClassName}>
          Valmis rivi hinnastosta
        </label>
        <select
          id={`${idPrefix}-preset`}
          value=""
          onChange={(e) => pick(e.target.value)}
          disabled={disabled}
          className={fieldClassName}
        >
          <option value="">Valitse, tai kirjoita rivi alle…</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {presets.map((preset, index) =>
                preset.group === group ? (
                  <option key={index} value={index}>
                    {preset.description} – {euros(preset.unitCents)}
                    {preset.unit === "h" ? "/h" : ""}
                  </option>
                ) : null
              )}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="grid gap-3 grid-cols-3 @lg:grid-cols-[1fr_6rem_5rem_8rem]">
        <div className="col-span-3 @lg:col-span-1">
          <label htmlFor={`${idPrefix}-description`} className={labelClassName}>
            Selite
          </label>
          <input
            id={`${idPrefix}-description`}
            value={line.description}
            onChange={(e) => setLine({ ...line, description: e.target.value })}
            disabled={disabled}
            maxLength={200}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-quantity`} className={labelClassName}>
            Määrä
          </label>
          <input
            id={`${idPrefix}-quantity`}
            inputMode="decimal"
            value={line.quantity}
            onChange={(e) => setLine({ ...line, quantity: e.target.value })}
            disabled={disabled}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-unit`} className={labelClassName}>
            Yksikkö
          </label>
          <input
            id={`${idPrefix}-unit`}
            value={line.unit}
            onChange={(e) => setLine({ ...line, unit: e.target.value })}
            disabled={disabled}
            maxLength={10}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-price`} className={labelClassName}>
            À-hinta €
          </label>
          <input
            id={`${idPrefix}-price`}
            inputMode="decimal"
            value={line.unitPrice}
            onChange={(e) => setLine({ ...line, unitPrice: e.target.value })}
            disabled={disabled}
            className={fieldClassName}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} disabled={disabled} className={secondaryButton}>
          Lisää rivi
        </button>
        {amount !== null && <span className="text-sm text-gray-700 tabular-nums">Rivi yhteensä {euros(amount)}</span>}
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default LineFields;
