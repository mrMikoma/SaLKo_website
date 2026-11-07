export const dynamic = "force-dynamic";

import ErrorPanel from "@/components/errors/ErrorPanel";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { getAircraftRates, getPriceList } from "@/utilities/priceList";
import { itemsIn, PRICE_SECTIONS } from "@/utilities/priceFormat";
import AircraftRates from "@/components/prices/AircraftRates";
import { PriceSectionEditor, ValidFromForm } from "@/components/prices/PriceListEditor";

export const metadata = {
  title: "Hinnasto | Ylläpito",
};

// Where each section shows, besides /kerho/hinnasto
const SHOWN_ON: Partial<Record<string, string>> = {
  membership: "Myös Jäsenyys-sivulla ja laskujen valmiina riveinä.",
  equipment: "Myös laskujen valmiina rivinä. Kalustomaksun maksaneet merkitään laskutuksen asetuksiin.",
  hangar: "Myös Hallit-sivulla ja laskujen valmiina riveinä.",
  demo: "Myös laskujen valmiina riveinä.",
  other: "Myös laskujen valmiina riveinä.",
  training: "Koulutus-sivun hinnat, \"alkaen\". Ilman hintaa sivulla lukee \"Kysy tarjousta\".",
  note: "Numeroidut huomiot hinnaston lopussa.",
};

export default async function PriceListPage() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_PRICES")) {
    redirect("/");
  }
  const [list, rates] = await Promise.all([getPriceList({ includeHidden: true }), getAircraftRates()]);

  const card = "bg-white rounded-lg shadow p-6 space-y-4 text-gray-900";
  // Without the list, editing it would look like filling in an empty price list
  if (list.unavailable) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Hinnasto</h1>
        <div className="max-w-3xl">
          <ErrorPanel tone="light" title="Hinnastoa ei saatu luettua">
            <p>Tietokantaan ei juuri nyt saada yhteyttä, joten hintoja ei voi muokata. Yritä hetken kuluttua uudelleen.</p>
          </ErrorPanel>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hinnasto</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Kerhon kaikki hinnat yhdessä paikassa. Muutokset näkyvät heti{" "}
          <Link href="/kerho/hinnasto" className="text-sblue hover:underline">
            Hinnasto-sivulla
          </Link>
          , ja jäsenmaksut, hallipaikat ja koulutusten hinnat myös niiden omilla sivuilla. Lennot
          laskutetaan koneen tuntihinnalla, ja muiden hintojen rivit ovat valmiina laskuilla.
        </p>
      </div>

      <section className={card} aria-labelledby="price-list-date">
        <h2 id="price-list-date" className="text-xl font-semibold">
          Voimassaolo
        </h2>
        <p className="text-sm text-gray-600">Hinnasto-sivulla lukee &quot;Voimassa … alkaen&quot;.</p>
        <ValidFromForm validFrom={list.validFrom} />
      </section>

      <section className={card} aria-labelledby="price-list-aircraft">
        <h2 id="price-list-aircraft" className="text-xl font-semibold">
          Koneiden tuntihinnat
        </h2>
        <p className="text-sm text-gray-600">
          Lennot laskutetaan minuuteittain lennon päivänä voimassa olleella tuntihinnalla; Hinnasto-sivu
          näyttää tämän päivän hinnan. Koululennot laskutetaan alemmalla hinnalla, koska oppilaat on
          vapautettu kalustomaksusta tarkastuslentoon asti. Yksittäinen paikallislento laskutetaan
          vähintään minimin mittaisena; saman lentäjän peräkkäisille lennoille ja matkalennoille minimiä ei ole.
        </p>
        <AircraftRates aircraft={rates.aircraft} rates={rates.rates} />
      </section>

      {PRICE_SECTIONS.map(({ key, label }) => (
        <section key={key} className={card} aria-labelledby={`price-list-${key}`}>
          <h2 id={`price-list-${key}`} className="text-xl font-semibold">
            {label}
          </h2>
          {SHOWN_ON[key] && <p className="text-sm text-gray-600">{SHOWN_ON[key]}</p>}
          <PriceSectionEditor section={key} items={itemsIn(list, key)} />
        </section>
      ))}
    </div>
  );
}
