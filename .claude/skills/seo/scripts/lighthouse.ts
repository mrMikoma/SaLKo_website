// Lighthouse run (mobile by default) of one or more pages, with a short summary:
// category scores, Core Web Vitals, the LCP element, the heaviest images and
// failed requests. Uses the Chromium that Playwright installed.
//
//   bun .claude/skills/seo/scripts/lighthouse.ts <url>... [--desktop]
//
// Reports are saved as JSON under $TMPDIR/salko-lighthouse/. Against
// `bun dev` the numbers are meaningless; build and run `bun run start`, or
// test the deployed site.

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const desktop = args.includes("--desktop");
const urls = args.filter((a) => !a.startsWith("--"));
if (urls.length === 0) {
  console.error("usage: lighthouse.ts <url>... [--desktop]");
  process.exit(2);
}

function findChrome(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = join(homedir(), ".cache", "ms-playwright");
  const builds = existsSync(root) ? readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort() : [];
  for (const build of builds.reverse()) {
    for (const dir of ["chrome-linux64", "chrome-linux"]) {
      const chrome = join(root, build, dir, "chrome");
      if (existsSync(chrome)) return chrome;
    }
  }
  throw new Error("No Chromium found: run `bunx --no-install playwright install chromium` in nextjs/, or set CHROME_PATH");
}

type Audit = {
  score: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  details?: { items?: Record<string, unknown>[] };
};
type Report = {
  categories: Record<string, { score: number | null; auditRefs: { id: string }[] }>;
  audits: Record<string, Audit>;
};

const outDir = join(tmpdir(), "salko-lighthouse");
mkdirSync(outDir, { recursive: true });
const chrome = findChrome();

for (const url of urls) {
  const name = new URL(url).pathname.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "home";
  const out = join(outDir, `${name}${desktop ? "-desktop" : ""}.json`);
  const run = Bun.spawnSync(
    [
      "npx", "-y", "lighthouse@12", url, "--quiet", "--output=json", `--output-path=${out}`,
      "--chrome-flags=--headless=new --no-sandbox",
      "--only-categories=performance,seo,accessibility,best-practices",
      ...(desktop ? ["--preset=desktop"] : []),
    ],
    { env: { ...process.env, CHROME_PATH: chrome }, stdout: "ignore", stderr: "pipe" },
  );
  if (run.exitCode !== 0) {
    console.error(`${url}: lighthouse failed\n${run.stderr.toString().split("\n").slice(-5).join("\n")}`);
    continue;
  }

  const { categories, audits }: Report = JSON.parse(readFileSync(out, "utf8"));
  const scores = Object.entries(categories).map(([k, v]) => `${k} ${Math.round((v.score ?? 0) * 100)}`);
  console.log(`\n${url} (${desktop ? "desktop" : "mobile"}): ${scores.join(", ")}`);

  const metrics = {
    FCP: "first-contentful-paint",
    LCP: "largest-contentful-paint",
    CLS: "cumulative-layout-shift",
    TBT: "total-blocking-time",
    TTFB: "server-response-time",
    weight: "total-byte-weight",
  };
  console.log("  " + Object.entries(metrics).map(([k, id]) => `${k} ${audits[id]?.displayValue ?? "-"}`).join(" | "));

  const lcp = audits["largest-contentful-paint-element"]?.details?.items ?? [];
  const node = (lcp[0] as { items?: { node?: { snippet?: string } }[] })?.items?.[0]?.node?.snippet;
  if (node) console.log(`  LCP element: ${node.replace(/\s+/g, " ").slice(0, 140)}`);
  const phases = (lcp[1] as { items?: { phase: string; timing: number }[] })?.items ?? [];
  if (phases.length) console.log("  LCP phases: " + phases.map((p) => `${p.phase} ${Math.round(p.timing)} ms`).join(", "));

  const images = (audits["modern-image-formats"]?.details?.items ?? []) as { url: string; totalBytes: number }[];
  if (images.length) {
    console.log("  Heavy images: " + images.slice(0, 5).map((i) => `${decodeURIComponent(i.url.split("/").pop())} ${Math.round(i.totalBytes / 1024)} kB`).join(", "));
  }

  const failed = ((audits["network-requests"]?.details?.items ?? []) as { url: string; statusCode: number }[])
    .filter((r) => r.statusCode >= 400);
  for (const r of failed) console.log(`  Failed request: ${r.statusCode} ${r.url}`);

  for (const [category, { auditRefs }] of Object.entries(categories)) {
    const failing = auditRefs
      .map((r) => [r.id, audits[r.id]] as const)
      .filter(([, a]) => a.score !== null && a.score < 0.9 && !["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode ?? ""));
    if (failing.length) console.log(`  ${category}: ` + failing.map(([id, a]) => (a.displayValue ? `${id} (${a.displayValue})` : id)).join(", "));
  }
  console.log(`  Report: ${out}`);
}
