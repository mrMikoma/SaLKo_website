import pricesData from "@/data/prices.json";
import Link from "next/link";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import CallToAction from "@/components/callToAction";

export const metadata = {
  title: "Jäsenyys | SaLKo",
  description: "Liity Savonlinnan Lentokerhon jäseneksi ja koe lentämisen ilo",
  keywords: [
    "Savonlinnan Lentokerho",
    "jäsenyys",
    "liittyminen",
    "lentokerho",
    "Savonlinna",
  ],
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Jäsenyys"
        breadcrumbs={["Kerho", "Jäsenyys"]}
        compact={false}
        backgroundImage="bg-efsa-one"
      >
        {/* Introduction Section - Inside the hero */}
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-4xl mx-auto">
            {/* Main intro */}
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-swhite mb-6">
                Kiinnostaako ilmailu ja lentäminen?
              </h2>
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed">
                Ensimmäinen askel kohti lentämisen maailmaa on liittyä
                lentokerhon jäseneksi!
              </p>
            </div>
            {/* Benefits */}
            <div className="bg-sblued/50 rounded-lg p-4 md:p-6 border border-sred/20">
              <h2 className="text-xl md:text-2xl font-bold text-sred mb-4">
                Jäsenyden edut
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Kaluston käyttö
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Kaluston käyttöoikeus jäsenhinnoin
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Kerhotilat
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Pääsy kerhotiloihin, jossa tilat lennon suunnitteluun ja
                      valmisteluun
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Lentokoulutus
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Hyvät puitteet ja lennonopettajat lentokoulutukselle ja
                      taitojen kehittämiselle
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Hallipaikat
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Mahdollisuus vuokrata hallipaikka omalle koneelle tai
                      muulle kulkupelille
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Viranomaistyö
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Pääset mukaan viranomaisyhteistyöhön palolentojen ja
                      SAR-toiminnan parissa
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                  <div>
                    <h3 className="text-swhite font-semibold text-md mb-1">
                      Ilmailuyhteisö
                    </h3>
                    <p className="text-swhite/70 text-sm">
                      Savonlinnan oma ilmailuyhteisö, jossa voit tavata muita
                      ilmailun harrastajia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageHero>

      <ContentSection variant="dark" backgroundImage="bg-savonlinna-one">
        <div className="space-y-12">
          {/* Membership Types */}
          <div className="glass rounded-lg p-4 md:p-6 border border-sred/20 flex flex-col items-center">
            <h2 className="text-xl md:text-2xl font-bold text-sred mb-4 w-full">
              Jäsenyydet
            </h2>
            <div className="overflow-x-auto w-full max-w-3xl">
              <table className="w-full text-md">
                <thead>
                  <tr className="border-b border-sbluel/30">
                    <th className="text-left py-2 px-1 text-sbluel font-semibold">
                      Jäsentyyppi
                    </th>
                    <th className="text-right py-2 px-1 text-sbluel font-semibold">
                      Jäsenmaksu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricesData.membershipFees.map((fee, index) => (
                    <tr
                      key={index}
                      className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                    >
                      <td className="py-2 px-1 text-swhite">
                        <div className="font-medium">{fee.type}</div>
                        <div className="text-sm text-swhite/60">
                          {fee.description}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-right text-swhite font-semibold whitespace-nowrap">
                        {fee.price} {fee.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* How to Join */}
          <div className="glass rounded-lg p-4 md:p-6 border border-sred/20">
            <h2 className="text-xl md:text-2xl font-bold text-sred mb-4">
              Kuinka liityn jäseneksi?
            </h2>
            <div className="space-y-4 text-swhite/80">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1">
                    Ota yhteyttä
                  </h3>
                  <p className="text-md">
                    Ota yhteyttä kerhon hallitukseen sähköpostitse, puhelimitse
                    tai sovi tutustuminen lentokentälle ja ilmaise
                    kiinnostuksesi liittyä jäseneksi. Yhteystiedot löydät{" "}
                    <Link
                      href="/yhteystiedot"
                      className="text-sbluel hover:text-sbluel/80 underline transition-colors"
                    >
                      yhteystiedot-sivulta
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  2
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1">
                    Täytä jäsenhakemus
                  </h3>
                  <p className="text-md">
                    Täytä jäsenhakemus ja toimita se kerhon hallitukselle. Voit
                    tiedustella hakemusta ottamalla yhteyttä hallitukseen.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  3
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1">
                    Maksa jäsenmaksu
                  </h3>
                  <p className="text-md">
                    Kun hakemuksesi on hyväksytty, maksa vuosittainen jäsenmaksu
                    suoraan kerholle tai Suomen Ilmailuliiton kautta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <CallToAction
            title="Kiinnostuitko?"
            description="Ota yhteyttä, niin kerromme lisää jäsenyydestä ja kerhon toiminnasta!"
            primaryButton={{
              text: "Yhteystiedot",
              href: "/yhteystiedot",
            }}
          />
        </div>
      </ContentSection>
    </div>
  );
}
