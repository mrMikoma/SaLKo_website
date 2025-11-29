export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-center">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Text Section */}
              <div className="text-swhite">
                <h2 className="text-2xl font-bold text-center md:text-left mb-6 text-sred">
                  Savonlinnan Lentoasema
                </h2>
                <p className="mb-4 text-swhite/90">
                  Savonlinnan Lentoasema (ICAO: EFSA, IATA: SVL) sijaitsee 15 km
                  Savonlinnan pohjoispuolella, Enonkoskentien 471 varrella.
                  Lentoaseman osoite on Lentoasemantie 50, 57310 Savonlinna.
                  Lentoaseman ylläpitäjä ja omistaja on Finavia.
                </p>
                <p className="mb-4 text-swhite/90">
                  Kiitotie 12–30 on asvaltoitu ja sillä on mittaa 2300 x 45 m.
                  Kiitotien korkeus keskimääräisestä merenpinnasta on 312 ft eli
                  95 m. Kentän koordinaatit ovat 61°56′40″N, 28°56′05″E.
                </p>
                <p className="mb-4 text-swhite/90">
                  Savonlinnan AFIS:n jakso on 118.80 MHz, DME:n 117.90 MHz ja
                  ILS LOC:n 111.10 MHz. ATIS-lähetystä voi kuunnella jaksolla
                  136.050 MHz. Savonlinnan lennotiedotusvyöhyke FIZ on
                  ilmatilaluokkaa G lentopinnalle 95 asti.
                </p>
              </div>

              {/* Image Section */}
              <div className="flex justify-center items-center">
                <div className="w-full h-64 sm:h-80 glass rounded-lg shadow-xl flex items-center justify-center border border-sred/20">
                  <span className="text-swhite/60 text-lg font-medium">
                    [Insert Image Here]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
