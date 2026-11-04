export const dynamic = "force-dynamic";

import Link from "next/link";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import { pageMetadata } from "@/utilities/seo";
import { getPriceList } from "@/utilities/priceList";
import {
  AircraftPrice,
  finnishDate,
  formatEuros,
  formatPrice,
  itemsIn,
  minutePrice,
} from "@/utilities/priceFormat";

// The free hour as the price list has always put it
function freeHourNote(aircraft: AircraftPrice): string | null {
  if (!aircraft.freeHour) return null;
  const paid = aircraft.freeHour.paidMinutes / 60;
  const free = aircraft.freeHour.freeMinutes / 60;
  return `Aktiivilentäjien hyvitys: jokaisen ${String(paid).replace(".", ",")} maksetun lentotunnin jälkeen ${
    free === 1 ? "yksi ilmainen lentotunti" : `${String(free).replace(".", ",")} ilmaista lentotuntia`
  } (sama lentokausi)`;
}

export const metadata = pageMetadata({
  title: "Hinnasto – lentotunnit ja jäsenmaksut",
  description:
    "Savonlinnan Lentokerhon hinnasto: jäsenmaksut, kalustomaksu ja kerhon lentokoneiden tunti- ja minuuttihinnat.",
  path: "/kerho/hinnasto",
});

export default async function Page() {
  const prices = await getPriceList();
  const equipmentFee = itemsIn(prices, "equipment")[0];
  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Hinnasto"
        breadcrumbs={["Kerho", "Hinnasto"]}
        compact={true}
        backgroundImage="savonlinna"
      >
        {/* Date info - Inside the hero */}
        <div className="max-w-[1600px] mx-auto px-6 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              {prices.validFrom && (
                <p className="text-xl md:text-2xl text-swhite/90 leading-relaxed">
                  Voimassa {finnishDate(prices.validFrom)} alkaen
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Jäsenmaksut */}
        <div className="bg-sblued/50 max-w-3xl mx-auto rounded-lg p-8 my-12 border border-sred/20 overflow-hidden">
          <h2 className="text-3xl font-bold text-sred mb-6">Jäsenmaksut</h2>
          <div className="overflow-x-auto">
            <table className="w-full ">
              <thead>
                <tr className="border-b border-sbluel/30">
                  <th className="text-left py-4 px-4 text-sbluel font-semibold">
                    Jäsentyyppi
                  </th>
                  <th className="text-left py-4 px-4 text-sbluel font-semibold">
                    Kuvaus
                  </th>
                  <th className="text-right py-4 px-4 text-sbluel font-semibold">
                    Hinta
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsIn(prices, "membership").map((fee) => (
                  <tr
                    key={fee.id}
                    className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                  >
                    <td className="py-4 px-4 text-swhite font-medium">
                      {fee.name}
                    </td>
                    <td className="py-4 px-4 text-swhite/70">
                      {fee.description}
                    </td>
                    <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                      {formatPrice(fee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageHero>

      <ContentSection variant="dark" backgroundImage="efsa">
        <div className="space-y-12">
          {/* Kalusto */}
          <div className="glass rounded-lg p-8 border border-sred/20 overflow-hidden">
            <h2 className="text-3xl font-bold text-sred mb-6">Kalusto</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sbluel/30">
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Tunnus
                    </th>
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Malli
                    </th>
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Huomiot
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      €/min
                      <br />
                      <span className="text-xs font-normal text-swhite/60">
                        (kalustomaksu maksettuna)
                      </span>
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      €/h
                      <br />
                      <span className="text-xs font-normal text-swhite/60">
                        (kalustomaksu maksettuna)
                      </span>
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      €/min
                      <br />
                      <span className="text-xs font-normal text-swhite/60">
                        (vierailevat lentäjät)
                      </span>
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      €/h
                      <br />
                      <span className="text-xs font-normal text-swhite/60">
                        (vierailevat lentäjät)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentFee && (
                    <tr className="border-b border-sbluel/20 bg-sbluel/10">
                      <td colSpan={3} className="py-4 px-4 text-swhite font-semibold">
                        {equipmentFee.name}
                        <div className="text-sm font-normal text-swhite/70 mt-1">
                          {equipmentFee.description}
                        </div>
                      </td>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-right text-swhite font-bold whitespace-nowrap"
                      >
                        {formatPrice(equipmentFee)}
                      </td>
                    </tr>
                  )}
                  {prices.aircraft.map((aircraft) => (
                    <tr
                      key={aircraft.registration}
                      className="border-b border-swhite/10 transition-colors hover:bg-sblack/30"
                    >
                      <td className="py-4 px-4 text-swhite font-medium whitespace-nowrap">
                        {aircraft.registration}
                      </td>
                      <td className="py-4 px-4 text-swhite">
                        {aircraft.model ?? "–"}
                      </td>
                      <td className="py-4 px-4 text-swhite/60 text-sm">
                        {freeHourNote(aircraft) ?? "-"}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                        {minutePrice(aircraft.centsPerHourWithFee)}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                        {formatEuros(aircraft.centsPerHourWithFee)}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite/70 font-semibold whitespace-nowrap">
                        {minutePrice(aircraft.centsPerHourWithoutFee)}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite/70 font-semibold whitespace-nowrap">
                        {formatEuros(aircraft.centsPerHourWithoutFee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Esittelylennot */}
          <div className="glass rounded-lg p-8 border border-sred/20 overflow-hidden">
            <h2 className="text-3xl font-bold text-sred mb-6">
              Esittelylennot
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sbluel/30">
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Tyyppi
                    </th>
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Kuvaus
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      Hinta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsIn(prices, "demo").map((flight) => (
                    <tr
                      key={flight.id}
                      className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                    >
                      <td className="py-4 px-4 text-swhite font-medium">
                        {flight.name}
                      </td>
                      <td className="py-4 px-4 text-swhite/70">
                        {flight.description}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                        {formatPrice(flight)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hallipaikkojen hinnat */}
          <div className="glass rounded-lg p-8 border border-sred/20 overflow-hidden">
            <h2 className="text-3xl font-bold text-sred mb-6">Hallipaikat</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sbluel/30">
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Tyyppi
                    </th>
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Kuvaus
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      Hinta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsIn(prices, "hangar").map((space) => (
                    <tr
                      key={space.id}
                      className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                    >
                      <td className="py-4 px-4 text-swhite font-medium">
                        {space.name}
                      </td>
                      <td className="py-4 px-4 text-swhite/70">
                        {space.description}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                        {formatPrice(space)}
                        {space.note && (
                          <div className="text-sm font-normal text-swhite/60 mt-0.5">
                            {space.note}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Muut maksut */}
          <div className="glass rounded-lg p-8 border border-sred/20 overflow-hidden">
            <h2 className="text-3xl font-bold text-sred mb-6">Muut maksut</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sbluel/30">
                    <th className="text-left py-4 px-4 text-sbluel font-semibold">
                      Tuote
                    </th>
                    <th className="text-right py-4 px-4 text-sbluel font-semibold">
                      Hinta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsIn(prices, "other").map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                    >
                      <td className="py-4 px-4 text-swhite font-medium">
                        {fee.name}
                        {fee.description && (
                          <div className="text-sm font-normal text-swhite/70">{fee.description}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                        {formatPrice(fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="glass rounded-lg p-8 border border-sbluel/20">
            <h2 className="text-2xl font-bold text-sbluel mb-6">Huomiot</h2>
            <div className="space-y-4">
              {itemsIn(prices, "note").map((note, index) => (
                <div
                  key={note.id}
                  className="text-swhite/80 leading-relaxed"
                >
                  <span className="font-semibold text-sbluel">
                    {index + 1}*{" "}
                  </span>
                  <span className="whitespace-pre-line">{note.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="glass rounded-lg p-8 border border-sbluel/20 text-center">
            <p className="text-swhite/80 text-lg">
              Lisätietoja hinnoista saat ottamalla yhteyttä{" "}
              <Link
                href="/yhteystiedot"
                className="text-sbluel hover:text-sbluel/80 underline transition-colors"
              >
                kerhon hallitukseen
              </Link>
              .
            </p>
          </div>
        </div>
      </ContentSection>
    </div>
  );
}
