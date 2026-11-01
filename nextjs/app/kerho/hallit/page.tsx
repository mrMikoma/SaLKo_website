// The flag is read per request: the production image is built without it
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { isPagesInReviewEnabled } from "@/utilities/features";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";
import pricesData from "@/data/prices.json";
import contactsData from "@/data/contacts.json";
import { pageMetadata } from "@/utilities/seo";

export const metadata = pageMetadata({
  title: "Hallit ja talvisäilytys",
  description:
    "Savonlinnan Lentokerhon kaksi lentokonehallia Savonlinnan lentoasemalla ja talvisäilytys veneille, autoille, matkailuvaunuille ja muulle irtaimistolle.",
  path: "/kerho/hallit",
});

export default function Page() {
  // Waiting for the club members' review: hidden in production until then
  if (!isPagesInReviewEnabled()) {
    notFound();
  }

  const email = contactsData.general.email;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <PageHero
        title="Hallit ja talvisäilytys"
        subtitle="Kaksi lentokonehallia Savonlinnan lentoasemalla"
        breadcrumbs={["Kerho", "Hallit"]}
        backgroundImage="olavinlinna"
        compact={true}
        showScrollIndicator={false}
      />

      <ContentSection variant="dark" containerSize="default">
        <div className="max-w-3xl mx-auto space-y-12 text-swhite/85 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-swhite pb-2 border-b-2 border-sred/60">
              Kerhon hallit
            </h2>
            <p>
              Savonlinnan Lentokerho omistaa lentoasemalla kaksi lentokonehallia,
              joista vanhempi on valmistunut 1978 ja uudempi 1992.
            </p>
            <p>
              Vanhempaa, eristämätöntä 280 neliön hallia käytetään pääasiassa
              purjelentokoneiden ja muun kaluston säilytykseen. Sen runko on
              hitsattua teräsputkea, ovi 17 metriä leveä, ja lattia on puoliksi
              betonia ja puoliksi asfalttia.
            </p>
            <p>
              Uudempi, noin 350 neliön halli on lämpöeristetty (ei lämmitetty) ja
              varustettu talvikäyttöä varten muun muassa ovien kynnyslämmityksellä.
              Siinä kerho säilyttää moottorilentokoneitaan.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-swhite pb-2 border-b-2 border-sred/60">
              Talvisäilytys
            </h2>
            <p>
              Talveksi purjekoneet puretaan ja koneet asetellaan tiiviimmin, jolloin
              halleista vapautuu edullista talvisäilytystilaa. Lentokoneiden lisäksi
              halleissa voi säilyttää esimerkiksi veneitä, vesijettejä, autoja,
              moottoripyöriä ja matkailuvaunuja.
            </p>
            <div className="glass rounded-xl border border-sbluel/30 overflow-hidden">
              <table className="w-full text-left">
                <caption className="sr-only">Hallipaikkojen hinnat</caption>
                <thead className="text-sm text-swhite/70">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Säilytettävä</th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">Hinta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sbluel/20">
                  {pricesData.hangarSpaces.map((space) => (
                    <tr key={space.type}>
                      <td className="px-4 py-3">
                        <div className="text-swhite">{space.type}</div>
                        <div className="text-sm text-swhite/70">{space.description}</div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-swhite">
                        {space.price} {space.unit}
                        {"additionalFee" in space && space.additionalFee && (
                          <div className="text-sm text-swhite/70">{space.additionalFee}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Kysy vapaita paikkoja sähköpostilla{" "}
              <a href={`mailto:${email}`} className="text-swhite underline underline-offset-4">
                {email}
              </a>{" "}
              tai katso muut{" "}
              <Link href="/yhteystiedot" className="text-swhite underline underline-offset-4">
                yhteystiedot
              </Link>
              . Kaikki hinnat ovat{" "}
              <Link href="/kerho/hinnasto" className="text-swhite underline underline-offset-4">
                hinnastossa
              </Link>
              .
            </p>
          </section>
        </div>
      </ContentSection>
    </div>
  );
}
