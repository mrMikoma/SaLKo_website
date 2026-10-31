import type { MetadataRoute } from "next";
import planeData from "@/data/planes.json";
import { fetchPublishedBulletins } from "@/utilities/bulletings";
import { isPagesInReviewEnabled } from "@/utilities/features";
import { SITE_URL } from "@/utilities/seo";

// Read per request: the newest bulletin and the review flag change without a
// new build (the production image is built without the flag)
export const dynamic = "force-dynamic";

// The public pages and when their content last changed. Update the date when
// you change what a page says; search engines stop trusting dates that move
// on every build. Google ignores changeFrequency and priority.
const pages: [path: string, lastModified: string][] = [
  ["/", "2026-03-01"],
  ["/koulutus", "2026-03-01"],
  ["/esittelylennot", "2026-05-27"],
  ["/kalusto", "2026-01-01"],
  ["/yhteystiedot", "2026-01-01"],
  ["/kerho", "2026-01-01"],
  ["/kerho/hinnasto", "2026-05-27"],
  ["/kerho/jasenyys", "2026-01-01"],
  ["/kerho/kentta", "2026-01-01"],
];

// Hidden in production until the club members have reviewed them
const pagesInReview: [path: string, lastModified: string][] = [
  ["/kerho/historiaa", "2026-10-23"],
  ["/kerho/hallit", "2026-10-23"],
];

// data/planes.json
const fleetModified = "2026-01-01";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { result: bulletins } = await fetchPublishedBulletins(1);
  const newestBulletin = bulletins[0]?.publishedAt;

  return [
    ...pages,
    ...(isPagesInReviewEnabled() ? pagesInReview : []),
    ...planeData.map((plane): [string, string] => [`/kalusto/${plane.registeration}`, fleetModified]),
  ]
    .map(([path, date]) => ({ url: `${SITE_URL}${path}`, lastModified: new Date(date) }))
    .concat({
      url: `${SITE_URL}/tiedotteet`,
      lastModified: newestBulletin ? new Date(newestBulletin) : new Date("2026-10-21"),
    });
}
