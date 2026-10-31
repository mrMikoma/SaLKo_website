# Plan: search visibility (SEO)

**Date:** 2026-10-30
**Status:** 0.1, phase 1 (except 1.5) and phase 2 (except 2.4 and the colour contrast in 2.5) are built on `feature/seo-skill`, not yet merged. The `seo` skill (`.claude/skills/seo/`) has the per-page checklist and the audit scripts. Tick items here as PRs do them.

The goal: people near Savonlinna who search for flight training, intro flights or a flying club find this site first, and links shared on Facebook or WhatsApp show the right page with a good image. The site is in Finnish and serves a local audience, so most of the gain comes from correct technical basics, a little more text on thin pages, and a Google Business Profile. Off-site work is the club's to do.

## Where we are (2026-10-30, production)

Measured with `audit.ts` and `lighthouse.ts` from the skill, mobile emulation.

| Area | Finding |
|---|---|
| Crawling | `robots.txt` and `sitemap.xml` are fine. Private paths are disallowed, and the dev site sends noindex. |
| Hosts | `http://` → `https://` is a 301. **`https://www.savonlinnanlentokerho.fi` serves the same site with 200.** Canonical tags point to the apex domain, which limits the harm. |
| Titles | Most are one word: "Kalusto \| SaLKo", "Kerho \| SaLKo". The home page title is just "Savonlinnan Lentokerho". |
| Descriptions | 6 of 10 sitemap pages are under 70 characters ("Savonlinnan Lentokerhon tiedotteet"). |
| Share previews | **Every page has the same og:title and og:description** (the root layout's), and no og:url. The share image is the 3380×3482, 2.3 MB logo PNG, declared as 800×600. |
| Plane pages | `/kalusto/OH-CON` etc. have **no canonical**, a 35-character description, and are **not in the sitemap**. `planePaths` was commented out in 3427a16 with no reason given. 4 of 6 have no photo. |
| Structured data | No JSON-LD on any page. |
| Icons | Only `favicon.ico` is linked. The full set in `public/favicons/` (apple-touch-icon, 192/512 PNGs) is not used. |
| Analytics | **The Umami tracker posts to `/api/umami/api/send`, which returns 404.** The proxy route is `/api/umami/send`. Page views are not being recorded in production. `/api/umami/script` also returned 500 once during testing. |
| Speed | Lighthouse performance: home 70, esittelylennot 75, koulutus 97, OH-CON 99. **Mobile LCP is 6.7 s on the home page and 5.9 s on esittelylennot.** Almost all of it is "render delay" on a hero text paragraph. |
| Weight | `/koulutus` is 6.4 MB, mostly `certificate_1.jpg`: a 4608×3456, 5 MB CSS background, straight from a phone with its EXIF block (the GPS section is there but empty). `planning_1.jpg` and `planning_2.jpg` are 4–5 MB originals (next/image shrinks them in transit). |
| Caching | Every page is `Cache-Control: private, no-store`. The root layout awaits `auth()`, so every route renders per request. Back/forward cache is off, and Cloudflare can't cache pages. |
| Lighthouse SEO | 100 on every page. It checks little; the items above are what matter. |

## Phase 0: measure first

Without working analytics and Search Console there is no way to tell whether anything below helps.

- [x] **0.1 Fix the Umami endpoint.** Moved the route to `app/api/umami/api/send/route.ts`. It also passes on the visitor's IP headers (`cf-connecting-ip`, `x-forwarded-for`), so Umami no longer sees every visitor as the server. **After deploy:** check in the Umami dashboard that visits arrive.
- [ ] **0.2 Google Search Console** *(user)*: add a Domain property for `savonlinnanlentokerho.fi`, verified with a DNS TXT record in Cloudflare, and submit `https://savonlinnanlentokerho.fi/sitemap.xml`. Then import the property into **Bing Webmaster Tools**, which also feeds DuckDuckGo and Ecosia.
- [ ] **0.3 Baseline.** After two to four weeks of Search Console data, write down here the top queries, clicks, impressions and average position for `/`, `/koulutus` and `/esittelylennot`.

## Phase 1: technical fixes (code, one or two PRs)

- [x] **1.1 Per-page metadata helper.** `utilities/seo.ts` has `pageMetadata({ title, description, path, image? })`. It returns `title`, `description`, `alternates.canonical`, and a full `openGraph` object (`title`, `description`, `url`, `images`, `type`, `locale: "fi_FI"`, `siteName`). The full object is needed because Next merges metadata shallowly. Next copies it into the `twitter:` tags. Every public page uses the helper, which fixes the duplicate share previews and the missing og:url.
- [x] **1.2 Share image.** `public/images/og/salko.jpg`: OH-CON above the clouds with the club logo, 1200×630, 50 kB. It is set through `DEFAULT_SHARE_IMAGE`, not the `opengraph-image` file convention, because file-based metadata overrides page metadata and would hide the plane photos. Plane pages with a photo use their first one.
- [x] **1.3 Titles and descriptions.** As below. Historiaa and Hallit kept their descriptions; Historiaa's title is now "Historiaa – lentokerho vuodesta 1962". Have someone from the club read them before merging. `[planes]` builds its title as `{registration} – {model}` and its description from the first ~150 characters of `description` in `data/planes.json`.

  | Path | Title (the template adds " \| SaLKo") | Description |
  |---|---|---|
  | `/` | Savonlinnan Lentokerho – lentokoulutusta ja esittelylentoja *(full title, no template)* | Lentokerho Savonlinnan lentoasemalla vuodesta 1962. Lentokoulutusta (PPL, LAPL, purjelento), esittelylentoja ja kuusi kerhokonetta. Tervetuloa lentämään! |
  | `/koulutus` | Lentokoulutus Savonlinnassa – PPL, LAPL, purjelento | Lentolupakirja Savonlinnasta: PPL-, LAPL-, TMG- ja purjelentokoulutus sekä yölento- ja hinauskelpuutukset Savonlinnan lentoasemalla (EFSA). |
  | `/esittelylennot` | Esittelylennot Savonlinnassa – myös lahjaksi | Koe lentäminen Saimaan yllä esittelylennolla Savonlinnan lentoasemalta. Sopii myös lahjaksi: katso hinnat ja varaa lento. |
  | `/kalusto` | Kalusto – kerhon lentokoneet ja purjekoneet | Savonlinnan Lentokerhon kalusto: Cessna 172, Piper Cub, moottoripurjekone Fournier RF-5 ja kolme purjekonetta. Tekniset tiedot ja kuvat. |
  | `/kalusto/varauskalenteri` | Varauskalenteri – kerhon koneiden varaukset | Savonlinnan Lentokerhon lentokoneiden varauskalenteri: katso koneiden varaukset ja vapaat ajat. |
  | `/kerho` | Lentokerho Savonlinnassa vuodesta 1962 | Savonlinnan Lentokerho ry on vuonna 1962 perustettu yleisilmailun ja lentokoulutuksen yhdistys. Tutustu kerhoon, jäsenyyteen, hinnastoon ja kenttään. |
  | `/kerho/hinnasto` | Hinnasto – lentotunnit ja jäsenmaksut | Savonlinnan Lentokerhon hinnasto: jäsenmaksut, kalustomaksu ja kerhon lentokoneiden tunti- ja minuuttihinnat. |
  | `/kerho/jasenyys` | Jäsenyys – liity lentokerhoon | Liity Savonlinnan Lentokerhon jäseneksi: lennä kerhon koneilla, aloita lentokoulutus tai tue kerhoa kannatusjäsenenä. |
  | `/kerho/kentta` | Savonlinnan lentoasema (EFSA) – kotikenttämme | Savonlinnan lentoasema EFSA 15 km Savonlinnasta: kiitotie, kenttätiedot ja ajantasainen sää. Savonlinnan Lentokerhon kotikenttä. |
  | `/tiedotteet` | Tiedotteet – kerhon ajankohtaiset | Savonlinnan Lentokerhon tiedotteet ja ajankohtaiset asiat uusimmasta vanhimpaan. |
  | `/yhteystiedot` | Yhteystiedot – Savonlinnan Lentokerho | Savonlinnan Lentokerho ry:n yhteystiedot: hallitus, lennonopettajat ja laskutus. Lentoasemantie 50, 57310 Savonlinna. |

  The descriptions leave out prices on purpose: they would go stale whenever `data/prices.json` changes. The `keywords` arrays are gone; Google ignores them.
- [x] **1.4 Plane pages.** They have a canonical, the title and description from 1.3, their first photo as the share image, and a place in the sitemap. OH-PDX stays in: it isn't bookable, but people search for the Cub. OH-386's description in `data/planes.json` is still "TBA", so its meta description is a generic sentence until someone writes one (3.3).
- [ ] **1.5 One host.** Redirect `www.` to the apex domain with a 301. The canonical tags, sitemap and `metadataBase` already use the apex. **Order matters:** production `NEXTAUTH_URL` is `https://www.savonlinnanlentokerho.fi` (`deploy-app-prod.yaml`), so first *(user)* add the apex callback `https://savonlinnanlentokerho.fi/api/auth/callback/google` to the Google OAuth client. Then switch `NEXTAUTH_URL` to the apex. Then add the redirect as a Traefik `redirectregex` middleware on the prod router in `docker-compose.prod.yaml`, so it lives in the repo and not in the Cloudflare dashboard. Test Google and password login on prod right after.
- [x] **1.6 Structured data (JSON-LD).** `components/jsonLd.tsx` escapes `<` as the Next guide shows. Built:
  - home page: `SportsClub` (a LocalBusiness type, so Google can tie it to the place). Fields: `name`, `alternateName` "SaLKo", `url`, `logo`, `foundingDate` 1962, `email`, `address` (Lentoasemantie 50, 57310 Savonlinna, FI), `geo` (EFSA), and `sameAs` with the Facebook and Instagram pages. All of it comes from `data/contacts.json`.
  - home page: `WebSite` with `name` "Savonlinnan Lentokerho" and `alternateName` "SaLKo". Google uses it for the site name above the result.
  - `PageHero`: `BreadcrumbList` from its `breadcrumbs`, which every subpage already passes.
  - Not built: `Offer`s or `Service` for `/esittelylennot` and `/koulutus`. Google shows no rich result for them, so they aren't worth the upkeep.

  **After deploy:** check `/` and `/kalusto/OH-CON` in the Rich Results Test.
- [x] **1.7 Sitemap dates and contents.** Each page has its own date in `app/sitemap.ts`, which is updated when the page's text changes (the skill's checklist says so). `/tiedotteet` gets the newest published bulletin's date. `/kerho/historiaa` and `/kerho/hallit` join once `FEATURE_PAGES_IN_REVIEW` is on, and the sitemap is rendered per request so that works without a rebuild. `changeFrequency` and `priority` are gone.
- [x] **1.8 Icons.** `metadata.icons` links the 16/32 PNGs and the apple-touch-icon, and `app/manifest.ts` lists the 192/512 PNGs. The broken, unused `public/favicons/site.webmanifest` is deleted.
- [x] **1.9 Checks in CI.** `e2e/seo.spec.ts` covers this instead of a separate workflow step, because the e2e suite already runs the production build in CI. It checks the sitemap's list, each page's title and description lengths, canonical, og: tags and uniqueness, and the JSON-LD. `tests/unit/seo.test.ts` covers the helper.

## Phase 2: speed (Core Web Vitals)

Page experience is a small ranking factor, but on mobile it is most of what visitors feel.

**Result.** Lighthouse, mobile, both columns measured the same way, on local production builds (2026-10-30):

| Page | Before (`dev`) | After |
|---|---|---|
| `/` | 54, LCP 7.5 s, 1513 kB | 97, LCP 1.7 s, 596 kB |
| `/esittelylennot` | 77, 5.9 s, 1099 kB | 97, 2.6 s, 358 kB |
| `/koulutus` | 77, 6.5 s, 6351 kB | 97, 2.6 s, 424 kB |
| `/kalusto/OH-CON` | 84, 4.3 s, 577 kB | 94, 2.9 s, 353 kB |
| `/kalusto` | 89, 3.7 s, 507 kB | 97, 2.6 s, 373 kB |
| `/kerho/hinnasto` | 81, 4.9 s, 819 kB | 97, 2.6 s, 385 kB |

- [x] **2.1 Shrink the images in `public/images/`.** `certificate_1.jpg`, `planning_1.jpg`, `planning_2.jpg` and `punkaharju_1.jpg` are now at most 2000 px, 170–400 kB each (they were 0.5–5 MB). The three phone photos were stored sideways with an EXIF rotation flag; the rotation is now applied to the pixels and the EXIF removed. The logo PNG went from 3380 px and 2.3 MB to 600 px and 77 kB, still 5× its largest use (120 px). `public/images` went from 19 MB to 3.1 MB. The old files stay in git history, which only costs clone size.
- [x] **2.2 Background photos through next/image.** `components/backdrop.tsx` renders them as `<Image fill sizes="100vw" quality={50}>`, so each screen gets a resized WebP. Quality 50 is about 30 % fewer bytes than 75 and doesn't show under the dark gradients. `PageHero`, `ContentSection`, `FeatureCard` and the full-height heroes of `/`, `/kerho` and the 404 page use it. Full-height heroes preload their photo, and everything else loads lazily. The `bg-*-one` CSS classes and their `url()` variables are gone, and `backgroundImage` props take a name from `BACKDROPS`. `next.config.js` allows the qualities 50 and 75.
- [x] **2.3 Find the LCP render delay.** It wasn't mainly the animation. The hero text actually painted after 0.1–0.2 s, but Lighthouse's simulated LCP counts every byte requested before that paint. CSS background photos are all requested at once, visible or not: 0.8–1.1 MB per page, and 6.3 MB on `/koulutus`. Removing them in an experiment took the home page from 8.0 s to 2.1 s. 2.1 and 2.2 fix the cause. The `animate-fade-in` on hero text (home, `/kerho`, `PageHero` titles) is also removed, since it held the home page's paint back by another 0.5 s. Next: once Search Console has data, compare with the real-user (CrUX) numbers, which are what Google ranks on.
- [ ] **2.4 Cacheable public pages** *(not needed now)*. Public pages render per request with `no-store` only because the root layout awaits `auth()` for the navbar. Giving the session to the navbar on the client would let public pages render statically, cut TTFB, re-enable the back/forward cache, and let Cloudflare cache them. Watch out: the feature flags are read per request on purpose (the prod image is built without them, see `utilities/features.ts`), so pages that read them must stay dynamic. 2.1–2.3 brought lab LCP to about 2.6 s or less on the pages measured above, so revisit this only if the field data in Search Console says LCP or TTFB is poor.
- [ ] **2.5 Lighthouse accessibility findings.** Done: `heading-order` (the "Kerhotiedotteet" sidebar on `/` is an `h2`, and the SPL/UPL cards on `/koulutus` are `h3`) and `target-size` (the gallery dots are 24 px buttons with Finnish labels). **Open, needs a design decision:** `color-contrast`. White on the brand red `sred` (#e84855) is 3.5:1, and the WCAG minimum for normal text is 4.5:1. That affects the red buttons, e.g. "Lähde esittelylennolle", and the blue `sbluel` badge on plane pages (4.4:1). Options are a darker red for buttons (#c62f3c gives 4.9:1), or bigger and bolder button text (3:1 is enough at 18.7 px bold).

## Phase 3: content (needs the club)

Small sites rank on being the best answer to a local question. These are the searches the site can win, and the page that should answer each:

| Search (Finnish) | Page |
|---|---|
| lentokoulutus Savonlinna, lentolupakirja Itä-Suomi, PPL koulutus Savonlinna | `/koulutus` |
| esittelylento Savonlinna, lentolahjakortti Savonlinna, lento lahjaksi | `/esittelylennot` |
| lentokerho Savonlinna, ilmailu Savonlinna | `/`, `/kerho` |
| purjelento Savonlinna | `/koulutus`, `/kalusto` |
| Savonlinnan lentoasema, EFSA | `/kerho/kentta` |
| hallipaikka Savonlinna, talvisäilytys Savonlinna (boats, caravans) | `/kerho/hallit` once it is published |

- [ ] **3.1 Thicken thin pages.** `/kerho` has 55 words, `/tiedotteet` 76 and `/kalusto` 113. Each needs a paragraph or two of real text. For `/kalusto`, that is what each plane is used for.
- [ ] **3.2 FAQ on koulutus and esittelylennot.** Esittelylennot already has questions; extend both with what people actually ask: price, length of training, age limits, the medical, what to bring, weather. Instructors should write or check the answers. Plain HTML; FAQ rich results are limited to government and health sites, so skip `FAQPage` markup.
- [ ] **3.3 Plane photos and texts.** Four of the six planes have no photo, and OH-386's description is "TBA". One good photo each, with alt text, also becomes the plane page's share image.
- [ ] **3.4 Publish Historiaa and Hallit** once the review in `GO_LIVE.md` is done. They are the most original content on the site, and Hallit answers a local search no other club page does.
- [ ] **3.5 Bulletins as pages** *(only if the club posts regularly)*. Give each published bulletin its own URL, `/tiedotteet/[id]-[slug]`, with its own title, description and `NewsArticle` JSON-LD. Then bulletins can be shared and found, and the sitemap shows fresh content.
- [ ] **3.6 English intro-flight page** *(ask the club)*. Summer visitors (the Opera Festival) search in English for things like "sightseeing flight Savonlinna". One English page, linked both ways with `hreflang`, would cover it.

## Phase 4: off-site (the club and the user)

For local searches, these matter more than anything in the code.

- [ ] **4.1 Google Business Profile** for Savonlinnan Lentokerho ry at the airport: category "flying club", the address and email exactly as in `data/contacts.json`, the website link, photos, and seasonal opening times if there are any. Ask members who have flown to leave reviews.
- [ ] **4.2 Same name, address and contacts everywhere:** the footer, `/yhteystiedot`, Google Business Profile, Facebook, Instagram, and the Suomen Ilmailuliitto club list. Today the footer only says "15 km Savonlinnasta Enonkoskelle päin"; add the street address.
- [ ] **4.3 Links from relevant sites:** Suomen Ilmailuliitto's club directory, Savonlinna city and Visit Savonlinna (intro flights as an activity), the fi.wikipedia article on Savonlinnan lentoasema, and partner flight schools. A few local, relevant links beat any number of directory listings.
- [ ] **4.4 Social profiles** link to the site, and to `/esittelylennot` in the intro-flight season.

## Keeping it up

- The `seo` skill applies the checklist whenever Claude changes a public page. Run `audit.ts` on the changed paths before a PR.
- Each spring, before the flying season: Search Console coverage and queries, a `lighthouse.ts` run on the main pages, and a check that the sitemap dates and prices are current.

## Order

0.1, phase 1 (except 1.5) and phase 2 went into one PR to `dev`, as separate commits. Next: 0.2 (the user), then 1.5 in its own PR with the user present, because it changes login. Phases 3 and 4 run in parallel, whenever the club has time.
