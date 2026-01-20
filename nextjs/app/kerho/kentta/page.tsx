import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import ImageGallery from "@/components/imageGallery";
import WeatherWidget from "@/components/weatherWidget";

export const metadata = {
  title: "Kenttä",
  description: "Savonlinnan lentoasema - Savonlinnan Lentokerhon kotikenttä",
  keywords: [
    "Savonlinnan lentoasema",
    "Savonlinnan lentokenttä",
    "EFSA",
    "SVL",
    "lentoasema",
    "lentokenttä",
    "kiitotie",
    "Savonlinna",
  ],
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Savonlinnan Lentoasema"
        breadcrumbs={["Kerho", "Kenttä"]}
        backgroundImage="bg-efsa-one"
        showScrollIndicator={true}
        children={
          <div className="max-w-[1600px] mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Perustiedot Card */}
              <div className="glass rounded-xl p-6 md:p-8 border border-sbluel/20 backdrop-blur-md">
                <h3 className="text-xl md:text-2xl font-bold text-sbluel mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Perustiedot
                </h3>
                <div className="space-y-3 text-swhite/90">
                  <p>
                    Savonlinnan Lentoasema (ICAO:{" "}
                    <span className="font-semibold text-swhite">EFSA</span>,
                    IATA: <span className="font-semibold text-swhite">SVL</span>
                    ) sijaitsee 15 km Savonlinnan pohjoispuolella,
                    Enonkoskentien 471 varrella.
                  </p>
                  <div className="pt-2 border-t border-swhite/10">
                    <p className="text-sm text-swhite/70 mb-1">Osoite</p>
                    <p className="font-semibold text-swhite">
                      Lentoasemantie 50, 57310 Savonlinna
                    </p>
                  </div>
                  <div className="pt-2 border-t border-swhite/10">
                    <p className="text-sm text-swhite/70 mb-1">
                      Lentoaseman ylläpitäjä
                    </p>
                    <a
                      href="https://www.finavia.fi/fi/lentoasemat/savonlinna"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-sbluel hover:text-sbluel/80 transition-colors"
                    >
                      Finavia
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Toiminta Card */}
              <div className="glass rounded-xl p-6 md:p-8 border border-sbluel/20 backdrop-blur-md">
                <h3 className="text-xl md:text-2xl font-bold text-sbluel mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Toiminta
                </h3>
                <div className="space-y-3 text-swhite/90">
                  <p>
                    Savonlinnan Lentokerho on toiminut Savonlinnan lentoasemalla
                    sen käyttöönotosta vuodesta 1974 alkaen. Lentoasema tarjoaa
                    erinomaiset puitteet sekä moottori- että
                    purjelentotoiminnalle.
                  </p>
                  <p>
                    Kenttä on avoinna ympäri vuoden, ja rauhallinen ilmatila
                    sekä pitkä kiitotie tekevät siitä ihanteellisen paikan
                    lentokoulutukselle ja harrastelentämiselle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <ContentSection variant="light" backgroundImage="bg-punkaharju-one">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-sred mb-8 text-center">
            Säätiedot
          </h2>
          <WeatherWidget />
        </div>
      </ContentSection>

      <ContentSection variant="dark">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-sred mb-8 text-center">
            Tarkemmant tiedot kentästä
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kiitotie */}
            <div className="glass rounded-xl p-6 md:p-8 border border-sbluel/20">
              <h3 className="text-xl md:text-2xl font-bold text-sbluel mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Kiitotie
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                    <p className="text-swhite/70 text-sm mb-1">Suunta</p>
                    <p className="text-xl font-bold text-swhite">12/30</p>
                  </div>
                  <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                    <p className="text-swhite/70 text-sm mb-1">Päällyste</p>
                    <p className="text-xl font-bold text-swhite">Asfaltti</p>
                  </div>
                  <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                    <p className="text-swhite/70 text-sm mb-1">Mitat</p>
                    <p className="text-xl font-bold text-swhite">2300 x 45 m</p>
                  </div>
                  <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                    <p className="text-swhite/70 text-sm mb-1">Korkeus MSL</p>
                    <p className="text-xl font-bold text-swhite">
                      312 ft (95 m)
                    </p>
                  </div>
                </div>
                <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                  <p className="text-swhite/70 text-sm mb-1">Koordinaatit</p>
                  <p className="text-lg font-semibold text-swhite font-mono">
                    61°56'40″N, 28°56'05″E
                  </p>
                </div>
              </div>
            </div>

            {/* Radiotaajuudet */}
            <div className="glass rounded-xl p-6 md:p-8 border border-sbluel/20">
              <h3 className="text-xl md:text-2xl font-bold text-sbluel mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
                Radiotaajuudet
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                  <p className="text-swhite/70 text-sm mb-1">AFIS</p>
                  <p className="text-xl font-bold text-swhite font-mono">
                    118.80 MHz
                  </p>
                </div>
                <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                  <p className="text-swhite/70 text-sm mb-1">ATIS</p>
                  <p className="text-xl font-bold text-swhite font-mono">
                    136.050 MHz
                  </p>
                </div>
                <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                  <p className="text-swhite/70 text-sm mb-1">ILS/DME RWY 12</p>
                  <p className="text-xl font-bold text-swhite font-mono">
                    111.100 MHz
                  </p>
                </div>
              </div>
            </div>

            {/* Ilmatila */}
            <div className="glass rounded-xl p-6 md:p-8 border border-sbluel/20 lg:col-span-2">
              <h3 className="text-xl md:text-2xl font-bold text-sbluel mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
                ATS-Ilmatila
              </h3>
              <div className="space-y-4">
                {/* EFSA FIZ UPPER */}
                <div className="bg-sblued/40 rounded-lg p-4 border border-sbluel/20">
                  <h4 className="text-lg font-bold text-swhite mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-sred/30 border border-sred/50 rounded text-sm font-bold">
                      EFSA FIZ UPPER
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">
                        Ilmatilaluokka
                      </p>
                      <p className="text-swhite font-bold text-lg">G</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">
                        Huomioitavaa
                      </p>
                      <p className="text-swhite text-sm">RMZ H24</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">Ylärajä</p>
                      <p className="text-swhite font-semibold">FL 095</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">Alaraja</p>
                      <p className="text-swhite font-semibold">1900 FT MSL</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10 md:col-span-2">
                      <p className="text-swhite/70 text-xs mb-1">ATS-yksikkö</p>
                      <p className="text-swhite text-sm">
                        Savonlinna TIEDOTUS, 118.800 119.700 121.500 (EMERG)
                      </p>
                    </div>
                  </div>
                </div>

                {/* EFSA FIZ LOWER */}
                <div className="bg-sblued/40 rounded-lg p-4 border border-sbluel/20">
                  <h4 className="text-lg font-bold text-swhite mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-sred/30 border border-sred/50 rounded text-sm font-bold">
                      EFSA FIZ LOWER
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">
                        Ilmatilaluokka
                      </p>
                      <p className="text-swhite font-bold text-lg">G</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">
                        Huomioitavaa
                      </p>
                      <p className="text-swhite text-sm">RMZ H24</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">Ylärajä</p>
                      <p className="text-swhite font-semibold">1900 FT MSL</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10">
                      <p className="text-swhite/70 text-xs mb-1">Alaraja</p>
                      <p className="text-swhite font-semibold">SFC</p>
                    </div>
                    <div className="bg-sblued/30 rounded-lg p-3 border border-sbluel/10 md:col-span-2">
                      <p className="text-swhite/70 text-xs mb-1">ATS-yksikkö</p>
                      <p className="text-swhite text-sm">
                        Savonlinna TIEDOTUS, 118.800 119.700 121.500 (EMERG)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-sblued/30 rounded-lg p-4 border border-sbluel/10">
                  <p className="text-swhite/70 text-sm mb-1">Huomautus</p>
                  <p className="text-swhite/90 text-sm">
                    EFSA FIZ = Savonlinnan lennotiedotusvyöhyke (Flight
                    Information Zone). Tarkista aukioloajat ja käytettävyys{" "}
                    <a
                      href="https://www.ais.fi/bulletins/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sbluel hover:text-sbluel/80 underline font-semibold"
                    >
                      NOTAM
                    </a>
                    -tiedotteista.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentSection>

      {/*
      <ContentSection variant="dark" backgroundImage="bg-punkaharju-one">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-sred mb-8 text-center">
            Kuvia Lentoasemalta
          </h2>
          <ImageGallery
            images={[
              {
                src: "/images/EFSA/efsa_1.jpg",
                alt: "Savonlinnan lentoasema ilmasta kuvattuna",
              },
            ]}
            title="Savonlinnan Lentoasema"
          />
        </div>
      </ContentSection>
      */}

      <ContentSection variant="darker" backgroundImage="bg-ohcon-one">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-sred mb-6 text-center">
            Lisätietoja
          </h2>
          <p className="text-swhite/90 mb-10 text-lg text-center max-w-3xl mx-auto">
            Tarkemmat tiedot lentoasemasta ja sen palveluista löydät Finavian
            sivuilta ja tuoreesta EFSA eAIP -julkaisusta.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Finavia Link Card */}
            <div className="glass rounded-xl p-6 border border-sbluel/20 group hover:border-sbluel/40 transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-sred/20 rounded-lg border border-sred/30 group-hover:bg-sred/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-sred"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-swhite mb-2">
                    Finavia
                  </h3>
                  <p className="text-swhite/70 text-sm mb-4">
                    Lentoaseman ylläpitäjän viralliset tiedot, palvelut ja
                    käytännön ohjeistus.
                  </p>
                  <a
                    href="https://www.finavia.fi/fi/lentoasemat/savonlinna"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sbluel hover:text-sbluel/80 font-semibold transition-colors group/link"
                  >
                    Avaa Finavian sivut
                    <svg
                      className="w-5 h-5 transition-transform group-hover/link:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* eAIP Link Card */}
            <div className="glass rounded-xl p-6 border border-sbluel/20 group hover:border-sbluel/40 transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-sred/20 rounded-lg border border-sred/30 group-hover:bg-sred/30 transition-colors">
                  <svg
                    className="w-8 h-8 text-sred"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-swhite mb-2">
                    Fintraffic eAIP
                  </h3>
                  <p className="text-swhite/70 text-sm mb-4">
                    Fintraffic Lennonvarmistuksen viralliset sähköiset
                    ilmailukäsikirja eAIP -julkaisut.
                  </p>
                  <a
                    href="https://www.ais.fi/eaip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sbluel hover:text-sbluel/80 font-semibold transition-colors group/link"
                  >
                    Avaa eAIP-julkaisut
                    <svg
                      className="w-5 h-5 transition-transform group-hover/link:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentSection>
    </div>
  );
}
