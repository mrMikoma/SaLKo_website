import { describe, expect, test } from "bun:test";
import planes from "@/data/planes.json";
import { DEFAULT_SHARE_IMAGE, pageMetadata, summarize } from "@/utilities/seo";

describe("a public page's metadata", () => {
  const metadata = pageMetadata({
    title: "Hinnasto – lentotunnit ja jäsenmaksut",
    description: "Savonlinnan Lentokerhon hinnasto: jäsenmaksut, kalustomaksu ja lentokoneiden tuntihinnat.",
    path: "/kerho/hinnasto",
  });

  test("has its own canonical URL and link preview", () => {
    expect(metadata.title).toBe("Hinnasto – lentotunnit ja jäsenmaksut");
    expect(metadata.alternates?.canonical).toBe("/kerho/hinnasto");
    expect(metadata.openGraph).toMatchObject({
      title: "Hinnasto – lentotunnit ja jäsenmaksut",
      description: metadata.description,
      url: "/kerho/hinnasto",
      siteName: "Savonlinnan Lentokerho",
      locale: "fi_FI",
      images: [DEFAULT_SHARE_IMAGE],
    });
  });

  test("skips the layout's title template on the front page", () => {
    const front = pageMetadata({ title: "Savonlinnan Lentokerho", absoluteTitle: true, description: "x", path: "/" });
    expect(front.title).toEqual({ absolute: "Savonlinnan Lentokerho" });
  });
});

describe("a meta description from a longer text", () => {
  test("is the text itself when it fits", () => {
    expect(summarize("  Lyhyt   teksti.  ")).toBe("Lyhyt teksti.");
  });

  test("ends at a whole sentence", () => {
    const text = "Ensimmäinen lause kertoo koneesta jotain olennaista ja on melko pitkä. " +
      "Toinen lause jatkaa kuvausta lisätiedoilla koneen historiasta. " +
      "Kolmas lause ei enää mahdu kuvaukseen, koska se on aivan liian pitkä mahtuakseen mukaan.";
    expect(summarize(text)).toBe(
      "Ensimmäinen lause kertoo koneesta jotain olennaista ja on melko pitkä. Toinen lause jatkaa kuvausta lisätiedoilla koneen historiasta."
    );
  });

  test("is cut at a word when the first sentence is too long", () => {
    const summary = summarize("sana ".repeat(60) + "loppu.");
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith("sana…")).toBe(true);
  });

  test("doesn't end a sentence at an initial or inside a date", () => {
    const text = "Konetyyppi lensi ensilentonsa 13.4.1979 Bielsko-Białassa Puolassa. " +
      "Sen kehitti W. Okarmus. " +
      "Viimeinen lause on niin pitkä, ettei se enää mahdu mukaan kuvaukseen, vaan jää kokonaan pois tekstistä.";
    expect(summarize(text)).toBe(
      "Konetyyppi lensi ensilentonsa 13.4.1979 Bielsko-Białassa Puolassa. Sen kehitti W. Okarmus."
    );
  });

  test("fits every plane's description", () => {
    for (const plane of planes) {
      const summary = summarize(plane.description);
      expect(summary.length).toBeLessThanOrEqual(160);
    }
  });
});
