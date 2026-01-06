import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import SolidCard from "@/components/solidCard";
import TextBlock from "@/components/textBlock";
import CallToAction from "@/components/callToAction";
import PlaneIcon from "@/components/icons/plane";
import Image from "next/image";
import Link from "next/link";
import pricesData from "@/data/prices.json";

export const metadata = {
  title: "Koulutus / SaLKo",
  description: "Lentokoulutus Savonlinnan Lentokerholla",
};

const getPrice = (courseCode: string): string => {
  const price =
    pricesData.trainingPrices[
      courseCode as keyof typeof pricesData.trainingPrices
    ];
  return price === "TBA" ? "Kysy tarjousta" : `alkaen ${price} €`;
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
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed mb-6">
                Tarjoamme monipuolista moottorilentokoulutusta Savonlinnan
                lentokentällä. Koulutus räätälöidään henkilökohtaisten
                tavoitteidesi mukaan yhteistyössä lennonopettajien kanssa.
              </p>
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed">
                Lisäksi kerhomme ylläpitämä DTO-koulutusyhteisö mahdollistaa
                lento-opinnot Kiteellä, Joroisissa, Rantasalmella,
                Lappeenrannassa ja Kymissä.
              </p>
            </div>
          </div>
        </div>
      </PageHero>

      {/* Main Training Programs Section */}
      <ContentSection variant="dark" backgroundImage="bg-savonlinna-one">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4 text-center">
            Koulutusohjelmat Savonlinnassa
          </h2>
          <p className="text-lg text-swhite/80 text-center max-w-3xl mx-auto mb-12">
            Annamme lentokoulutusta lupakirjojen ja lisäkelpuutusten
            hankkimiseen Savonlinnan lentokentällä.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* LAPL - Light Aircraft Pilot License */}
          <SolidCard
            title="LAPL(A)"
            description="Kevyiden ilma-alusten lentäjän lupakirja"
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <p className="text-swhite/90 mb-3">
                Suunniteltu harrasteilmailuun Euroopassa
              </p>
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
                <span>
                  Oikeus lentää yleisimmillä alle 2000 kg
                  yksimoottorilentokoneilla
                </span>
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
                <span>Blueskies ePPL-etäteoriakurssi</span>
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
                <span>Ikäraja: 17 vuotta</span>
              </div>
              <div className="mt-4 pt-4 border-t border-swhite/20">
                <p className="text-sred font-bold text-lg">
                  Hinta {getPrice("LAPL")}
                </p>
              </div>
            </div>
          </SolidCard>

          {/* PPL - Private Pilot License */}
          <SolidCard
            title="PPL(A)"
            description="Yksityislentäjän lupakirja"
            icon={<PlaneIcon size={48} />}
            variant="highlighted"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <p className="text-swhite/90 mb-3">
                Voit lentää yksin tai matkustajien kanssa harrastemielessä
              </p>
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
                <span>
                  Voi olla ensimmäinen askel kohti ammatti-ilmailua, laajemmat
                  mahdollisuudet vrt. LAPL lupakirjaan
                </span>
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
                <span>Blueskies ePPL-etäteoriakurssi</span>
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
                <span>Ikäraja: 17 vuotta</span>
              </div>
              <div className="mt-4 pt-4 border-t border-swhite/20">
                <p className="text-sred font-bold text-lg">
                  Hinta {getPrice("PPL")}
                </p>
              </div>
            </div>
          </SolidCard>

          {/* TMG - Touring Motor Glider */}
          <SolidCard
            title="TMG"
            description="TMG luokkakelpuutus"
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <p className="text-swhite/90 mb-3">
                Mahdollistaa lentämisen moottoripurjelentokoneella vähintään
                LAPL-lupakirjan laajennuksena
              </p>
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
                <span>Yhdistää purjelennon ja moottorilentämisen edut</span>
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
                <span>
                  Edullista moottorilentokokemusta mielenkiintoisella RF-5
                  moottoripurjelentokoneella
                </span>
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
                <span>Sisältää oikeuden lentää kannuspyöräkoneilla</span>
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
                <span>Teoriakoulutus 4 tuntia</span>
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
                <span>Vähintään 3 lentotuntia</span>
              </div>
              <div className="mt-4 pt-4 border-t border-swhite/20">
                <p className="text-sred font-bold text-lg">
                  Hinta {getPrice("TMG")}
                </p>
              </div>
            </div>
          </SolidCard>

          {/* NF - Night Flight Rating */}
          <SolidCard
            title="NF(A)"
            description="Yölentokelpuutus"
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <p className="text-swhite/90 mb-3">
                Mahdollistaa lentämisen yöolosuhteissa vähintään LAPL-lupakirjan
                laajennuksena
              </p>
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
                <span>NF-etäteoriakurssi</span>
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
                <span>Vähintään 5 lentotuntia</span>
              </div>
              <div className="mt-4 pt-4 border-t border-swhite/20">
                <p className="text-sred font-bold text-lg">
                  Hinta {getPrice("NF")}
                </p>
              </div>
            </div>
          </SolidCard>

          {/* TOW - Towing Rating */}
          <SolidCard
            title="TOW"
            description="Hinauslentokelpuutus"
            icon={<PlaneIcon size={48} />}
            variant="default"
          >
            <div className="mt-4 space-y-2 text-swhite/80 text-sm">
              <p className="text-swhite/90 mb-3">
                Mahdollistaa purjelentokeneiden hinaamisen moottorikoneella
                vähintään LAPL-lupakirjan laajennuksena
              </p>
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
                <span>Teoriakoulutus 5 tuntia</span>
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
                <span>Hinauslentokoulutus vähintään 10 hinausta</span>
              </div>
              <div className="mt-4 pt-4 border-t border-swhite/20">
                <p className="text-sred font-bold text-lg">
                  Hinta {getPrice("TOW")}
                </p>
              </div>
            </div>
          </SolidCard>
        </div>
      </ContentSection>

      {/* Partnership Section */}
      <ContentSection variant="dark" backgroundImage="bg-mopu-one">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4 text-center">
            Yhteistyössä Varkauden lentokerhon kanssa
          </h2>
          <p className="text-lg text-swhite/80 text-center max-w-3xl mx-auto mb-12">
            Lisäksi tarjoamme purjelento- ja ultrakevyt-koulutusta yhteistyössä
            Varkauden lentokerhon kanssa Joroisissa.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SPL - Sailplane License */}
            <div className="bg-sblack/50 rounded-lg p-6 border border-sbluel/20 flex flex-col">
              <h4 className="text-xl font-bold text-sred mb-3">
                SPL - Purjelentäjän lupakirja
              </h4>
              <p className="text-swhite/90 mb-4">
                Voit lentää yksin tai matkustajan kanssa ympäristöystävällisesti
                auringon energialla
              </p>
              <ul className="space-y-2 text-sm text-swhite/80 flex-grow mb-4">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Teoriakoulutus 44 tuntia, mahdollisuus etäosallistumiseen
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Vähintään 15 lentotuntia ja 45 lentoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Lentokoulutus Joroisten lentokentällä</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Lentokoulutuksen voit aloittaa samana vuonna kun täytät 15,
                    lupakirjan saat täytettyäsi 16
                  </span>
                </li>
              </ul>
              <div className="mt-auto pt-4 border-t border-swhite/20">
                <p className="text-sbluel font-bold text-lg mb-3">
                  Hinta {getPrice("SPL")}
                </p>
                <Link
                  href="https://www.varkaudenlentokerho.fi/purjelentokurssi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sred/80 hover:text-sred font-semibold group hover:translate-x-2 transition-all duration-300"
                >
                  <span>Lue lisää</span>
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            {/* UPL - Ultralight Pilot License */}
            <div className="bg-sblack/50 rounded-lg p-6 border border-sbluel/20 flex flex-col">
              <h4 className="text-xl font-bold text-sred mb-3">
                UPL - Ultrakevyt lentäjän lupakirja
              </h4>
              <p className="text-swhite/90 mb-4">
                Mahdollistaa lentämisen yksin tai matkustajan kanssa
                ultrakevyellä moottorilentokoneella
              </p>
              <ul className="space-y-2 text-sm text-swhite/80 flex-grow mb-4">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Teoriakoulutus 48 tuntia, mahdollisuus etäosallistumiseen
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Vähintään 25 lentotuntia</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Lentokoulutus Joroisten lentokentällä</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-sred flex-shrink-0 mt-0.5"
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
                </li>
              </ul>
              <div className="mt-auto pt-4 border-t border-swhite/20">
                <p className="text-sbluel font-bold text-lg mb-3">
                  Hinta {getPrice("UPL")}
                </p>
                <Link
                  href="https://www.varkaudenlentokerho.fi/copy-of-purjelennon-peruskurssi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sred/80 hover:text-sred font-semibold group hover:translate-x-2 transition-all duration-300"
                >
                  <span>Lue lisää</span>
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
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

          {/* Step 5 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              5
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

          {/* Step 6 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-sred rounded-full flex items-center justify-center text-swhite font-bold text-xl">
              6
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
            href: "/esittelylennot",
            variant: "outline",
          }}
        />
      </ContentSection>
    </div>
  );
}
