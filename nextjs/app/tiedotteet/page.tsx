import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import Bullet from "@/components/bulletings/bullet";
import { fetchPublishedBulletins } from "@/utilities/bulletings";
import { pageMetadata } from "@/utilities/seo";

export const metadata = pageMetadata({
  title: "Tiedotteet – kerhon ajankohtaiset",
  description:
    "Savonlinnan Lentokerhon tiedotteet ja ajankohtaiset asiat uusimmasta vanhimpaan.",
  path: "/tiedotteet",
});

/**
 * Every published bulletin; the home page shows the five newest
 */
export default async function Page() {
  const { status, result: bulletins } = await fetchPublishedBulletins();

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Tiedotteet"
        subtitle="Kerhon tiedotteet uusimmasta vanhimpaan"
        breadcrumbs={["Kerho", "Tiedotteet"]}
        backgroundImage="olavinlinna"
        compact={true}
        showScrollIndicator={false}
      />
      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-3xl mx-auto space-y-3">
          {bulletins.length > 0 ? (
            bulletins.map((item) => <Bullet key={item.id} item={item} />)
          ) : (
            <p className="text-swhite/80 text-center">
              {status === "error" ? "Tiedotteiden haku epäonnistui." : "Ei tiedotteita."}
            </p>
          )}
        </div>
      </ContentSection>
    </div>
  );
}
