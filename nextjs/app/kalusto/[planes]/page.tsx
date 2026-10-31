import PlaneInfo from "@/components/planes/planeInfo";
import PlaneGallery from "@/components/planes/planeGallery";
import planeData from "@/data/planes.json";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import { pageMetadata, summarize } from "@/utilities/seo";

export async function generateMetadata({ params }) {
  const { planes } = await params;
  const plane = planeData.find((p) => p.registeration === planes);
  if (!plane) {
    return { title: "Lentokonetta ei löytynyt" };
  }

  // Some planes have no description yet ("TBA")
  const description =
    plane.description.length >= 70
      ? summarize(plane.description)
      : `${plane.name} (${plane.registeration}) on Savonlinnan Lentokerhon kalustoa. Katso koneen tekniset tiedot${plane.images.length > 0 ? " ja kuvat" : ""}.`;
  const photo = plane.images[0];

  return pageMetadata({
    title: `${plane.registeration} – ${plane.name}`,
    description,
    path: `/kalusto/${plane.registeration}`,
    image: photo ? { url: photo.src, alt: photo.alt } : undefined,
  });
}

export async function generateStaticParams() {
  return planeData.map((plane) => ({
    planes: plane.registeration,
  }));
}

const Page = async ({ params }) => {
  const { planes } = await params;
  const plane = planeData.find((p) => p.registeration === planes);

  if (!plane) {
    // "oh-con" is OH-CON; anything else is the not-found page, with a 404
    const sameLetters = planeData.find((p) => p.registeration.toLowerCase() === planes.toLowerCase());
    if (sameLetters) permanentRedirect(`/kalusto/${sameLetters.registeration}`);
    notFound();
  }

  const hasImage = plane.images && plane.images.length > 0;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title={plane.name}
        subtitle={plane.registeration}
        breadcrumbs={["Kalusto", plane.registeration]}
        compact={true}
        backgroundImage="bg-efsa-one"
        showScrollIndicator={false}
      >
        <div className="space-y-8 max-w-7xl mx-auto p-6 w-full">
          {/* Image Gallery */}
          {hasImage && (
            <PlaneGallery images={plane.images} planeName={plane.name} />
          )}

          {/* Plane Info */}
          <PlaneInfo
            name={plane.name}
            identifier={plane.registeration}
            description={plane.description}
            specs={plane.specs}
            links={plane.links}
          />

          {/* Back Button */}
          <div className="text-center pt-4">
            <Link
              href="/kalusto"
              className="inline-flex items-center gap-2 px-8 py-4 bg-sbluel text-swhite font-semibold rounded-lg shadow-xl hover:bg-sbluel/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <span>←</span>
              <span>Takaisin kalustoon</span>
            </Link>
          </div>
        </div>
      </PageHero>
    </div>
  );
};

export default Page;
