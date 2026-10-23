export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { isFlightLogEnabled } from "@/utilities/features"
import { hasPermission } from "@/utilities/roles"
import { getInvoiceSettings, getMyInvoice } from "@/utilities/invoiceData"
import { getSender } from "@/utilities/mailConfig"
import InvoiceDocument from "@/components/invoices/InvoiceDocument"
import PrintButton from "@/components/billing/PrintButton"

export const metadata = {
  title: "Lasku | SaLKo",
}

interface PageProps {
  params: Promise<{ id: string }>
}

/** A member's own invoice, to read, pay and print */
export default async function Page({ params }: PageProps) {
  if (!isFlightLogEnabled()) {
    notFound()
  }
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }
  if (!hasPermission(session.user.roles, "VIEW_OWN_BILLING")) {
    redirect("/")
  }
  const id = Number((await params).id)
  const invoice = Number.isInteger(id) ? await getMyInvoice(session.user.id, id) : null
  if (!invoice) notFound()
  const settings = await getInvoiceSettings()

  // The navbar is fixed, so the page starts below it
  return (
    <div className="min-h-screen w-full bg-gray-100 pt-28 pb-12 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto px-4 space-y-4 print:max-w-none print:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/jasenalue/laskut" className="text-sblue hover:underline">
            ← Laskut
          </Link>
          <PrintButton />
        </div>
        <InvoiceDocument invoice={invoice} contactEmail={getSender("billing").address} footer={settings.footer} />
      </div>
    </div>
  )
}
