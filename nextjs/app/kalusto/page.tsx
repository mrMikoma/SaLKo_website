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
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-center">
          <div className="text-center space-y-8 mb-12 animate-fade-in">
            <span className="text-sbluel text-sm md:text-base font-semibold tracking-wider uppercase">
              SaLKo
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-swhite">
              Savonlinnan <br />
              <span className="text-sbluel">Lentokerho ry</span>
            </h1>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-sred">
              Kalusto
            </h2>
          </div>
          <div className="max-w-screen-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {planes.map((plane) => (
              <a
                key={plane.id}
                href={`/kalusto/${plane.registeration}`}
                className="flex flex-col gap-4 p-6 bg-sbluel/90 backdrop-blur-sm rounded-lg shadow-xl text-sblack hover:bg-sbluel hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-sbluel/30"
              >
                <h2 className="text-2xl font-bold">{plane.name}</h2>
                <h3 className="text-xl italic">{plane.name_extended}</h3>
                <p className="text-base font-semibold">{plane.registeration}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page;
