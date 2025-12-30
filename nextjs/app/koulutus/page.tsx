import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import SolidCard from "@/components/solidCard";
import TextBlock from "@/components/textBlock";
import CallToAction from "@/components/callToAction";
import PlaneIcon from "@/components/icons/plane";
import Image from "next/image";

export const metadata = {
  title: "Koulutus / SaLKo",
  description: "Lentokoulutus Savonlinnan Lentokerholla",
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Hero Section - Compact */}
      <PageHero
        title="Koulutus"
        breadcrumbs={["Koulutus"]}
        compact={false}
        backgroundImage="bg-ohcon-one"
      >
        {/* Introduction Section - Inside the hero */}
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-4xl mx-auto">
            {/* Main intro */}
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-swhite mb-6">
                Aloita lentoharrastus
              </h2>
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed">
                Tarjoamme monipuolista moottorilentokoulutusta Savonlinnan
                lentokentällä. Koulutus räätälöidään henkilökohtaisten
                tavoitteidesi mukaan yhteistyössä lennonopettajien kanssa.
              </p>
            </div>

            {/* Quick info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Card 1 */}
              <div className="bg-sblued/50 backdrop-blur-sm border-2 border-sbluel/30 rounded-xl p-6 text-center hover:border-sred/50 transition-all duration-300">
                <div className="text-4xl font-bold text-sred mb-2">PPL (A)</div>
                <div className="text-m text-swhite/80">
                  Yksityislentäjän lupakirja
                </div>
                <div className="text-s text-swhite/60 mt-2">45+ tuntia</div>
              </div>

              {/* Card 2 */}
              <div className="bg-sblued/50 backdrop-blur-sm border-2 border-sbluel/30 rounded-xl p-6 text-center hover:border-sred/50 transition-all duration-300">
                <div className="text-4xl font-bold text-sred mb-2">
                  LAPL (A)
                </div>
                <div className="text-m text-swhite/80">
                  Kevyiden ilma-alusten lupakirja
                </div>
                <div className="text-s text-swhite/60 mt-2">30+ tuntia</div>
              </div>

              {/* Card 3 */}
              <div className="bg-sblued/50 backdrop-blur-sm border-2 border-sbluel/30 rounded-xl p-6 text-center hover:border-sred/50 transition-all duration-300">
                <div className="text-4xl font-bold text-sred mb-2">TMG</div>
                <div className="text-m text-swhite/80">
                  TMG-moottoripurjelentäjän lupakirja
                </div>
                <div className="text-s text-swhite/60 mt-2">10+ tuntia</div>
              </div>

              {/* Card 4 - Night Flight */}
              <div className="bg-sblued/50 backdrop-blur-sm border-2 border-sbluel/30 rounded-xl p-6 text-center hover:border-sred/50 transition-all duration-300">
                <div className="text-4xl font-bold text-sred mb-2">NF</div>
                <div className="text-m text-swhite/80">Yölento-oikeus</div>
                <div className="text-s text-swhite/60 mt-2">5+ tuntia</div>
              </div>
            </div>
          </div>
        </div>
      </PageHero>

      {/* Training Programs Section */}
      <ContentSection variant="dark">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4 text-center">
            Koulutusohjelmat
          </h2>
          <p className="text-lg text-swhite/80 text-center max-w-3xl mx-auto mb-12">
            Annamme lentokoulutusta kolmessa eri lupakirjatyypissä sekä
            yölento-oikeuden koulutusta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* PPL - Private Pilot License */}
          <SolidCard
            title="PPL(A)"
            description="Yksityislentäjän lupakirja (Private Pilot License - Airplane). Voit lentää yksin tai matkustajien kanssa harrastemielessä."
            icon={<PlaneIcon size={48} />}
            variant="highlighted"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Vähintään 45 lentotuntia</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Teoriaopinnot ja kokeet</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Ikäraja: 17 vuotta</span>
              </div>
            </div>
          </SolidCard>

          {/* LAPL - Light Aircraft Pilot License */}
          <SolidCard
            title="LAPL(A)"
            description="Kevytlentäjän lupakirja (Light Aircraft Pilot License). Suunniteltu harrasteilmailuun Euroopassa."
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Vähintään 30 lentotuntia</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Kevyempi teoriaopinnot</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Ikäraja: 17 vuotta</span>
              </div>
            </div>
          </SolidCard>

          {/* TMG - Touring Motor Glider License */}
          <SolidCard
            title="TMG"
            description="Purjelentokoneen moottorilupakirja (Touring Motor Glider License). Yhdistää purjelennon ja moottorilentämisen edut."
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Vähintään 15 lentotuntia</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Teoriaopinnot ja kokeet</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Ikäraja: 16 vuotta</span>
              </div>
            </div>
          </SolidCard>

          {/* NF - Night Flight Rating */}
          <SolidCard
            title="NF"
            description="Yölento-oikeus (Night Flight Rating). Mahdollistaa lentämisen yöolosuhteissa PPL-lupakirjan laajennuksena."
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Vähintään 5 lentotuntia</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Teoria ja yölento-harjoittelu</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-sred flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Vaatii voimassa olevan PPL</span>
              </div>
            </div>
          </SolidCard>
        </div>
      </ContentSection>

      {/* How it Works Section */}
      <ContentSection
        variant="light"
        overlay="light"
        backgroundImage="bg-ohcon-two"
      >
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4 text-center">
            Näin aloitat
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Step 1 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Ota yhteyttä
              </h3>
              <p className="text-swhite/80">
                Ota yhteyttä kerhoomme lennonopettajaan ja kerro
                kiinnostuksestasi lentokoulutukseen. Voimme vastata kysymyksiisi
                ja auttaa sinua valitsemaan sopivan koulutusohjelman.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Tutustumislento
              </h3>
              <p className="text-swhite/80">
                Sovi tutustumislento kerhomme lennonopettajan kanssa. Pääset
                kokemaan lentämisen tunteen ja voit kysyä lisää koulutuksesta.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Hanki ilmailulääkärin todistus
              </h3>
              <p className="text-swhite/80">
                Varaa aika ilmailulääkäriltä ja hanki tarvittava
                lääketieteellinen kelpoisuustodistus mieluiten jo ennen
                koulutuksen aloittamista.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              4
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Aloita koulutus
              </h3>
              <p className="text-swhite/80">
                Liity kerhon jäseneksi ja aloita lentokoulutus.
                Koulutusohjelmamme on joustava ja etenee omaan tahtiisi
                sopivalla nopeudella.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              4
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Suorita koulutus
              </h3>
              <p className="text-swhite/80">
                Suorita teoriaopinnot, lentotunnit ja teoriakokeet. Koulutus
                etenee progressiivisesti, ja lennonopettajasi tukee sinua koko
                matkan ajan.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              5
            </div>
            <div>
              <h3 className="text-xl font-bold text-swhite mb-2">
                Hanki lupakirja
              </h3>
              <p className="text-swhite/80">
                Suoritettuasi kaikki vaaditut osiot, voit hakea lupakirjaasi
                Traficomilta ja aloittaa lentämisen itsenäisesti!
              </p>
            </div>
          </div>
        </div>
      </ContentSection>

      {/* Flight Training Gallery */}
      <ContentSection variant="dark" backgroundImage="bg-efsa-one">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4 text-center">
            Lentokoulutus käytännössä
          </h2>
          <p className="text-lg text-swhite/80 text-center max-w-3xl mx-auto mb-12">
            Lentokoulutus koostuu Blue Skies Aviationin tarjoamista
            etäteoriaopinnoista ja käytännön lentokoulutuksesta Savonlinnan
            lentokentällä. Käytännön lentokoulutus sisältää erilaisia
            harjoituksia ja tehtäviä, jotka kehittävät lentotaitojasi ja
            valmistelevat sinut lupakirjakokeeseen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Training Image 1 */}
          <div className="relative overflow-hidden rounded-xl border-2 border-sbluel/30 hover:border-sred/50 transition-all duration-300 group">
            <div className="relative h-64 md:h-80">
              <Image
                src="/images/planning_1.jpg"
                alt="Teoriaopintojen yhdistäminen käytäntöön"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sblack/90 to-transparent p-4">
              <h3 className="text-swhite font-bold text-lg">
                Teoriaopintojen yhdistäminen käytäntöön
              </h3>
              <p className="text-swhite/80 text-sm">
                Opitaan yhdistämään teoriaopinnoissa opittuja tietoja käytännön
                lentotoimintaan
              </p>
            </div>
          </div>

          {/* Training Image 2 */}
          <div className="relative overflow-hidden rounded-xl border-2 border-sbluel/30 hover:border-sred/50 transition-all duration-300 group">
            <div className="relative h-64 md:h-80">
              <Image
                src="/images/planning_2.jpg"
                alt="Lennon suunnittelua"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sblack/90 to-transparent p-4">
              <h3 className="text-swhite font-bold text-lg">
                Lennon suunnittelua
              </h3>
              <p className="text-swhite/80 text-sm">
                Harjoitellaan lennonsuunnittelua ja valmistelua
              </p>
            </div>
          </div>

          {/* Training Image 3 */}
          <div className="relative overflow-hidden rounded-xl border-2 border-sbluel/30 hover:border-sred/50 transition-all duration-300 group">
            <div className="relative h-64 md:h-80">
              <Image
                src="/images/training_1.jpg"
                alt="Lentoharjoittelua"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sblack/90 to-transparent p-4">
              <h3 className="text-swhite font-bold text-lg">
                Lentoharjoittelua
              </h3>
              <p className="text-swhite/80 text-sm">
                Käytännön lentoharjoittelua lennonopettajan valvonnassa aluksi
                opettajan kanssa ja myöhemmin itsenäisesti
                yksinlentoharjoituksina
              </p>
            </div>
          </div>
        </div>
      </ContentSection>

      {/* Requirements Section */}
      <ContentSection variant="gradient" backgroundImage="bg-certificate-one">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-8 text-center">
            Edellytykset
          </h2>

          <TextBlock align="left">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-swhite mb-2">
                  Lääketieteellinen kelpoisuus
                </h3>
                <p className="text-swhite/80">
                  Tarvitset lääketieteellisen todistuksen (Medical Certificate).
                  Luokan 2 todistus riittää yksityislentäjälle ja LAPL luokka
                  kevyempiin ilma-aluksiin. Todistuksen myöntää
                  lentoterveyshuollossa toimiva lääkäri.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-swhite mb-2">Ikäraja</h3>
                <p className="text-swhite/80">
                  Koulutuksen voi aloittaa missä iässä tahansa, mutta lupakirjan
                  saaminen edellyttää vähimmäisikää (16-17 vuotta riippuen
                  lupakirjatyypistä). Yksinlentoon voi päästä jo 16 vuoden
                  iässä.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-swhite mb-2">
                  Sitoutuminen
                </h3>
                <p className="text-swhite/80">
                  Lentokoulutus vaatii sitoutumista ja säännöllistä
                  harjoittelua. Koulutuksen kesto riippuu omasta tahdista, mutta
                  keskimäärin PPL-koulutus kestää yli 12 kuukautta riippuen
                  omista ja lennonopettajan aikatauluista.
                </p>
              </div>
            </div>
          </TextBlock>
        </div>
      </ContentSection>

      {/* Call to Action */}
      <ContentSection variant="dark">
        <CallToAction
          title="Aloita lentoharrastus"
          description="Ota yhteyttä ja kysy lisää lentokoulutuksestamme. Autamme sinua pääsemään alkuun unelmiesi harrastuksessa!"
          primaryButton={{
            text: "Ota yhteyttä",
            href: "/yhteystiedot",
            variant: "primary",
          }}
          secondaryButton={{
            text: "Varaa tutustumislento",
            href: "/esittelylento",
            variant: "outline",
          }}
        />
      </ContentSection>
    </div>
  );
}
