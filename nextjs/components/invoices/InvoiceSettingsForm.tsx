"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInvoiceSettings } from "@/utilities/invoiceActions";
import type { InvoiceSettings } from "@/utilities/invoiceData";
import { fieldClassName, labelClassName, primaryButton } from "./LineFields";

/** The payment term and the note at the end of every invoice */
const InvoiceSettingsForm = ({ settings }: { settings: InvoiceSettings }) => {
  const router = useRouter();
  const [days, setDays] = useState(String(settings.paymentTermDays));
  const [footer, setFooter] = useState(settings.footer);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await saveInvoiceSettings({ paymentTermDays: Number(days), footer });
          setMessage(result.status === "success" ? { ok: true, text: "Tallennettu." } : { ok: false, text: result.error });
          if (result.status === "success") router.refresh();
        });
      }}
      className="space-y-3"
    >
      <div>
        <label htmlFor="invoice-term" className={labelClassName}>
          Maksuaika, päivää
        </label>
        <input
          id="invoice-term"
          type="number"
          min={1}
          max={90}
          required
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className={`${fieldClassName} w-28`}
        />
      </div>
      <div>
        <label htmlFor="invoice-footer" className={labelClassName}>
          Lopputeksti jokaiseen laskuun (valinnainen)
        </label>
        <textarea
          id="invoice-footer"
          rows={3}
          maxLength={500}
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="esim. Viivästyskorko korkolain mukaan. Huomautukset 7 päivän kuluessa."
          className={`${fieldClassName} py-2`}
        />
      </div>
      <button type="submit" disabled={isPending} className={primaryButton}>
        {isPending ? "Tallennetaan…" : "Tallenna"}
      </button>
      {message && (
        <p className={message.ok ? "text-green-800 text-sm" : "text-red-700 text-sm"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </form>
  );
};

export default InvoiceSettingsForm;
