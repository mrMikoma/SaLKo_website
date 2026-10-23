"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { euros } from "@/utilities/billing";
import type { InvoicePreset } from "@/utilities/invoices";
import type { Invoice } from "@/utilities/invoiceData";
import {
  addDraftLine,
  cancelInvoice,
  createPeriodInvoices,
  deleteDraft,
  removeDraftLine,
  resendInvoice,
  sendInvoices,
  setInvoicePaid,
  updateDraft,
} from "@/utilities/invoiceActions";
import LineFields, {
  dangerButton,
  fieldClassName,
  labelClassName,
  primaryButton,
  secondaryButton,
} from "./LineFields";

type Result = { status: "success"; result?: unknown } | { status: "error"; error: string };

// Runs an invoice action, shows how it went, and refreshes the page
function useInvoiceAction() {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>, okText?: (result: Result) => string | null) =>
    new Promise<boolean>((resolve) => {
      setMessage(null);
      startTransition(async () => {
        const result = await action();
        if (result.status === "error") {
          setMessage({ ok: false, text: result.error });
          resolve(false);
          return;
        }
        const text = okText?.(result) ?? null;
        if (text) setMessage({ ok: true, text });
        router.refresh();
        resolve(true);
      });
    });
  const messageText = message && (
    <p className={message.ok ? "text-green-800" : "text-red-700"} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );
  return { run, isPending, messageText };
}

const resultOf = (result: Result) => (result.status === "success" ? result.result : undefined);
const resultText = (result: Result) => (resultOf(result) as { text?: string } | undefined)?.text ?? null;

/** A draft's recipient and texts */
export const DraftEditor = ({ invoice }: { invoice: Invoice }) => {
  const { run, isPending, messageText } = useInvoiceAction();
  const [form, setForm] = useState({
    name: invoice.recipientName,
    email: invoice.recipientEmail ?? "",
    address: invoice.recipientAddress,
    title: invoice.title,
    message: invoice.message,
  });
  const field = (key: keyof typeof form, label: string, extra: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`draft-${key}`} className={labelClassName}>
        {label}
      </label>
      <input
        id={`draft-${key}`}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={fieldClassName}
        {...extra}
      />
    </div>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            updateDraft(invoice.id, {
              recipient: { name: form.name, email: form.email, address: form.address },
              title: form.title,
              message: form.message,
            }),
          () => "Tallennettu."
        );
      }}
      className="space-y-3"
    >
      {field("name", "Vastaanottaja", { required: true, maxLength: 120 })}
      {field("email", "Sähköposti (tyhjä: tulostetaan)", { type: "email" })}
      <div>
        <label htmlFor="draft-address" className={labelClassName}>
          Postiosoite
        </label>
        <textarea
          id="draft-address"
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={`${fieldClassName} py-2`}
        />
      </div>
      {field("title", "Otsikko", { required: true, maxLength: 120 })}
      <div>
        <label htmlFor="draft-message" className={labelClassName}>
          Viesti laskulla
        </label>
        <textarea
          id="draft-message"
          rows={2}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={`${fieldClassName} py-2`}
        />
      </div>
      <button type="submit" disabled={isPending} className={secondaryButton}>
        {isPending ? "Tallennetaan…" : "Tallenna muutokset"}
      </button>
      {messageText}
    </form>
  );
};

/** Lines typed onto a draft can be removed; more can be added */
export const DraftLines = ({ invoice, presets }: { invoice: Invoice; presets: InvoicePreset[] }) => {
  const { run, isPending, messageText } = useInvoiceAction();
  const typed = invoice.lines.filter((line) => line.source === "other");
  return (
    <div className="space-y-4">
      {typed.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {typed.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                {line.description} <span className="text-gray-600 tabular-nums">{euros(line.amountCents)}</span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => removeDraftLine(invoice.id, line.id))}
                className="text-red-700 hover:underline disabled:opacity-50"
                aria-label={`Poista rivi: ${line.description}`}
              >
                Poista
              </button>
            </li>
          ))}
        </ul>
      )}
      <LineFields
        presets={presets}
        idPrefix="draft-line"
        disabled={isPending}
        onAdd={(line) => run(() => addDraftLine(invoice.id, line))}
      />
      {messageText}
    </div>
  );
};

/** Sending a draft, or removing it */
export const DraftSend = ({ invoice, mailOn }: { invoice: Invoice; mailOn: boolean }) => {
  const router = useRouter();
  const { run, isPending, messageText } = useInvoiceAction();
  const label = invoice.recipientEmail
    ? mailOn
      ? "Lähetä lasku"
      : "Viimeistele lasku (sähköposti ei käytössä)"
    : "Viimeistele lasku tulostettavaksi";
  const send = () => {
    const to = invoice.recipientEmail ? ` osoitteeseen ${invoice.recipientEmail}` : "";
    if (!window.confirm(`Lähetetäänkö lasku ${euros(invoice.totalCents)}${to}? Lähetettyä laskua ei voi muuttaa.`)) return;
    run(() => sendInvoices([invoice.id]), resultText);
  };
  const remove = () => {
    if (!window.confirm("Poistetaanko luonnos?")) return;
    run(() => deleteDraft(invoice.id)).then((ok) => ok && router.push("/admin/laskut?nakyma=luonnokset"));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={send}
          disabled={isPending || invoice.totalCents <= 0}
          className={primaryButton}
        >
          {isPending ? "Lähetetään…" : label}
        </button>
        <button type="button" onClick={remove} disabled={isPending} className={dangerButton}>
          Poista luonnos
        </button>
      </div>
      {invoice.totalCents <= 0 && <p className="text-sm text-orange-800">Laskun summan pitää olla yli 0 €.</p>}
      {messageText}
    </div>
  );
};

/** An issued, unpaid invoice: paid, sent again, or cancelled */
export const OpenInvoiceActions = ({ invoice }: { invoice: Invoice }) => {
  const { run, isPending, messageText } = useInvoiceAction();
  const [address, setAddress] = useState(invoice.recipientEmail ?? "");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => run(() => setInvoicePaid(invoice.id, true))}
          disabled={isPending}
          className={primaryButton}
        >
          Merkitse maksetuksi
        </button>
        {messageText}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => resendInvoice(invoice.id, address), resultText);
        }}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="resend-address" className={labelClassName}>
            Lähetä uudelleen osoitteeseen
          </label>
          <input
            id="resend-address"
            type="email"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <button type="submit" disabled={isPending} className={secondaryButton}>
          Lähetä uudelleen
        </button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!window.confirm("Mitätöidäänkö lasku? Sitä ei voi palauttaa.")) return;
          run(() => cancelInvoice(invoice.id, reason));
        }}
        className="flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="cancel-reason" className={labelClassName}>
            Mitätöinnin syy (näkyy laskussa)
          </label>
          <input
            id="cancel-reason"
            required
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <button type="submit" disabled={isPending} className={dangerButton}>
          Mitätöi lasku
        </button>
      </form>
    </div>
  );
};

export const PaidInvoiceActions = ({ invoice }: { invoice: Invoice }) => {
  const { run, isPending, messageText } = useInvoiceAction();
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run(() => setInvoicePaid(invoice.id, false))}
        disabled={isPending}
        className={secondaryButton}
      >
        Peru maksu
      </button>
      {messageText}
    </div>
  );
};

/**
 * Sends every draft in the list that has a total. After sending, only the
 * result shows: the drafts are gone from the list.
 */
export const SendDraftsButton = ({ ids, mailOn }: { ids: number[]; mailOn: boolean }) => {
  const { run, isPending, messageText } = useInvoiceAction();
  if (ids.length === 0 && !messageText && !isPending) return null;
  const send = () => {
    if (!window.confirm(`Lähetetäänkö ${ids.length} laskua? Lähetettyjä laskuja ei voi muuttaa.`)) return;
    run(() => sendInvoices(ids), resultText);
  };
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-3">
      {ids.length > 0 && (
        <>
          <p className="text-gray-700">
            Tarkista luonnokset ennen lähettämistä. Ilman sähköpostiosoitetta oleva lasku viimeistellään
            tulostettavaksi.
          </p>
          <button type="button" onClick={send} disabled={isPending} className={primaryButton}>
            {isPending
              ? "Lähetetään…"
              : mailOn
                ? `Lähetä kaikki luonnokset (${ids.length})`
                : `Viimeistele kaikki luonnokset (${ids.length})`}
          </button>
        </>
      )}
      {messageText}
    </div>
  );
};

/**
 * On a closed period: a draft invoice for each payer still without one.
 * After creating, only the result shows.
 */
export const CreatePeriodInvoicesButton = ({
  periodId,
  uninvoiced,
}: {
  periodId: number;
  uninvoiced: number;
}) => {
  const { run, isPending, messageText } = useInvoiceAction();
  if (uninvoiced === 0 && !messageText && !isPending) return null;
  return (
    <div className="space-y-2">
      {uninvoiced > 0 && (
        <button
          type="button"
          onClick={() =>
            run(
              () => createPeriodInvoices(periodId),
              (result) => {
                const { created, paid } = resultOf(result) as { created: number; paid: number };
                return `${created} ${created === 1 ? "luonnos" : "luonnosta"} luotu${paid > 0 ? `; ${paid} jo maksanutta ohitettiin` : ""}.`;
              }
            )
          }
          disabled={isPending}
          className={primaryButton}
        >
          {isPending ? "Luodaan…" : "Luo laskuluonnokset"}
        </button>
      )}
      {messageText}
    </div>
  );
};
