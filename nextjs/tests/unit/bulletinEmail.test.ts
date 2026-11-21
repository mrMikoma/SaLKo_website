import { describe, expect, test } from "bun:test";
import { renderBulletinEmail } from "@/utilities/bulletinEmail";

const context = {
  bulletinUrl: "https://savonlinnanlentokerho.fi/tiedotteet",
  profileUrl: "https://savonlinnanlentokerho.fi/jasenalue/profiili",
};

describe("a bulletin as an email", () => {
  test("keeps the Markdown as the plain text and adds the links", () => {
    const { subject, text } = renderBulletinEmail({ title: "Kevään  kokous", content: "**Tervetuloa**\n- kahvit" }, context);
    expect(subject).toBe("Kevään kokous");
    expect(text).toContain("**Tervetuloa**\n- kahvit");
    expect(text).toContain(context.bulletinUrl);
    expect(text).toContain(context.profileUrl);
  });

  test("renders Markdown as HTML, line breaks too", () => {
    const { html } = renderBulletinEmail({ title: "T", content: "## Otsikko\nrivi 1\nrivi 2\n\n- yksi\n- kaksi" }, context);
    expect(html).toContain("<h2");
    expect(html).toContain("rivi 1<br>");
    expect(html).toContain("<li>yksi</li>");
    expect(html).toContain('<a href="https://savonlinnanlentokerho.fi/jasenalue/profiili"');
  });

  test("escapes the title and drops scripts, raw HTML and script links", () => {
    const { html } = renderBulletinEmail(
      {
        title: '<b>"hei"</b>',
        content: '<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[klikkaa](javascript:alert(1)) [ok](https://example.fi)',
      },
      context
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;b&gt;&quot;hei&quot;&lt;/b&gt;");
    expect(html).toContain('href="https://example.fi"');
  });
});
