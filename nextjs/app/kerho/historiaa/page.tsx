// The flag is read per request: the production image is built without it
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { isPagesInReviewEnabled } from "@/utilities/features";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import HistoryTimeline from "@/components/historyTimeline";
import historyData from "@/data/history.json";

export const metadata = {
  title: "Historiaa",
  description:
    "Savonlinnan Lentokerhon historia: jäältä lennetyistä 1930-luvun liidoista ja kerhon perustamisesta 1962 Savonlinnan lentoaseman hallien ja koneiden vaiheisiin.",
  alternates: { canonical: "/kerho/historiaa" },
};

// Anchor ids for the table of contents
const slug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function Page() {
  // Waiting for the club members' review: hidden in production until then
  if (!isPagesInReviewEnabled()) {
    notFound();
  }

  const { intro, sections, aircraft, documents, source } = historyData;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Historiaa"
        subtitle="Yli 60 vuotta ilmailua Savonlinnassa"
        breadcrumbs={["Kerho", "Historiaa"]}
        backgroundImage="bg-olavinlinna-one"
        compact={true}
        showScrollIndicator={false}
      />

      <HistoryTimeline showMoreLink={false} />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-3xl mx-auto space-y-12">
          <p className="text-lg md:text-xl text-swhite/90 leading-relaxed">{intro}</p>

          <nav aria-label="Sisällys" className="glass rounded-xl border border-sbluel/30 p-6">
            <h2 className="text-lg font-semibold text-swhite mb-3">Sisällys</h2>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 list-decimal list-inside text-swhite/85">
              {sections.map((section) => (
                <li key={section.title}>
                  <a href={`#${slug(section.title)}`} className="hover:text-swhite underline-offset-4 hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#kalusto" className="hover:text-swhite underline-offset-4 hover:underline">
                  Kalusto vuosien varrelta
                </a>
              </li>
            </ol>
          </nav>

          {sections.map((section) => (
            <section key={section.title} id={slug(section.title)} className="scroll-mt-32">
              <h2 className="text-2xl md:text-3xl font-bold text-swhite mb-4 pb-2 border-b-2 border-sred/60">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-swhite/85 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section id="kalusto" className="scroll-mt-32">
            <h2 className="text-2xl md:text-3xl font-bold text-swhite mb-4 pb-2 border-b-2 border-sred/60">
              Kalusto vuosien varrelta
            </h2>
            <p className="text-swhite/85 leading-relaxed mb-4">
              Nykyinen kalusto on esitelty <Link href="/kalusto" className="underline underline-offset-4 hover:text-swhite">Kalusto-sivulla</Link>.
              Kerhon käytössä on vuosien varrella ollut myös:
            </p>
            <ul className="space-y-2 list-disc list-inside text-swhite/85">
              {aircraft.club.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="text-xl font-semibold text-swhite mt-8 mb-3">
              Kerholaisten omia koneita
            </h3>
            <ul className="space-y-2 list-disc list-inside text-swhite/85">
              {aircraft.members.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {documents.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-swhite mb-3">Arkistosta</h2>
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.href}>
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-swhite/85 underline underline-offset-4 hover:text-swhite"
                    >
                      {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-sm text-swhite/60">Lähde: {source}.</p>
        </div>
      </ContentSection>
    </div>
  );
}
