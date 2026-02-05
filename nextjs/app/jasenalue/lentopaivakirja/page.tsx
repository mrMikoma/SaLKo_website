export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PageHero from "@/components/pageHero"
import ContentSection from "@/components/contentSection"
import FlightLogManager from "@/components/flightLogs/FlightLogManager"

export const metadata = {
  title: "Lentopäiväkirja | SaLKo",
  description: "Kirjaa ja hallinnoi lentotuntejasi",
}

export default async function Page() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Lentopäiväkirja"
        subtitle="Kirjaa ja seuraa lentotuntejasi"
        breadcrumbs={["Jäsenalue", "Lentopäiväkirja"]}
        backgroundImage="bg-punkaharju-one"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-6xl mx-auto -mt-16">
          <FlightLogManager />
        </div>
      </ContentSection>
    </div>
  )
}
