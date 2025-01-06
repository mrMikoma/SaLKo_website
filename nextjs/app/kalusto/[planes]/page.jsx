import PlaneInfo from "@/components/planes/planeInfo";
import PlanePhoto from "@/components/planes/planeGallery";
import planeData from "@/data/planes.json";
import Image from "next/image";

export async function generateMetadata({ params }) {
  const { planes } = await params;
  const plane = planeData.find((p) => p.registeration === planes);

  return {
    title: plane ? `${planes} / SaLKo` : "Plane Not Found / SaLKo",
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
      <div className="min-h-screen w-screen flex justify-center items-center bg-red-200">
        <h1 className="text-2xl font-bold">Lentokonetta ei löytynyt</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center bg-gradient-to-b from-blue-200 to-blue-100">
      <header className="w-full bg-blue-600 text-white py-4 shadow-md">
        <h1 className="text-center text-3xl font-bold">{plane.name}</h1>
        <p className="text-center text-sm mt-1">{plane.registeration}</p>
      </header>

      <main className="flex flex-col items-center w-full px-4 py-8">
        <section className="max-w-4xl bg-white shadow-lg rounded-lg p-6 mb-8 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <PlaneInfo
              name={plane.name}
              identifier={plane.registeration}
              description={plane.description}
              specs={plane.specs}
              links={plane.links}
            />
          </div>

          <div className="flex-1 relative w-full max-w-8xl h-[500px] rounded overflow-hidden shadow-lg">
            {plane.images && plane.images.length > 0 && (
              <Image
                src={plane.images[0].src}
                alt={plane.images[0].alt || "Plane photo"}
                layout="fill"
                objectFit="cover"
                className="rounded"
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Page;
