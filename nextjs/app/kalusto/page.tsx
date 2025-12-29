import Link from "next/link";
import planesData from "@/data/planes.json";
import PlanePreviewCard from "@/components/planes/planePreviewCard";

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
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16">
          <div className="text-center space-y-6 animate-fade-in mt-10 mb-20 md:mt-12 md:mb-24">
            <h2 className="text-xl md:text-2xl font-bold leading-tight text-swhite">
              Tutustut kerhomme monipuoliseen lentokonekalustoon
            </h2>
          </div>

          <div className="space-y-12">
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
                <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6 text-center">
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
        </div>
      </section>
    </div>
  );
};

export default Page;
