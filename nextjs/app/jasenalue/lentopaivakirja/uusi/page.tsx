export const dynamic = "force-dynamic"

import { DateTime } from "luxon"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { isFlightLogEnabled } from "@/utilities/features"
import { hasPermission } from "@/utilities/roles"
import { getFlightFormOptions } from "@/utilities/flightLogData"
import { SHEET_ZONE } from "@/utilities/flightSheetParser"
import PageHero from "@/components/pageHero"
import ContentSection from "@/components/contentSection"
import FlightEntryForm from "@/components/flightLogs/FlightEntryForm"

export const metadata = {
  title: "Kirjaa lento | SaLKo",
  description: "Kirjaa lentosi kerhon lentopäiväkirjaan",
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
  if (!hasPermission(session.user.roles, "LOG_OWN_FLIGHT")) {
    redirect("/")
  }

  const options = await getFlightFormOptions(session.user.id)
  const today = DateTime.now().setZone(SHEET_ZONE)

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Kirjaa lento"
        subtitle="Lennot menevät kerhon lentopäiväkirjaan"
        breadcrumbs={[{ label: "Jäsenalue", link: false }, "Lentopäiväkirja", "Kirjaa lento"]}
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-2xl mx-auto -mt-16">
          <FlightEntryForm
            options={options}
            today={today.toISODate()!}
            yesterday={today.minus({ days: 1 }).toISODate()!}
          />
        </div>
      </ContentSection>
    </div>
  )
}
