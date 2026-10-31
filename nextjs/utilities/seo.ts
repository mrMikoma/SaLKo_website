import type { Metadata } from "next";
import contactsData from "@/data/contacts.json";

// Search engine and link preview helpers. The checklist for public pages is in
// .claude/skills/seo/SKILL.md, the plan in docs/SEO_PLAN.md.

// The production origin. app/layout.tsx sets it as metadataBase, so relative
// URLs in metadata become absolute on it in every environment.
export const SITE_URL = "https://savonlinnanlentokerho.fi";
export const SITE_NAME = "Savonlinnan Lentokerho";

export type ShareImage = { url: string; width?: number; height?: number; alt: string };

// OH-CON above the clouds with the club logo, 1200×630
export const DEFAULT_SHARE_IMAGE: ShareImage = {
  url: "/images/og/salko.jpg",
  width: 1200,
  height: 630,
  alt: "Savonlinnan Lentokerhon Cessna 172 OH-CON lennossa pilvien yllä",
};

type PageMetadataOptions = {
  // The layout's template adds " | SaLKo"; keep the whole under 60 characters
  title: string;
  // For app/page.tsx, which the template doesn't reach
  absoluteTitle?: boolean;
  // 70–160 characters
  description: string;
  // The page's own path, e.g. "/kerho/hinnasto": canonical URL and og:url
  path: string;
  image?: ShareImage;
};

// Metadata for a public page. Next merges metadata shallowly, so a page's
// openGraph replaces the layout's whole object; every field is set here.
// Next copies the title, description and image into the twitter: tags.
export function pageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  image = DEFAULT_SHARE_IMAGE,
}: PageMetadataOptions): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "fi_FI",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [image],
    },
  };
}

// Whole sentences from the start of a text that fit in a meta description,
// or the text cut at a word when even the first sentence is too long
export function summarize(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  // A sentence ends at . ! or ? before a space and a capital letter or digit,
  // but not after an initial ("kehitti W. Okarmus"); dates like 13.4.1979
  // have no space inside
  const sentences = clean.split(/(?<![\s(][A-ZÅÄÖ]\.)(?<=[.!?])\s+(?=[A-ZÅÄÖ0-9])/);
  let summary = "";
  for (const sentence of sentences) {
    const longer = summary ? `${summary} ${sentence}` : sentence;
    if (longer.length > max) break;
    summary = longer;
  }
  if (summary.length >= 70) return summary;

  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:–-]+$/, "") + "…";
}

const { general } = contactsData;

// schema.org data for the home page: the club as a local sports club at the
// airport, and the site's name for search results
export const clubJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SportsClub",
      "@id": `${SITE_URL}/#club`,
      name: "Savonlinnan Lentokerho ry",
      alternateName: "SaLKo",
      description:
        "Vuonna 1962 perustettu yleisilmailun harrastustoimintaan ja koulutukseen keskittynyt ilmailuyhdistys Savonlinnan lentoasemalla.",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/favicons/android-chrome-512x512.png`,
      image: `${SITE_URL}${DEFAULT_SHARE_IMAGE.url}`,
      foundingDate: "1962",
      email: general.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: general.address,
        postalCode: general.postalCode,
        addressLocality: general.city,
        addressCountry: "FI",
      },
      // Savonlinna airport (EFSA), as on /kerho/kentta
      geo: { "@type": "GeoCoordinates", latitude: 61.9444, longitude: 28.9347 },
      sameAs: [
        "https://www.facebook.com/savonlinnanlentokerho",
        "https://www.instagram.com/savonlinnanlentokerho/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ["SaLKo", "Savonlinnan Lentokerho ry"],
      inLanguage: "fi",
      publisher: { "@id": `${SITE_URL}/#club` },
    },
  ],
};
