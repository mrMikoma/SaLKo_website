---
name: seo
description: Audit and improve how the SaLKo public site shows up in search and link previews. Covers page titles, descriptions, canonical URLs, Open Graph, app/sitemap.ts, app/robots.ts, JSON-LD, images and Core Web Vitals. Use when adding or changing a public page, its text or images, or its metadata, when touching the sitemap or robots, or when asked about SEO, Google results, share previews or page speed.
---

The plan and its progress are in `nextjs/docs/SEO_PLAN.md`. Read it first, and tick items there when a PR does them.

## Which pages count

Public, indexable pages: `/`, `/koulutus`, `/esittelylennot`, `/kalusto`, `/kalusto/[planes]` (one per plane in `data/planes.json`), `/kalusto/varauskalenteri`, `/kerho`, `/kerho/hinnasto`, `/kerho/jasenyys`, `/kerho/kentta`, `/tiedotteet` and `/yhteystiedot`.

- `/kerho/historiaa` and `/kerho/hallit` return 404 in production until the club has reviewed them (`isPagesInReviewEnabled()`, `docs/GO_LIVE.md`). Keep them out of the sitemap until they are published.
- `/admin`, `/jasenalue`, `/auth` and `/api` are private. `robots.ts` disallows them; never list them in the sitemap. Pages there need no SEO work beyond a plain `title`.
- `robots.ts` only allows crawling when `ALLOW_INDEXING=true` (the prod image). The dev site (kehitys.) also sends `X-Robots-Tag: noindex` from Traefik, so the audit reports noindex there. That is expected.

## Checklist for a public page

Text is Finnish and written for people first. Facts (prices, planes, contacts) come from `data/*.json`, not invented copy.

1. **Metadata.** `export const metadata = pageMetadata({ title, description, path })` from `utilities/seo.ts`; `[planes]` returns it from `generateMetadata`. Don't hand-write `openGraph`: Next merges metadata **shallowly**, so a page without it shares the layout's title and description, and a page with a partial one loses `siteName`, `locale` and the image. The helper sets all of it, and Next copies it into the `twitter:` tags.
   - `title`: the layout's template adds ` | SaLKo`, so keep the whole title at or under 60 characters. Start with what people search for, e.g. "Lentokoulutus Savonlinnassa – PPL, LAPL, purjelento". `app/page.tsx` sits in the layout's own segment, which the template doesn't reach, so it passes `absoluteTitle: true` and a complete title.
   - `description`: unique, 70–160 characters, says what the page offers and where (Savonlinna, EFSA). For text from `data/*.json`, `summarize()` cuts it at whole sentences. Leave prices out; they go stale.
   - `path`: the page's own path. It becomes the canonical URL and og:url, absolute on `https://savonlinnanlentokerho.fi` through `metadataBase`.
   - `image`: optional, defaults to `DEFAULT_SHARE_IMAGE` (`public/images/og/salko.jpg`, 1200×630). Pass a page's own photo when it has a better one, as the plane pages do.
   - Skip `keywords`. Google ignores the tag.
2. **Headings.** One `h1`. `PageHero` renders it from `title`. Then `h2` and `h3` in order, without skipping a level. Lighthouse flags `heading-order`, and `e2e/smoke.spec.ts` checks the `h1`.
3. **Images.** Use `next/image` with a Finnish `alt` that says what is in the photo ("OH-CON vaakalennossa Saimaan yllä"). The `bg-*` hero backgrounds in `styles/tailwind.css` bypass Next's optimizer, so their files must already be small. Before you commit any photo, resize it to at most 2000 px wide, save it as JPEG or WebP under about 300 kB, and strip EXIF data. Phone photos can carry GPS coordinates.
4. **Links.** Link to related pages with `next/link` and text that says where the link goes. Write "Esittelylentojen hinnat", not "Lue lisää".
5. **Sitemap and tests.** Add every new public page to `pages` in `app/sitemap.ts` and to `indexedPages` in `e2e/seo.spec.ts`. When you change what a page says, update its date in `sitemap.ts`. Use the date of the content change, never the build date.
6. **Structured data.** Use JSON-LD only for content that is visible on the page, rendered with `components/jsonLd.tsx`, which escapes `<` as `node_modules/next/dist/docs/01-app/02-guides/json-ld.md` asks. Already in place: `SportsClub` + `WebSite` on the home page (`clubJsonLd` in `utilities/seo.ts`, from `data/contacts.json`), and a `BreadcrumbList` that `PageHero` builds from its `breadcrumbs`, so a new subpage gets one by passing them.

Before you write metadata code, read the bundled Next docs (`nextjs/AGENTS.md`): `01-app/03-api-reference/04-functions/generate-metadata.md` and `03-file-conventions/01-metadata/` (`opengraph-image`, `sitemap`, `robots`, app icons).

## Audit

Both scripts run with bun from the repo root and need no dependencies.

```bash
# On-page checks of every sitemap URL: status, redirects, noindex, title and
# description length, canonical, Open Graph, h1 count, img alt, JSON-LD,
# duplicate titles/descriptions across pages, og:image size. Exit 1 on errors.
bun .claude/skills/seo/scripts/audit.ts                          # production
bun .claude/skills/seo/scripts/audit.ts http://localhost:3000    # local server
bun .claude/skills/seo/scripts/audit.ts --paths /kalusto/OH-CON,/kerho/hallit
bun .claude/skills/seo/scripts/audit.ts --json > /tmp/seo.json

# Lighthouse (mobile; --desktop for desktop): scores, LCP/CLS/TBT/TTFB, the
# LCP element and its phases, heavy images, failed requests, failing audits
bun .claude/skills/seo/scripts/lighthouse.ts https://savonlinnanlentokerho.fi/ https://savonlinnanlentokerho.fi/koulutus
```

- Against a local server, the audit reads the sitemap's paths and fetches them from that server. `bun dev` is fine for metadata. For Lighthouse, run a production build (`bun run build`, then `bun run start` in `nextjs/`), or the numbers mean nothing.
- `lighthouse.ts` runs `npx -y lighthouse@12` (downloaded on first use) with Playwright's Chromium from `~/.cache/ms-playwright`, or `CHROME_PATH`.
- Lighthouse's SEO score is 100 on every page and checks little. Judge the work by the audit script, the performance numbers, and Search Console once it is set up.
- Treat audit `ERROR` lines as bugs. Weigh `WARN` lines: a short title can be right for a small page.

`e2e/seo.spec.ts` runs in CI with the other e2e tests. It checks that the sitemap lists exactly the public pages, and that each one has a title of at most 60 characters, a description of 70–160 characters, a matching canonical and og:url, og:title, og:description and og:image, and that no two pages share a title or description. It also checks the JSON-LD.

After a change, audit the changed paths locally and include the before and after output in the PR. Validate new JSON-LD at https://validator.schema.org/ (paste the rendered HTML) and, once deployed, at https://search.google.com/test/rich-results.

## What only the user does

Never do these without asking: Google Search Console and Bing Webmaster Tools (DNS TXT record in Cloudflare), Google Business Profile, Cloudflare settings, the Google OAuth client's redirect URIs, and asking other sites for links. Code changes go through a PR to `dev`, then `main`, like everything else.
