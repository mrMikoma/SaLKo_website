// On-page SEO audit of the SaLKo site: reads robots.txt and the sitemap from a
// base URL, fetches every page in the sitemap (or the paths given) from the
// same base, and checks the tags search engines and link previews read.
//
//   bun .claude/skills/seo/scripts/audit.ts [base] [--paths /a,/b] [--json]
//
// base defaults to https://savonlinnanlentokerho.fi. A local server works too
// (http://localhost:3000): the sitemap lists production URLs, so only their
// paths are used. Exits with 1 when an error is found.

const SITE = "https://savonlinnanlentokerho.fi";
const UA = "Mozilla/5.0 (compatible; SaLKo-SEO-audit/1.0)";

type Severity = "error" | "warn" | "info";
type Issue = { path: string; severity: Severity; message: string };

type PageTags = {
  path: string;
  status: number;
  redirectedTo?: string;
  xRobots?: string;
  lang?: string;
  title?: string;
  description?: string;
  robots?: string;
  canonical?: string;
  og: Record<string, string>;
  twitter: Record<string, string>;
  h1: number;
  imgsWithoutAlt: number;
  jsonLd: string[];
};

const args = process.argv.slice(2);
const json = args.includes("--json");
const pathsIndex = args.indexOf("--paths");
const givenPaths = pathsIndex >= 0 ? args[pathsIndex + 1]?.split(",") : undefined;
const base = (args.find((a, i) => !a.startsWith("--") && (pathsIndex < 0 || i !== pathsIndex + 1)) ?? SITE).replace(/\/$/, "");

const issues: Issue[] = [];
const report = (path: string, severity: Severity, message: string) => issues.push({ path, severity, message });

async function get(url: string, method = "GET") {
  return fetch(url, { method, redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
}

async function readSitemapPaths(): Promise<string[]> {
  const robots = await get(`${base}/robots.txt`);
  const robotsText = robots.ok ? await robots.text() : "";
  if (!robots.ok) report("/robots.txt", "error", `robots.txt returned ${robots.status}`);
  if (/^Disallow:\s*\/\s*$/im.test(robotsText)) {
    report("/robots.txt", "info", "Disallow: / (expected outside production, ALLOW_INDEXING is not true)");
  } else if (!/^Sitemap:/im.test(robotsText)) {
    report("/robots.txt", "warn", "no Sitemap: line");
  }

  const sitemap = await get(`${base}/sitemap.xml`);
  if (!sitemap.ok) {
    report("/sitemap.xml", "error", `sitemap.xml returned ${sitemap.status}`);
    return ["/"];
  }
  const locs = [...(await sitemap.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    if (!loc.startsWith(SITE)) report("/sitemap.xml", "warn", `URL outside ${SITE}: ${loc}`);
  }
  return locs.map((loc) => new URL(loc).pathname);
}

async function readPage(path: string): Promise<PageTags> {
  const res = await get(base + path);
  const page: PageTags = { path, status: res.status, og: {}, twitter: {}, h1: 0, imgsWithoutAlt: 0, jsonLd: [] };
  page.xRobots = res.headers.get("x-robots-tag") ?? undefined;
  if (res.status >= 300 && res.status < 400) {
    page.redirectedTo = res.headers.get("location") ?? undefined;
    return page;
  }

  let title = "";
  let script = "";
  // Next may stream metadata into <body> for clients that run JavaScript,
  // so the whole document is read, not only <head>
  const rewriter = new HTMLRewriter()
    .on("html", { element: (e) => void (page.lang = e.getAttribute("lang") ?? undefined) })
    .on("title", {
      text: (t) => {
        if (page.title === undefined) title += t.text;
        if (t.lastInTextNode && page.title === undefined) page.title = title.trim();
      },
    })
    .on("meta", {
      element: (e) => {
        const key = e.getAttribute("name") ?? e.getAttribute("property") ?? "";
        const content = e.getAttribute("content") ?? "";
        if (key === "description") page.description ??= content;
        else if (key === "robots") page.robots ??= content;
        else if (key.startsWith("og:")) page.og[key.slice(3)] ??= content;
        else if (key.startsWith("twitter:")) page.twitter[key.slice(8)] ??= content;
      },
    })
    .on('link[rel="canonical"]', { element: (e) => void (page.canonical ??= e.getAttribute("href") ?? undefined) })
    .on("h1", { element: () => void page.h1++ })
    .on("img", { element: (e) => void (e.hasAttribute("alt") || page.imgsWithoutAlt++) })
    .on('script[type="application/ld+json"]', {
      text: (t) => {
        script += t.text;
        if (t.lastInTextNode) {
          page.jsonLd.push(script);
          script = "";
        }
      },
    });
  await rewriter.transform(res).text();
  return page;
}

function samePath(a: string, b: string) {
  const strip = (s: string) => decodeURIComponent(s).replace(/\/$/, "") || "/";
  return strip(a) === strip(b);
}

function check(page: PageTags) {
  const { path } = page;
  if (page.redirectedTo) {
    report(path, "warn", `redirects (${page.status}) to ${page.redirectedTo}; list the final URL in the sitemap`);
    return;
  }
  if (page.status !== 200) {
    report(path, "error", `status ${page.status}`);
    return;
  }
  const noindex = [page.robots, page.xRobots].some((v) => v && /noindex/i.test(v));
  if (noindex) report(path, "error", `noindex (meta: ${page.robots ?? "-"}, header: ${page.xRobots ?? "-"})`);
  if (page.lang !== "fi") report(path, "warn", `<html lang="${page.lang ?? ""}">, expected fi`);

  if (!page.title) report(path, "error", "no <title>");
  else if (page.title.length > 60) report(path, "warn", `title is ${page.title.length} chars (> 60, gets cut): ${page.title}`);
  else if (page.title.length < 20) report(path, "warn", `title is short (${page.title.length} chars): ${page.title}`);

  if (!page.description) report(path, "error", "no meta description");
  else if (page.description.length < 70 || page.description.length > 160) {
    report(path, "warn", `description is ${page.description.length} chars (aim for 70–160)`);
  }

  if (!page.canonical) report(path, "error", "no canonical link");
  else {
    const canonical = new URL(page.canonical, SITE);
    if (canonical.origin !== SITE) report(path, "error", `canonical on another origin: ${page.canonical}`);
    else if (!samePath(canonical.pathname, path)) report(path, "warn", `canonical points elsewhere: ${page.canonical}`);
  }

  for (const key of ["title", "description", "url", "image"]) {
    if (!page.og[key]) report(path, "warn", `no og:${key}`);
  }
  if (page.og.url && page.canonical && page.og.url !== page.canonical) {
    report(path, "warn", `og:url ${page.og.url} differs from canonical ${page.canonical}`);
  }

  if (page.h1 !== 1) report(path, "warn", `${page.h1} <h1> elements, expected 1`);
  if (page.imgsWithoutAlt > 0) report(path, "warn", `${page.imgsWithoutAlt} <img> without an alt attribute`);

  if (page.jsonLd.length === 0) report(path, "info", "no JSON-LD");
  for (const block of page.jsonLd) {
    try {
      const data = JSON.parse(block);
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      report(path, "info", `JSON-LD: ${items.map((i: { "@type"?: string }) => i["@type"]).join(", ")}`);
    } catch {
      report(path, "error", "JSON-LD that does not parse");
    }
  }
}

function checkDuplicates(pages: PageTags[]) {
  const fields: [string, (p: PageTags) => string | undefined][] = [
    ["title", (p) => p.title],
    ["description", (p) => p.description],
    ["og:title", (p) => p.og.title],
    ["og:description", (p) => p.og.description],
  ];
  for (const [name, value] of fields) {
    const byValue = new Map<string, string[]>();
    for (const page of pages) {
      const v = value(page);
      if (v) byValue.set(v, [...(byValue.get(v) ?? []), page.path]);
    }
    for (const [v, paths] of byValue) {
      if (paths.length > 1) report(paths.join(" "), "warn", `same ${name} on ${paths.length} pages: "${v.slice(0, 70)}"`);
    }
  }
}

async function checkImages(pages: PageTags[]) {
  const images = new Set(pages.map((p) => p.og.image).filter(Boolean));
  for (const image of images) {
    const url = new URL(image, SITE);
    const res = await get(base + url.pathname + url.search, "HEAD");
    const bytes = Number(res.headers.get("content-length") ?? 0);
    if (!res.ok) report(url.pathname, "error", `og:image returned ${res.status}`);
    else if (bytes > 1_000_000) report(url.pathname, "warn", `og:image is ${(bytes / 1e6).toFixed(1)} MB (keep it under ~300 kB, 1200×630)`);
  }
}

const paths = givenPaths ?? (await readSitemapPaths());
const pages: PageTags[] = [];
for (const path of paths) {
  try {
    pages.push(await readPage(path));
  } catch (error) {
    report(path, "error", `fetch failed: ${error instanceof Error ? error.message : error}`);
  }
}
pages.forEach(check);
checkDuplicates(pages.filter((p) => p.status === 200));
await checkImages(pages);

if (json) {
  console.log(JSON.stringify({ base, pages, issues }, null, 2));
} else {
  console.log(`SEO audit of ${base}: ${pages.length} pages\n`);
  for (const p of pages) {
    console.log(`${String(p.status).padEnd(4)}${p.path.padEnd(28)}${p.title ?? ""}`);
  }
  for (const severity of ["error", "warn", "info"] as Severity[]) {
    const found = issues.filter((i) => i.severity === severity);
    if (found.length === 0) continue;
    console.log(`\n${severity.toUpperCase()} (${found.length})`);
    for (const i of found) console.log(`  ${i.path}: ${i.message}`);
  }
}
process.exit(issues.some((i) => i.severity === "error") ? 1 : 0);
