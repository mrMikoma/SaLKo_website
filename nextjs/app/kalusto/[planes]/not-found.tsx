import Link from "next/link";
import PageHero from "@/components/pageHero";

/** An aircraft that isn't in the fleet: a 404 that leads back to Kalusto */
export default function PlaneNotFound() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Lentokonetta ei löytynyt"
        breadcrumbs={["Kalusto"]}
        compact={false}
        backgroundImage="bg-efsa-one"
        showScrollIndicator={false}
      >
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-lg p-8 md:p-12 border border-sred/20 text-center">
              <p className="text-lg text-swhite/80 mb-8">
                Etsimääsi lentokonetta ei löytynyt kalustostamme.
              </p>
              <Link
                href="/kalusto"
                className="inline-block px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Palaa kalustoon
              </Link>
            </div>
          </div>
        </div>
      </PageHero>
    </div>
  );
}
