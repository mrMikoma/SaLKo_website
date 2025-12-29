import pricesData from "@/data/prices.json";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16">
          <div className="text-center space-y-6 animate-fade-in mb-12">
            <span className="text-sbluel text-sm md:text-base font-semibold tracking-wider uppercase">
              Savonlinnan lentokerho ry
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-swhite">
              Hinnasto
            </h1>
            <p className="text-xl text-swhite">
              Voimassa {pricesData.date} alkaen
            </p>
          </div>

          <div className="space-y-12">
            {/* Jäsenmaksut */}
            <div className="glass rounded-lg p-8 border border-sred/20 overflow-hidden">
              <h2 className="text-3xl font-bold text-sred mb-6">Jäsenmaksut</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
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
                    {pricesData.membershipFees.map((fee, index) => (
                      <tr
                        key={index}
                        className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                      >
                        <td className="py-4 px-4 text-swhite font-medium">
                          {fee.type}
                        </td>
                        <td className="py-4 px-4 text-swhite/70">
                          {fee.description}
                        </td>
                        <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                          {fee.price} {fee.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
                        Tyyppi
                      </th>
                      <th className="text-left py-4 px-4 text-sbluel font-semibold">
                        Huomiot
                      </th>
                      <th className="text-right py-4 px-4 text-sbluel font-semibold">
                        €/min
                        <br />
                        <span className="text-xs font-normal text-swhite/60">
                          (kalustomaksu)
                        </span>
                      </th>
                      <th className="text-right py-4 px-4 text-sbluel font-semibold">
                        €/h
                        <br />
                        <span className="text-xs font-normal text-swhite/60">
                          (kalustomaksu)
                        </span>
                      </th>
                      <th className="text-right py-4 px-4 text-sbluel font-semibold">
                        €/min
                        <br />
                        <span className="text-xs font-normal text-swhite/60">
                          (ilman)
                        </span>
                      </th>
                      <th className="text-right py-4 px-4 text-sbluel font-semibold">
                        €/h
                        <br />
                        <span className="text-xs font-normal text-swhite/60">
                          (ilman)
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricesData.aircraftRentalRates.map((aircraft, index) => {
                      if (aircraft.isEquipmentFee) {
                        return (
                          <tr
                            key={index}
                            className="border-b border-sbluel/20 bg-sbluel/10"
                          >
                            <td
                              colSpan={4}
                              className="py-4 px-4 text-swhite font-semibold"
                            >
                              {aircraft.category}
                              <div className="text-sm font-normal text-swhite/70 mt-1">
                                {aircraft.description}
                              </div>
                            </td>
                            <td
                              colSpan={4}
                              className="py-4 px-4 text-right text-swhite font-bold whitespace-nowrap"
                            >
                              {aircraft.price} {aircraft.unit}
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr
                          key={index}
                          className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                        >
                          <td className="py-4 px-4 text-swhite font-medium">
                            {aircraft.registration}
                          </td>
                          <td className="py-4 px-4 text-swhite">
                            {aircraft.model}
                          </td>
                          <td className="py-4 px-4 text-swhite/70 capitalize">
                            {aircraft.type}
                          </td>
                          <td className="py-4 px-4 text-swhite/60 text-sm">
                            {aircraft.notes || "-"}
                          </td>
                          <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                            {aircraft.pricePerMinuteWithEquipmentFee}
                          </td>
                          <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                            {aircraft.pricePerHourWithEquipmentFee}
                          </td>
                          <td className="py-4 px-4 text-right text-swhite/70 font-semibold whitespace-nowrap">
                            {aircraft.pricePerMinuteWithoutEquipmentFee}
                          </td>
                          <td className="py-4 px-4 text-right text-swhite/70 font-semibold whitespace-nowrap">
                            {aircraft.pricePerHourWithoutEquipmentFee}
                          </td>
                        </tr>
                      );
                    })}
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
                    {pricesData.demonstrationFlights.map((flight, index) => (
                      <tr
                        key={index}
                        className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                      >
                        <td className="py-4 px-4 text-swhite font-medium">
                          {flight.type}
                        </td>
                        <td className="py-4 px-4 text-swhite/70">
                          {flight.description}
                        </td>
                        <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                          {flight.price} {flight.unit}
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
                    {pricesData.hangarSpaces.map((space, index) => (
                      <tr
                        key={index}
                        className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
                      >
                        <td className="py-4 px-4 text-swhite font-medium">
                          {space.type}
                        </td>
                        <td className="py-4 px-4 text-swhite/70">
                          {space.description}
                        </td>
                        <td className="py-4 px-4 text-right text-swhite font-semibold whitespace-nowrap">
                          {space.price} {space.unit}
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
                {pricesData.disclaimers.map((disclaimer) => (
                  <div
                    key={disclaimer.id}
                    className="text-swhite/80 leading-relaxed"
                  >
                    <span className="font-semibold text-sbluel">
                      {disclaimer.id}*{" "}
                    </span>
                    <span className="whitespace-pre-line">
                      {disclaimer.text}
                    </span>
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
        </div>
      </section>
    </div>
  );
}
