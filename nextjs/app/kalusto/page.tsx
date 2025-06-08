import SectionTitle from "../../components/sectionTitle";

const planes = [
  {
    id: 1,
    name: "Cessna 172N",
    name_extended: "Cessna 172N Skyhawk 100 II",
    registeration: "OH-CON",
  },
  {
    id: 2,
    name: "Socata Rallye",
    name_extended: "Socata M.S. 893E Rallye 180GT,",
    registeration: "OH-SEE",
  },
  {
    id: 3,
    name: "Piper J-3 Cub",
    name_extended: "Piper J-3C-85 Cub",
    registeration: "OH-PDX",
  },
  {
    id: 4,
    name: "Puchacz",
    name_extended: "SZD-50-3 Puchacz",
    registeration: "OH-816",
  },
  {
    id: 5,
    name: "Junior",
    name_extended: "SZD-51-1 Junior",
    registeration: "OH-829",
  },
  {
    id: 6,
    name: "Jantar",
    name_extended: "SZD-41A Jantar Standard",
    registeration: "OH-475",
  },
];

export const metadata = {
  title: "Kalusto / SaLKo",
};

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-screen">
      <section className="max-w-screen relative">
        <div className="w-screen h-screen flex bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-black opacity-50 flex justify-center items-center"></div>
          <div className="absolute inset-x-0 bottom-0 z-10 w-full h-full sm:h-5/6 flex flex-col items-center">
            <div className="max-w-screen-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planes.map((plane) => (
                <a
                  key={plane.id}
                  href={`/kalusto/${plane.registeration}`}
                  className="flex flex-col gap-4 p-4 bg-sbluel rounded shadow text-black"
                >
                  <h2 className="text-2xl font-bold">{plane.name}</h2>
                  <h3 className="text-xl italic">{plane.name_extended}</h3>
                  <p className="text-base">{plane.registeration}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page;
