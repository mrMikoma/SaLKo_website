import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savonlinnan Lentokerho",
    short_name: "SaLKo",
    description:
      "Savonlinnan Lentokerho ry - Lentokoulutusta ja yleisilmailua Savonlinnassa",
    start_url: "/",
    display: "browser",
    background_color: "#0a1628",
    theme_color: "#1e3a5f",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
