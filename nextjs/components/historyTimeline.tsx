import Link from "next/link";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

const events: TimelineEvent[] = [
  {
    year: "1962",
    title: "Kerhon perustaminen",
    description:
      "Savonlinnan Lentokerho ry perustettiin yleisilmailun harrastustoiminnan edistämiseksi.",
  },
  {
    year: "1970-luku",
    title: "Toiminnan laajeneminen",
    description:
      "Kerhon toiminta laajeni merkittävästi ja jäsenmäärä kasvoi voimakkaasti.",
  },
  {
    year: "1980-luku",
    title: "Kaluston kehittäminen",
    description:
      "Hankittiin uutta kalustoa ja modernisoitiin olemassa olevaa lentotekniikkaa.",
  },
  {
    year: "2000-luku",
    title: "Modernisaatio",
    description:
      "Toiminnan modernisointi ja uusien koulutusmuotojen käyttöönotto digitalisoituvassa maailmassa.",
  },
  {
    year: "2025",
    title: "Nykyaika",
    description:
      "Aktiivinen kerho yli 60 vuoden historialla, tarjoten laadukasta koulutusta ja monipuolista harrastustoimintaa.",
  },
];

const HistoryTimeline = () => {
  return (
    <section className="w-full bg-gradient-to-b from-sblued to-sblack py-16 lg:py-24">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4">
            Historiamme
          </h2>
          <p className="text-lg text-swhite/80 mx-auto">
            Yli 60 vuotta ilmailun parissa Savonlinnassa
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mx-auto">
          {/* Vertical Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-sred via-sbluel to-sred hidden md:block"></div>

          {/* Events */}
          <div className="space-y-12">
            {events.map((event, index) => (
              <div
                key={index}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div className="w-full md:w-5/12">
                  <div
                    className={`glass p-6 rounded-2xl border border-sred/20 shadow-xl card-hover ${
                      index % 2 === 0 ? "md:text-right" : "md:text-left"
                    } text-center`}
                  >
                    <div className="text-3xl font-bold text-sred mb-2">
                      {event.year}
                    </div>
                    <h3 className="text-xl font-semibold text-swhite mb-3">
                      {event.title}
                    </h3>
                    <p className="text-swhite/80 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>

                {/* Center Dot */}
                <div className="hidden md:flex w-2/12 justify-center">
                  <div className="w-6 h-6 rounded-full bg-sred border-4 border-sblued shadow-lg relative z-10">
                    <div className="absolute inset-0 rounded-full bg-sred animate-pulse-glow"></div>
                  </div>
                </div>

                {/* Spacer */}
                <div className="hidden md:block w-5/12"></div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/kerho/historiaa"
            className="inline-block px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            Lue lisää historiastamme
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HistoryTimeline;
