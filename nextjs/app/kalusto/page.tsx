import Link from "next/link";
import planesData from "@/data/planes.json";
import PlanePreviewCard from "@/components/planes/planePreviewCard";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import { pageMetadata } from "@/utilities/seo";

export const metadata = pageMetadata({
  title: "Kalusto – kerhon lentokoneet ja purjekoneet",
  description:
    "Savonlinnan Lentokerhon kalusto: Cessna 172, moottoripurjekone Fournier RF-5, kolme purjekonetta ja kunnostettava Piper Cub. Tekniset tiedot ja kuvat.",
  path: "/kalusto",
});

// Planes in the order they are shown in each section
const pick = (registrations: string[]) =>
  registrations.map((registration) => planesData.find((plane) => plane.registeration === registration)!);

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Kalusto"
        breadcrumbs={["Kalusto"]}
        compact={true}
        backgroundImage="oh386"
      >
        <div className="space-y-12 max-w-7xl mx-auto py-12 px-6 w-full">
          {/* Aircraft Categories */}
          <div className="space-y-8">
            {/* Powered aircraft in use: the Cessna and the motor glider */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6 text-center">
                Moottorikoneemme
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pick(["OH-CON", "OH-386"]).map((plane, index) => (
                  <PlanePreviewCard
                    key={plane.registeration}
                    plane={plane}
                    type="motor"
                    preload={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Gliders */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-sred my-6 text-center">
                Purjelentokoneemme
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pick(["OH-816", "OH-829", "OH-475"]).map((plane) => (
                  <PlanePreviewCard
                    key={plane.registeration}
                    plane={plane}
                    type="glider"
                  />
                ))}
              </div>
            </div>

            {/* The Cub waits for restoration and isn't flown */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-sred my-6 text-center">
                Kunnostettavana
              </h2>
              <div className="grid grid-cols-1 md:w-1/2 md:mx-auto">
                {pick(["OH-PDX"]).map((plane) => (
                  <PlanePreviewCard
                    key={plane.registeration}
                    plane={plane}
                    type="motor"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sbluel/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sbluel mb-6 text-center">
              Varauskalenteri
            </h2>
            <div className="text-center space-y-4">
              <p className="text-lg text-swhite/80">
                Kerhon jäsenet voivat varata koneita varauskalenterin kautta.
              </p>
              <Link
                href="/kalusto/varauskalenteri"
                className="inline-block px-8 py-4 bg-sred-dark text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred-dark/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Siirry varauskalenteriin
              </Link>
            </div>
          </div>
        </div>
      </PageHero>
    </div>
  );
};

export default Page;
