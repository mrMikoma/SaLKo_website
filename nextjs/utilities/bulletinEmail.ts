import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * A bulletin as an email: the Markdown the admin wrote as HTML (the same
 * dialect as the site, bulletinRemarkPlugins) and as the plain text it
 * already is. Raw HTML in the Markdown is dropped and the HTML is sanitized,
 * so a bulletin can't put scripts or odd links into members' inboxes.
 */

export interface BulletinForEmail {
  title: string;
  content: string;
}

export interface BulletinEmailContext {
  bulletinUrl: string; // the bulletin on the website
  profileUrl: string; // where a member turns bulletin emails off
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify);

// Mail clients ignore style sheets, so the few elements a bulletin has are styled in place
const STYLES: Record<string, string> = {
  p: "margin:0 0 12px",
  h2: "font-size:18px;margin:20px 0 6px",
  h3: "font-size:16px;margin:16px 0 4px",
  ul: "margin:0 0 12px;padding-left:22px",
  ol: "margin:0 0 12px;padding-left:22px",
  a: "color:#1d4ed8",
  hr: "border:0;border-top:1px solid #d1d5db;margin:16px 0",
};

function styled(html: string): string {
  return html.replace(/<(p|h2|h3|ul|ol|a|hr)([\s>/])/g, (_match, tag: string, rest: string) => {
    return `<${tag} style="${STYLES[tag]}"${rest}`;
  });
}

export function renderBulletinEmail(bulletin: BulletinForEmail, context: BulletinEmailContext) {
  const subject = bulletin.title.replace(/\s+/g, " ").trim();
  const body = styled(String(processor.processSync(bulletin.content)));

  const text = [
    bulletin.title,
    "",
    bulletin.content,
    "",
    "--",
    `Tiedote kerhon sivuilla: ${context.bulletinUrl}`,
    `Saat tämän viestin, koska olet Savonlinnan Lentokerhon jäsen. Voit lopettaa tiedotteiden saamisen sähköpostina profiilisivulla: ${context.profileUrl}`,
  ].join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:640px">
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(bulletin.title)}</h1>
${body}
<hr style="border:0;border-top:1px solid #d1d5db;margin:24px 0 12px">
<p style="font-size:13px;color:#4b5563;margin:0 0 4px"><a href="${escapeHtml(context.bulletinUrl)}" style="color:#1d4ed8">Tiedote kerhon sivuilla</a></p>
<p style="font-size:13px;color:#4b5563;margin:0">Saat tämän viestin, koska olet Savonlinnan Lentokerhon jäsen. Voit lopettaa tiedotteiden saamisen sähköpostina <a href="${escapeHtml(context.profileUrl)}" style="color:#1d4ed8">profiilisivulla</a>.</p>
</div>`;

  return { subject, text, html };
}
