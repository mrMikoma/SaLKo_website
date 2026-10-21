export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { isFlightLogEnabled } from "@/utilities/features"
import { hasPermission } from "@/utilities/roles"
import { ensureFreshSync } from "@/utilities/flightSync"
import { getMyFlights } from "@/utilities/flightLogData"
import PageHero from "@/components/pageHero"
import ContentSection from "@/components/contentSection"
import MyFlights from "@/components/flightLogs/MyFlights"

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

  if (!session?.user) {
    redirect("/auth/login")
  }
  if (!hasPermission(session.user.roles, "VIEW_OWN_FLIGHTS")) {
    redirect("/")
  }

  await ensureFreshSync()
  const flights = await getMyFlights(session.user.id)

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
        <div className="max-w-3xl mx-auto -mt-16">
          <MyFlights flights={flights} />
        </div>
      </ContentSection>
    </div>
  )
}
