import Bulletings from "@/components/bulletings/bulletings";
import FeatureCard from "@/components/featureCard";
import PlaneIcon from "@/components/icons/plane";
import GraduationIcon from "@/components/icons/graduation";
import MapPinIcon from "@/components/icons/mapPin";
import HistoryTimeline from "@/components/historyTimeline";
import WeatherWidget from "@/components/weatherWidget";
import Link from "next/link";

export const metadata = {
  title: "SaLKo",
  description: "Savonlinnan Lentokerho ry",
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-32 pb-16 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-16">
          {/* Main Content - Left Side */}
          <div className="w-full lg:w-[55%] text-center lg:text-left space-y-8 animate-fade-in mt-16">
            {/* Pretitle */}
            <div className="inline-block">
              <span className="text-sbluel text-sm md:text-base font-semibold tracking-wider uppercase"></span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-swhite">
              Savonlinnan <br />
              <span className="text-sbluel">Lentokerho ry</span>
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-swhite/90  leading-relaxed lg:mx-0">
              Yleisilmailun harrastustoimintaan ja koulutukseen keskittynyt
              ilmailuyhdistys. Toimintamme tukeutuu Savonlinnan Lentoasemalle,
              15 km Savonlinnasta Enonkoskelle päin.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start pt-2">
              <Link
                href="/esittelylento"
                className="px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-center"
              >
                Lähde esittelylennolle
              </Link>
              <Link
                href="/koulutus"
                className="px-8 py-4 bg-sblue/80 backdrop-blur-sm text-swhite font-semibold rounded-lg shadow-xl hover:bg-sblue hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-sbluel/30 text-center"
              >
                Aloita lentokoulutus
              </Link>
              <Link
                href="/kerho/jasenyys"
                className="px-8 py-4 bg-transparent text-swhite font-semibold rounded-lg shadow-xl hover:bg-sblue/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-sbluel text-center"
              >
                Liity jäseneksi
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 lg:gap-8 justify-center lg:justify-start pt-4">
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-sred">
                  30
                </div>
                <div className="text-sm text-swhite/80">Jäsentä</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-sred">
                  5
                </div>
                <div className="text-sm text-swhite/80">Ilma-alusta</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-sred">
                  1962
                </div>
                <div className="text-sm text-swhite/80">Perustettu</div>
              </div>
            </div>
          </div>

          {/* Bulletin Sidebar - Right Side (Desktop) */}
          <div className="hidden lg:block w-full lg:w-[40%] lg:max-w-[500px] flex-shrink-0 lg:mt-20">
            <div className="glass rounded-2xl p-6 shadow-2xl border border-sred/20 max-h-[65vh] overflow-y-auto">
              <Bulletings />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="hidden lg:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-float">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-swhite/70 animate-pulse"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transform: "rotate(90deg)" }}
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            <div className="text-swhite/60 text-sm font-medium">Vieritä</div>
          </div>
        </div>
      </section>

      {/* Mobile Bulletin Section */}
      <section className="block lg:hidden w-full bg-sblued py-8">
        <div className="container mx-auto px-6">
          <Bulletings />
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="w-full bg-gradient-to-b from-sblued to-sblack py-16 lg:py-24">
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4">
              Tutustu toimintaamme
            </h2>
            <p className="text-lg text-swhite/80 mx-auto">
              Tarjoamme monipuolisia ilmailupalveluja koulutuksesta vapaalentoon
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Kalusto Card */}
            <FeatureCard
              title="Kalusto"
              description="Meillä on käytössä kaksi moottorilentokoneita sekä kolme purjekonetta. Koneemme ovat huolellisesti huollettuja ja turvallisuusstandardien mukaisia."
              icon={<PlaneIcon size={48} />}
              href="/kalusto"
              imageSrc="/images/OH-CON/ohcon_1.jpg"
              variant="default"
            />

            {/* Koulutus Card */}
            <FeatureCard
              title="Koulutus"
              description="Tarjoamme kattavaa lentokoulutusta aina alkeista ammattilentäjäksi. Kokeneet lennonopettajamme ohjaavat sinua turvallisesti kohti unelmiasi."
              icon={<GraduationIcon size={48} />}
              href="/koulutus"
              variant="highlighted"
            />

            {/* Kenttä Card */}
            <FeatureCard
              title="Savonlinnan Lentoasema"
              description="Toimintamme sijaitsee Savonlinnan lentoasemalla (EFSA), noin 15 km Savonlinnan keskustasta Enonkoskelle päin. Kenttä on avoinna ympäri vuoden."
              icon={<MapPinIcon size={48} />}
              href="/kentta"
              imageSrc="/images/efsa_1.jpg"
              variant="default"
            />
          </div>
        </div>
      </section>

      {/* Weather and Info Section */}
      <section className="w-full bg-sblack py-16 lg:py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weather Widget */}
            <div>
              <WeatherWidget />
            </div>

            {/* Quick Info Card */}
            <div className="glass rounded-2xl p-8 border border-sred/20 shadow-xl">
              <h3 className="text-2xl font-bold text-swhite mb-6 pb-3 border-b-2 border-sred">
                Lentokenttä
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-sred flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <div className="font-semibold text-swhite">Sijainti</div>
                    <div className="text-swhite/80">
                      Savonlinnan Lentoasema (EFSA)
                      <br />
                      Lentoasemantie 50, 57310 Savonlinna
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-sred flex-shrink-0 mt-1"
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
                  <div>
                    <div className="font-semibold text-swhite">Kiitotie</div>
                    <div className="text-swhite/80">
                      15/33, 2000m asfaltti
                      <br />
                      Toimii ympäri vuoden
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-sred flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <div className="font-semibold text-swhite">Etäisyys</div>
                    <div className="text-swhite/80">
                      15 km Savonlinnan keskustasta
                      <br />
                      Enonkosken suuntaan
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <HistoryTimeline />

      {/* Call to Action Section */}
      <section className="w-full bg-gradient-to-b from-sblack to-sblued py-16 lg:py-20">
        <div className="container mx-auto px-6">
          <div className="glass rounded-3xl p-8 md:p-12 text-center border border-sred/30 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4">
              Haluatko lentäjäksi?
            </h2>
            <p className="text-lg md:text-xl text-swhite/90 mb-8 mx-auto">
              Ota yhteyttä ja aloita matkasi taivaalle. Tarjoamme
              tutustumislentoja ja koulutusta kaikille ilmailusta
              kiinnostuneille.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/yhteystiedot"
                className="px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Ota yhteyttä
              </Link>
              <Link
                href="/koulutus"
                className="px-8 py-4 bg-transparent text-swhite font-semibold rounded-lg shadow-xl hover:bg-sblue/30 transition-all duration-300 border-2 border-sbluel"
              >
                Katso koulutusohjelma
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
