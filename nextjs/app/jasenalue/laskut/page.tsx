export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { isBillingEnabled } from "@/utilities/features"
import { hasPermission } from "@/utilities/roles"
import { getMyInvoices } from "@/utilities/invoiceData"
import { MAIL_PURPOSES } from "@/utilities/mailConfig"
import { euros } from "@/utilities/billing"
import { formatFullDate } from "@/utilities/flightFormat"
import PageHero from "@/components/pageHero"
import ContentSection from "@/components/contentSection"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceDocument"

export const metadata = {
  title: "Laskut | SaLKo",
  description: "Kerhon sinulle lähettämät laskut",
}

export default async function Page() {
  // Still being built: shown in dev, hidden in production
  if (!isBillingEnabled()) {
    notFound()
  }
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/")
  }
  if (!hasPermission(session.user.roles, "VIEW_OWN_BILLING")) {
    redirect("/")
  }
  const invoices = await getMyInvoices(session.user.id)

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Laskut"
        subtitle="Kerhon sinulle lähettämät laskut"
        breadcrumbs={[{ label: "Jäsenalue", link: false }, "Laskut"]}
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-3xl mx-auto -mt-16 space-y-6">
          <section className="bg-white rounded-xl shadow-lg overflow-hidden text-gray-900">
            {invoices.length === 0 ? (
              <p className="px-4 py-6 text-gray-700">Sinulle ei ole vielä laskuja.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/jasenalue/laskut/${invoice.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{invoice.title}</span>
                        <span className="block text-sm text-gray-600">
                          Lasku {invoice.number}
                          {invoice.dueDate && ` · eräpäivä ${formatFullDate(invoice.dueDate)}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 tabular-nums">
                        <span className="font-semibold">{euros(invoice.totalCents)}</span>
                        <InvoiceStatusBadge status={invoice.status} overdue={invoice.overdue} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
              Laskut tulevat myös sähköpostiisi. Kysyttävää laskuista: {MAIL_PURPOSES.billing.replyTo}
            </p>
          </section>
        </div>
      </ContentSection>
    </div>
  )
}
