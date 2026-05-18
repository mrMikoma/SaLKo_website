import type { MetadataRoute } from "next";
import planeData from "@/data/planes.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://savonlinnanlentokerho.fi";

  const planePaths: MetadataRoute.Sitemap = planeData.map((plane) => ({
    url: `${baseUrl}/kalusto/${plane.registeration}`,
    lastModified: new Date("2026-01-01"),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/koulutus`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/esittelylennot`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/kalusto`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/yhteystiedot`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kerho`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kerho/hinnasto`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kerho/jasenyys`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kerho/kentta`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    //...planePaths,
  ];
}
