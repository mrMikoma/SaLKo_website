import SectionTitle from "../components/sectionTitle";

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
                  Savonlinnan Lentokerho ry on 1962 perustettu yleisilmailun
                  harrastustoimintaan ja koulutukseen keskittynyt
                  ilmailuyhdistys. Kerhomme toiminta tukeutuu Savonlinnan
                  Lentoasemalle, 15 km Savonlinnasta Enonkoskelle päin.
                  Kerhossamme on noin 70 jäsentä, joista lentämistä harrastaa
                  vajaa puolet.
                </SectionTitle>
                ;
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}