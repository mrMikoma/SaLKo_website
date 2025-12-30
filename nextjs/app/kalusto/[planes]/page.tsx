import PlaneInfo from "@/components/planes/planeInfo";
import PlaneGallery from "@/components/planes/planeGallery";
import planeData from "@/data/planes.json";
import Link from "next/link";

export async function generateMetadata({ params }) {
  const { planes } = await params;
  const plane = planeData.find((p) => p.registeration === planes);

  return {
    title: plane ? `${planes} / SaLKo` : "Plane Not Found / SaLKo",
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
        <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
          <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
          <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16">
            <div className="glass rounded-lg p-8 md:p-12 border border-sred/20 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-swhite mb-4">
                Lentokonetta ei löytynyt
              </h1>
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
        </section>
      </div>
    );
  }

  const hasImage = plane.images && plane.images.length > 0;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16">
          {/* Header */}
          <div className="text-center space-y-4 animate-fade-in mt-10 mb-12 md:mt-12 md:mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-swhite">
              {plane.name}
            </h1>
            <p className="text-xl md:text-2xl font-bold leading-tight text-sred">
              {plane.registeration}
            </p>
          </div>

          {/* Main Content */}

          {/* Image Gallery */}
          {hasImage && (
            <PlaneGallery images={plane.images} planeName={plane.name} />
          )}
          <div className="space-y-8">
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
        </div>
      </section>
    </div>
  );
};

export default Page;
