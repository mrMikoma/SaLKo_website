import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import CallToAction from "@/components/callToAction";
import Link from "next/link";

export const metadata = {
  title: "Esittelylennot | SaLKo",
  description: "Koe lentämisen ilo Savonlinnan Lentokerhon esittelylennoilla",
  keywords: [
    "Savonlinnan Lentokerho",
    "esittelylennot",
    "tutustumislennot",
    "lentokokemus",
    "lentokerho",
    "Savonlinna",
    "lentäminen",
  ],
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Esittelylennot"
        breadcrumbs={["Esittelylennot"]}
        compact={false}
        backgroundImage="bg-punkaharju-one"
      >
        {/* Introduction Section - Inside the hero */}
        <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
          <div className="max-w-4xl mx-auto">
            {/* Main intro */}
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-swhite mb-6">
                Koe lentämisen ilo ja tutustu ilmailun maailmaan!
              </h2>
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed mb-6">
                Haaveiletko sinä lentämisestä? Esittelylento on loistava tapa
                tutustua ilmailun maailmaan ja kokea lentämisen ilo Savonlinnan
                lentokentältä käsin.
              </p>
              <p className="text-lg md:text-xl text-swhite/90 max-w-3xl mx-auto leading-relaxed">
                Esittelylennoillamme pääset kokemaan Savonlinnan upean maiseman
                linnunperspektiivistä ja saat ainutlaatuisen elämyksen!
              </p>
            </div>
          </div>
        </div>
      </PageHero>

      <ContentSection variant="dark" backgroundImage="bg-efsa-one">
        <div className="space-y-12">
          {/* Types of Flights */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
              Lentotyypit
            </h2>
            <p className="text-swhite/80 mb-6">
              Tarjoamme kolmenlaisia esittelylentoja erilaisiin tarpeisiin:
            </p>
            <div className="space-y-6">
              <div className="border-l-4 border-sbluel pl-4">
                <h3 className="text-swhite font-bold text-xl mb-2">
                  1. Esittelylennot esittelylentopäivinä
                </h3>
                <p className="text-swhite/70 mb-2">
                  Ei-kaupallisia esittelylentoja, jotka järjestetään
                  ennaltamääritettyinä esittelylentopäivinä. Nämä lennot ovat
                  avoimia kaikille kiinnostuneille ja tarjoavat hyvän
                  mahdollisuuden tutustua lentämiseen edullisin hinnoin.
                  Lennoista ilmoitetaan kerhon sivuilla.
                </p>
                <p className="text-sbluel font-semibold">
                  Hinta: 80 € / 20 min
                </p>
              </div>

              <div className="border-l-4 border-sbluel pl-4">
                <h3 className="text-swhite font-bold text-xl mb-2">
                  2. Lentokoulutusta esittelevät yksityiset koululennot
                </h3>
                <p className="text-swhite/70 mb-2">
                  Yksityiset esittelykoululennot, joiden tarkoitus on esitellä
                  lentokoulutusta ja sen mahdollisuuksia. Sopii erinomaisesti
                  niille, jotka harkitsevat lentokoulutukseen hakeutumista ja
                  haluavat tutustua konkreettisesti lentämiseen ja
                  koulutusprosessiin. Sovittava erikseen lennonopettajan kanssa.
                </p>
                <Link className="text-sred font-semibold" href="/yhteystiedot">
                  Ota yhteyttä lennonopettajaan
                </Link>
              </div>

              <div className="border-l-4 border-sbluel pl-4">
                <h3 className="text-swhite font-bold text-xl mb-2">
                  3. Kulujenjakoperiaatteella toimivat ei-kaupalliset lennot
                  (esim. polttarilennot)
                </h3>
                <p className="text-swhite/70 mb-2">
                  Yksittäisen lentäjän kanssa sovittavat ei-kaupalliset lennot,
                  jotka noudattavat kulujenjakoperiaatetta. Näissä lennoissa
                  lentäjä jakaa lennon kustannukset kyydissä olevien
                  matkustajien kanssa. Sovittava erikseen lentäjän kanssa.
                  Tiedustella voi ottamalla yhteyttä kerhon hallitukseen.
                </p>
                <Link className="text-sred font-semibold" href="/yhteystiedot">
                  Ota yhteyttä hallitukseen
                </Link>
              </div>
            </div>
          </div>

          {/* What to Expect */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
              Mitä esittelylento sisältää?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <span className="text-sbluel text-2xl flex-shrink-0">✈</span>
                <div>
                  <h3 className="text-swhite font-semibold text-lg mb-2">
                    Tutustuminen lentokoneeseen
                  </h3>
                  <p className="text-swhite/70">
                    Käymme läpi lentokoneen perusasiat ja turvallisuusohjeet
                    ennen lennon alkua.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-sbluel text-2xl flex-shrink-0">✈</span>
                <div>
                  <h3 className="text-swhite font-semibold text-lg mb-2">
                    Upeat maisemat
                  </h3>
                  <p className="text-swhite/70">
                    Nauti Savonlinnan ja Saimaan upeista maisemista ilmasta
                    käsin!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-sbluel text-2xl flex-shrink-0">✈</span>
                <div>
                  <h3 className="text-swhite font-semibold text-lg mb-2">
                    Lentäjä
                  </h3>
                  <p className="text-swhite/70">
                    Lento tapahtuu kokeneen lentokerholaisen tai lennonopettajan
                    ohjaamana, joka huolehtii turvallisesta lennosta ja opastaa
                    sinua lennon aikana.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-sbluel text-2xl flex-shrink-0">✈</span>
                <div>
                  <h3 className="text-swhite font-semibold text-lg mb-2">
                    Mahdollisuus ohjata
                  </h3>
                  <p className="text-swhite/70">
                    Yksityisellä lentokoulutuksen esittelylennolla pääset
                    kokeilemaan lentokoneen ohjaamista lennonopettajan
                    opastuksella.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Practical Information */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
              Käytännön tietoa
            </h2>
            <div className="space-y-4 text-swhite/80">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1 text-lg">
                    Varaa lento etukäteen
                  </h3>
                  <p className="text-base">
                    Ota yhteyttä sopivaan yhteyshenkilln sähköpostitse tai
                    puhelimitse ja varaa sopiva ajankohta. Lennot toteutetaan
                    aikataulujen ja sääolosuhteiden salliessa.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  2
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1 text-lg">
                    Varusteet
                  </h3>
                  <p className="text-base">
                    Ei erityisiä varusteita tarvita. Pukeudu mukaviin
                    vaatteisiin ja säähän sopivasti. Aurinkoisella säällä
                    aurinkolasit ovat suositeltavat.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  3
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1 text-lg">
                    Saavu ajoissa
                  </h3>
                  <p className="text-base">
                    Saavu Savonlinnan lentoasemalle sovitussa ajassa. Osoite:
                    Lentoasemantie 50, 57310 Savonlinna.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-sbluel/20 rounded-full flex items-center justify-center text-sbluel font-bold">
                  4
                </span>
                <div>
                  <h3 className="text-swhite font-semibold mb-1 text-lg">
                    Säävaraus
                  </h3>
                  <p className="text-base">
                    Lennot ovat aina sääriippuvaisia. Mikäli sääolosuhteet eivät
                    salli turvallista lentämistä, lennon ajankohta siirretään
                    sopivampaan ajankohtaan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
              Usein kysytyt kysymykset
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-swhite font-semibold text-lg mb-2">
                  Tarvitseeko minulla olla aikaisempaa lentokokemusta?
                </h3>
                <p className="text-swhite/70">
                  Ei tarvitse! Esittelylennot on suunniteltu nimenomaan
                  ensikertalaisille. Kokenut lennonopettaja huolehtii kaikesta
                  ja opastaa sinua lennon aikana.
                </p>
              </div>
              <div>
                <h3 className="text-swhite font-semibold text-lg mb-2">
                  Kuinka monta henkilöä voi osallistua samalle lennolle?
                </h3>
                <p className="text-swhite/70">
                  Cessna 172 -koneessa on tilaa 2-3 matkustajalle lentäjän
                  lisäksi. Ryhmät voivat varata useampia lentoja peräkkäin,
                  jotta kaikki pääsevät taivaalle.
                </p>
              </div>
              <div>
                <h3 className="text-swhite font-semibold text-lg mb-2">
                  Voinko ottaa kuvia lennon aikana?
                </h3>
                <p className="text-swhite/70">
                  Kyllä! Lennon aikana voit ottaa kuvia ja videoita. Muistathan
                  kuitenkin noudattaa lentäjän ohjeita ja varmistaa, että
                  kuvaaminen ei häiritse lentoa tai turvallisuutta.
                </p>
              </div>
              <div>
                <h3 className="text-swhite font-semibold text-lg mb-2">
                  Onko esittelylento sopiva lahjaksi?
                </h3>
                <p className="text-swhite/70">
                  Ehdottomasti! Esittelylento on ainutlaatuinen lahja, joka
                  sopii erinomaisesti syntymäpäivälahjaksi, joululahjaksi tai
                  muuhun juhlaan. Ota yhteyttä, niin autamme lahjakortin
                  järjestämisessä.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="glass rounded-lg p-6 md:p-8 border border-sbluel/20">
            <h2 className="text-2xl md:text-3xl font-bold text-sbluel mb-6">
              Huomioitavaa
            </h2>
            <div className="space-y-4 text-swhite/80">
              <p className="text-base leading-relaxed">
                Esittelylennot eivät ole kaupallista toimintaa, vaikka niistä
                peritään korvausta. Esittelylento tapahtuu ei-kaupallisen
                lentotoiminnan vaatimusten mukaisesti. Lento ei täytä
                kaupallisen lentotoiminnan turvallisuus- ja vakuutusvaatimuksia.
              </p>
              <p className="text-base leading-relaxed">
                Lisätietoa viranomaisvaatimuksista osoitteessa:{" "}
                <a
                  href="https://www.traficom.fi/fi/liikenne/ilmailu/ei-kaupallinen-lentotoiminta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sbluel hover:text-sbluel/80 underline transition-colors break-all"
                >
                  Traficomin verkkosivut - Ei-kaupallinen lentotoiminta
                </a>
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <CallToAction
            title="Valmiina lentämään?"
            description="Ota yhteyttä ja varaa oma esittelylentosi jo tänään!"
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
