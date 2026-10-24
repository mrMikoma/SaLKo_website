export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { isBillingEnabled, isFlightLogEnabled } from "@/utilities/features"
import { hasPermission } from "@/utilities/roles"
import { ensureFreshSync } from "@/utilities/flightSync"
import { getMyFlights } from "@/utilities/flightLogData"
import PageHero from "@/components/pageHero"
import ContentSection from "@/components/contentSection"
import MyFlights from "@/components/flightLogs/MyFlights"
import MyBills from "@/components/billing/MyBills"
import { getMyBills } from "@/utilities/billingData"
import Link from "next/link"

export const metadata = {
  title: "Lentopäiväkirja | SaLKo",
  description: "Omat lentosi kerhon lentopäiväkirjasta",
}

export default async function Page() {
  // Still being built: shown in dev, hidden in production
  if (!isFlightLogEnabled()) {
    notFound()
  }

  const session = await auth()

  if (!session?.user?.id) {
    redirect("/")
  }
  if (!hasPermission(session.user.roles, "VIEW_OWN_FLIGHTS")) {
    redirect("/")
  }

  await ensureFreshSync()
  const [flights, bills] = await Promise.all([
    getMyFlights(session.user.id),
    isBillingEnabled() && hasPermission(session.user.roles, "VIEW_OWN_BILLING")
      ? getMyBills(session.user.id)
      : [],
  ])

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Lentopäiväkirja"
        subtitle="Omat lentosi kerhon lentopäiväkirjasta"
        breadcrumbs={[{ label: "Jäsenalue", link: false }, "Lentopäiväkirja"]}
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-3xl mx-auto -mt-16 space-y-6">
          <div className="flex justify-end">
            <Link
              href="/jasenalue/lentopaivakirja/uusi"
              className="min-h-11 inline-flex items-center px-6 rounded-lg bg-sred text-white font-semibold shadow-lg hover:bg-sred/90"
            >
              + Kirjaa lento
            </Link>
          </div>
          <MyBills bills={bills} />
          <MyFlights flights={flights} />
        </div>
      </ContentSection>
    </div>
  )
}
