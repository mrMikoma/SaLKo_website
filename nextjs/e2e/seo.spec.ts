import { test, expect } from "./fixtures";
import planes from "@/data/planes.json";

// What search engines and link previews read (utilities/seo.ts, docs/SEO_PLAN.md).
// The e2e server shows Historiaa and Hallit (playwright.config.ts), so the
// sitemap lists them too.
const SITE = "https://savonlinnanlentokerho.fi";

const indexedPages = [
  "/",
  "/koulutus",
  "/esittelylennot",
  "/kalusto",
  "/yhteystiedot",
  "/kerho",
  "/kerho/hinnasto",
  "/kerho/jasenyys",
  "/kerho/kentta",
  "/kerho/historiaa",
  "/kerho/hallit",
  "/tiedotteet",
  ...planes.map((plane) => `/kalusto/${plane.registeration}`),
];

const canonical = (path: string) => (path === "/" ? SITE : SITE + path);

type JsonLd = { "@type"?: string; "@graph"?: JsonLd[]; [key: string]: unknown };

test("the sitemap lists the public pages", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, "") || "/");
  expect(paths.sort()).toEqual([...indexedPages].sort());
});

for (const path of indexedPages) {
  test(`${path} has its own title, description and link preview`, async ({ page }) => {
    await page.goto(path);

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(title.length, title).toBeLessThanOrEqual(60);
    expect(description.length, description).toBeGreaterThanOrEqual(70);
    expect(description.length, description).toBeLessThanOrEqual(160);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical(path));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical(path));
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title.replace(/ \| SaLKo$/, ""));
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /^https:\/\/savonlinnanlentokerho\.fi\/images\//);
  });
}

test("no two pages share a title or a description", async ({ request }) => {
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const path of indexedPages) {
    const html = await (await request.get(path)).text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    expect(titles.get(title), `${path} has the title of`).toBeUndefined();
    expect(descriptions.get(description), `${path} has the description of`).toBeUndefined();
    titles.set(title, path);
    descriptions.set(description, path);
  }
});

test("the front page describes the club and the site", async ({ page }) => {
  await page.goto("/");
  const data: JsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  const [club, site] = data["@graph"];
  expect(club).toMatchObject({ "@type": "SportsClub", name: "Savonlinnan Lentokerho ry", foundingDate: "1962" });
  expect(club.address).toMatchObject({ streetAddress: "Lentoasemantie 50", addressLocality: "Savonlinna" });
  expect(site).toMatchObject({ "@type": "WebSite", url: `${SITE}/` });
});

test("a subpage gives its breadcrumb trail", async ({ page }) => {
  await page.goto("/kalusto/OH-CON");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const trail = blocks.map((block): JsonLd => JSON.parse(block)).find((data) => data["@type"] === "BreadcrumbList");
  expect(trail.itemListElement).toEqual([
    { "@type": "ListItem", position: 1, name: "Etusivu", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "Kalusto", item: `${SITE}/kalusto` },
    { "@type": "ListItem", position: 3, name: "OH-CON" },
  ]);
});
