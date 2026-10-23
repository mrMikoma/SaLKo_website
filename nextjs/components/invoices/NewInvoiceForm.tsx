"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { euros } from "@/utilities/billing";
import { InvoicePreset, lineAmount, parseEuros, parseQuantity } from "@/utilities/invoices";
import { createInvoices, LineForm } from "@/utilities/invoiceActions";
import type { InvoiceRecipient } from "@/utilities/invoiceData";
import LineFields, { fieldClassName, labelClassName, primaryButton, secondaryButton } from "./LineFields";

const card = "bg-white rounded-lg shadow p-6 space-y-4 text-gray-900";
const amountOf = (line: LineForm) => lineAmount(parseQuantity(line.quantity) ?? 0, parseEuros(line.unitPrice) ?? 0);

/**
 * The same charge to many: membership fees to every member, a hangar fee to
 * one. Creates a draft per recipient, to check and send.
 */
const NewInvoiceForm = ({
  recipients,
  presets,
}: {
  recipients: InvoiceRecipient[];
  presets: InvoicePreset[];
}) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<LineForm[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [other, setOther] = useState({ enabled: false, name: "", email: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const search = filter.trim().toLowerCase();
  const shown = recipients.filter(
    (r) => !search || r.name.toLowerCase().includes(search) || r.email.toLowerCase().includes(search)
  );
  const total = lines.reduce((sum, line) => sum + amountOf(line), 0);
  const count = selected.size + (other.enabled ? 1 : 0);

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInvoices({
        userIds: [...selected],
        other: other.enabled ? { name: other.name, email: other.email, address: other.address } : null,
        title,
        message,
        lines,
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      const ids = result.result.ids;
      router.push(ids.length === 1 ? `/admin/laskut/${ids[0]}` : "/admin/laskut?nakyma=luonnokset");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={card}>
        <h2 className="text-xl font-semibold">Mitä laskutetaan</h2>
        <div>
          <label htmlFor="invoice-title" className={labelClassName}>
            Otsikko
          </label>
          <input
            id="invoice-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="esim. Jäsenmaksu 2027"
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor="invoice-message" className={labelClassName}>
            Viesti laskulla (valinnainen)
          </label>
          <textarea
            id="invoice-message"
            rows={2}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${fieldClassName} py-2`}
          />
        </div>

        {lines.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th scope="col" className="py-1 pr-2 font-medium">Selite</th>
                <th scope="col" className="py-1 pr-2 font-medium text-right">Määrä</th>
                <th scope="col" className="py-1 pr-2 font-medium text-right">Summa</th>
                <th scope="col">
                  <span className="sr-only">Poista</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2">{line.description}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{euros(amountOf(line))}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      className="text-red-700 hover:underline"
                      aria-label={`Poista rivi: ${line.description}`}
                    >
                      Poista
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold">
              <tr>
                <td className="py-2 pr-2" colSpan={2}>
                  Yhteensä / lasku
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{euros(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
        <LineFields presets={presets} idPrefix="new-line" onAdd={(line) => setLines([...lines, line])} />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Kenelle</h2>
          <p className="text-sm text-gray-600">{selected.size} jäsentä valittu</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="recipient-filter" className={labelClassName}>
              Hae nimellä tai sähköpostilla
            </label>
            <input
              id="recipient-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set([...selected, ...shown.map((r) => r.id)]))}
              className={secondaryButton}
            >
              Valitse näkyvät
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className={secondaryButton}>
              Tyhjennä
            </button>
          </div>
        </div>
        <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200">
          {shown.map((recipient) => (
            <li key={recipient.id}>
              <label className="flex min-h-11 items-start gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(recipient.id)}
                  onChange={(e) => toggle(recipient.id, e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="font-medium">{recipient.name}</span>
                  <span className="block text-sm text-gray-600 break-words">
                    {recipient.email}
                    {!recipient.address && <span className="text-amber-800"> · ei postiosoitetta</span>}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-2 text-gray-600">Ei osumia.</li>}
        </ul>

        <label className="flex min-h-11 items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={other.enabled}
            onChange={(e) => setOther({ ...other, enabled: e.target.checked })}
            className="h-5 w-5"
          />
          <span>Joku muu kuin jäsenlistalla oleva, esim. hallin vuokralainen</span>
        </label>
        {other.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="other-name" className={labelClassName}>
                Nimi
              </label>
              <input
                id="other-name"
                required
                value={other.name}
                onChange={(e) => setOther({ ...other, name: e.target.value })}
                className={fieldClassName}
              />
            </div>
            <div>
              <label htmlFor="other-email" className={labelClassName}>
                Sähköposti (tyhjä: tulostetaan)
              </label>
              <input
                id="other-email"
                type="email"
                value={other.email}
                onChange={(e) => setOther({ ...other, email: e.target.value })}
                className={fieldClassName}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="other-address" className={labelClassName}>
                Postiosoite
              </label>
              <textarea
                id="other-address"
                rows={2}
                value={other.address}
                onChange={(e) => setOther({ ...other, address: e.target.value })}
                className={`${fieldClassName} py-2`}
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={isPending || count === 0 || lines.length === 0} className={primaryButton}>
          {isPending ? "Luodaan…" : `Luo ${count} ${count === 1 ? "luonnos" : "luonnosta"}`}
        </button>
        <p className="text-sm text-gray-600">Luonnokset tarkistetaan ja lähetetään erikseen.</p>
      </div>
      {error && (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default NewInvoiceForm;
