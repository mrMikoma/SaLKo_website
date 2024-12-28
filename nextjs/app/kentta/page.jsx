import SectionTitle from "../../components/sectionTitle";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-screen">
      <section className="max-w-screen relative">
        <div className="w-screen h-screen flex bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-black opacity-50 flex justify-center items-center"></div>
          <div className="absolute inset-x-0 bottom-0 z-10 w-full h-full sm:h-5/6 flex flex-col justify-between">
            <div className="flex flex-col justify-end">
              <div className="text-sm sm:text-md lg:text-lg xl:text-xl text-white font-light text-center text-nowrap mt-10 hidden sm:block">
                <SectionTitle
                  pretitle="SaLKo"
                  title="Savonlinnan Lentokerho ry"
                >
                  Kenttä
                </SectionTitle>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-screen relative px-8 py-16 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Text Section */}
          <div className="text-gray-800">
            <h2 className="text-2xl font-bold text-center md:text-left mb-6">
              Savonlinnan Lentoasema
            </h2>
            <p className="mb-4">
              Savonlinnan Lentoasema (ICAO: EFSA, IATA: SVL) sijaitsee 15 km
              Savonlinnan pohjoispuolella, Enonkoskentien 471 varrella. Lentoaseman
              osoite on Lentoasemantie 50, 57310 Savonlinna. Lentoaseman ylläpitäjä ja
              omistaja on Finavia.
            </p>
            <p className="mb-4">
              Kiitotie 12–30 on asvaltoitu ja sillä on mittaa 2300 x 45 m. Kiitotien
              korkeus keskimääräisestä merenpinnasta on 312 ft eli 95 m. Kentän
              koordinaatit ovat 61°56′40″N, 28°56′05″E.
            </p>
            <p className="mb-4">
              Savonlinnan AFIS:n jakso on 118.80 MHz, DME:n 117.90 MHz ja ILS LOC:n
              111.10 MHz. ATIS-lähetystä voi kuunnella jaksolla 136.050 MHz.
              Savonlinnan lennotiedotusvyöhyke FIZ on ilmatilaluokkaa G lentopinnalle
              95 asti.
            </p>
          </div>

          {/* Image Section */}
          <div className="flex justify-center items-center">
            <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
              <span className="text-gray-500 text-lg font-medium">
                [Insert Image Here]
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
