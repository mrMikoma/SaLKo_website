import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Use ALLOW_INDEXING env var to control robots behavior
  // Set ALLOW_INDEXING=true in production environment only
  const allowIndexing = process.env.ALLOW_INDEXING === "true" ? true : false;

  if (allowIndexing) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/jasenalue/", "/api/"],
      },
      sitemap: "https://savonlinnanlentokerho.fi/sitemap.xml",
    };
  }

  // Development/staging - block all crawlers
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
