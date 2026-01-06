import Link from "next/link";
import planesData from "@/data/planes.json";
import PlanePreviewCard from "@/components/planes/planePreviewCard";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";

export const metadata = {
  title: "Kalusto | SaLKo",
  description: "Savonlinnan Lentokerhon lentokonekalusto",
  keywords: [
    "Savonlinnan Lentokerho",
    "kalusto",
    "lentokoneet",
    "purjelentokoneet",
    "Cessna 172",
    "Puchacz",
    "Junior",
    "Savonlinna",
  ],
};

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Kalusto"
        breadcrumbs={["Kalusto"]}
        compact={true}
        backgroundImage="bg-mopu-one"
        children={
          <div className="space-y-12 max-w-7xl mx-auto py-12 px-6 w-full">
            {/* Aircraft Categories */}
            <div className="space-y-8">
              {/* Motor Aircraft */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6 text-center">
                  Moottorilentokoneemme
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {planesData
                    .filter(
                      (plane: any) =>
                        plane.registeration === "OH-CON" ||
                        plane.registeration === "OH-PDX"
                    )
                    .map((plane: any) => (
                      <PlanePreviewCard
                        key={plane.registeration}
                        plane={plane}
                        type="motor"
                      />
                    ))}
                </div>
              </div>

              {/* Gliders */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-sred my-6 text-center">
                  Purjelentokoneemme
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {planesData
                    .filter(
                      (plane: any) =>
                        plane.registeration === "OH-386" ||
                        plane.registeration === "OH-816" ||
                        plane.registeration === "OH-829" ||
                        plane.registeration === "OH-475"
                    )
                    .map((plane: any) => (
                      <PlanePreviewCard
                        key={plane.registeration}
                        plane={plane}
                        type="glider"
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
                <a
                  href="/kalusto/varauskalenteri"
                  className="inline-block px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  Siirry varauskalenteriin
                </a>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default Page;
