import Bulletings from "@/components/bulletings/bulletings";
import SectionTitle from "@/components/sectionTitle";

export const metadata = {
  title: "SaLKo",
  description: "Savonlinnan Lentokerho ry",
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-screen">
      <section className="max-w-screen relative">
        <div className="w-screen h-screen flex bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-black opacity-50 flex justify-center items-center"></div>
          <div className="absolute inset-x-0 bottom-0 z-10 w-full h-full flex flex-col justify-between">
            <div className="flex flex-col md:flex-row w-full h-full justify-between items-start">
              {/* Section Title taking 2/3 */}
              <div className="w-full sm:w-2/3 pr-4 my-auto sm:pb-32">
                <SectionTitle title="Savonlinnan Lentokerho ry">
                  Savonlinnan Lentokerho ry on 1962 perustettu yleisilmailun
                  harrastustoimintaan ja koulutukseen keskittynyt
                  ilmailuyhdistys. Kerhomme toiminta tukeutuu Savonlinnan
                  Lentoasemalle, 15 km Savonlinnasta Enonkoskelle päin.
                  Kerhossamme on noin 40 jäsentä, joista lentämistä harrastaa
                  vajaa puolet.
                </SectionTitle>
              </div>

              {/* Bulletin taking 1/3 */}
              <div className="w-full sm:w-1/3 h-full px-4 bg-sblue bg-opacity-50 overflow-y-auto">
                <Bulletings />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
