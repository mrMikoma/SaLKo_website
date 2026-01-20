import PlaneInfo from "@/components/planes/planeInfo";
import PlaneGallery from "@/components/planes/planeGallery";
import planeData from "@/data/planes.json";
import Link from "next/link";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";

export async function generateMetadata({ params }) {
  const { planes } = await params;
  const plane = planeData.find((p) => p.registeration === planes);

  return {
    title: plane ? `${planes}` : "Koekonetta ei löytynyt",
    description: plane
      ? `${plane.name} - ${plane.registeration}`
      : "Lentokonetta ei löytynyt",
  };
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
    return (
      <div className="min-h-screen flex flex-col w-full">
        <PageHero
          title="Lentokonetta ei löytynyt"
          breadcrumbs={["Kalusto"]}
          compact={false}
          backgroundImage="bg-efsa-one"
          showScrollIndicator={false}
          children={
            <div className="max-w-[1600px] mx-auto px-6 pb-20 lg:pb-32">
              <div className="max-w-4xl mx-auto">
                <div className="glass rounded-lg p-8 md:p-12 border border-sred/20 text-center">
                  <p className="text-lg text-swhite/80 mb-8">
                    Etsimääsi lentokonetta ei löytynyt kalustostamme.
                  </p>
                  <Link
                    href="/kalusto"
                    className="inline-block px-8 py-4 bg-sred text-swhite font-semibold rounded-lg shadow-xl hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  >
                    Palaa kalustoon
                  </Link>
                </div>
              </div>
            </div>
          }
        />
      </div>
    );
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
        children={
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
        }
      />
    </div>
  );
};

export default Page;
