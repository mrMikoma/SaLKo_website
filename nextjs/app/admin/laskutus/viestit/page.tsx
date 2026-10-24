export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { getMailOverview, getOutbox, OutboxMessage } from "@/utilities/mailData";
import { formatDateTime } from "@/utilities/flightFormat";
import MailStatus from "@/components/mail/MailStatus";
import { RetryEmailButton, TestEmailButton } from "@/components/mail/MailActions";

export const metadata = {
  title: "Sähköpostit | Ylläpito",
};

const STATUS: Record<OutboxMessage["status"], { label: string; tone: string }> = {
  queued: { label: "Jonossa", tone: "bg-gray-100 text-gray-800" },
  sending: { label: "Lähtemässä", tone: "bg-gray-100 text-gray-800" },
  sent: { label: "Lähetetty", tone: "bg-green-100 text-green-900" },
  failed: { label: "Epäonnistui", tone: "bg-red-100 text-red-900" },
  held: { label: "Ei lähetetty", tone: "bg-amber-100 text-amber-900" },
};

const KIND: Record<string, string> = { test: "Testiviesti", invoice: "Lasku" };

/** What the website has sent, or tried to send, newest first */
export default async function OutboxPage() {
  if (!isBillingEnabled()) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    redirect("/");
  }
  const overview = getMailOverview();
  const messages = await getOutbox();

  return (
    <div className="space-y-6 text-gray-900">
      <div>
        <Link href="/admin/laskutus" className="text-sm text-sblue hover:underline">
          ← Laskutus
        </Link>
        <h1 className="text-3xl font-bold mt-1">Sähköpostit</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Kaikki viestit, jotka sivusto on lähettänyt tai yrittänyt lähettää. Epäonnistuneen
          viestin voi yrittää uudelleen, kun syy on korjattu.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <MailStatus overview={overview} />
        <TestEmailButton />
      </section>

      <section className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold px-6 py-4 border-b border-gray-200">
          Viestit ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <p className="p-6 text-gray-600">Ei vielä viestejä.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {messages.map((message) => (
              <li key={message.id} className="px-6 py-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{message.subject}</p>
                    <p className="text-sm text-gray-600 break-words">
                      {KIND[message.kind] ?? message.kind} ·{" "}
                      {message.toName ? `${message.toName} <${message.toAddress}>` : message.toAddress}
                      {message.deliveredTo && message.deliveredTo !== message.toAddress && (
                        <> · ohjattu osoitteeseen {message.deliveredTo}</>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(message.sentAt ?? message.createdAt)}
                      {message.createdByName && `, ${message.createdByName}`}
                      {message.attempts > 1 && ` · ${message.attempts} yritystä`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-medium ${STATUS[message.status].tone}`}
                  >
                    {STATUS[message.status].label}
                  </span>
                </div>
                {message.lastError && (
                  <p className="text-sm text-red-700" role="alert">
                    {message.lastError}
                  </p>
                )}
                {message.status === "failed" && (
                  <RetryEmailButton id={message.id} subject={message.subject} />
                )}
                <details>
                  <summary className="cursor-pointer text-sm text-sblue">Näytä viesti</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm font-sans">
                    {message.bodyText}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
