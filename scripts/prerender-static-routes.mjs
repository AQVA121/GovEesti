// Post-build prerender for top-level SPA routes that must be readable without
// JavaScript. This uses the built Vite shell so browsers still hydrate the app,
// while direct fetches of /overview and /about return HTTP 200 with meaningful
// static content inside #root.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const SITE = "https://aqva121.github.io/GovEesti";
const MODIFIED = new Date().toISOString().slice(0, 10);

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

let shell;
try {
  shell = await readFile("dist/index.html", "utf8");
} catch {
  console.warn("prerender-static-routes: dist/index.html not found, skipping.");
  process.exit(0);
}

function replaceTag(html, re, replacement, label, route) {
  if (!re.test(html)) {
    console.warn(`prerender-static-routes: ${route}: no match for ${label}`);
    return html;
  }
  return html.replace(re, replacement);
}

function page({ route, title, description, canonical, jsonld, body }) {
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?>/,
    `<meta name="description" content="${esc(description)}" />`,
    "description",
    route,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"[\s\S]*?>/,
    `<meta property="og:title" content="${esc(title)}" />`,
    "og:title",
    route,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?>/,
    `<meta property="og:description" content="${esc(description)}" />`,
    "og:description",
    route,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"[\s\S]*?>/,
    `<meta property="og:url" content="${canonical}" />`,
    "og:url",
    route,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"[\s\S]*?>/,
    `<link rel="canonical" href="${canonical}" />`,
    "canonical",
    route,
  );
  html = html
    .replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n</head>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return html;
}

const staticCss =
  "max-width:62rem;margin:0 auto;padding:2rem 1.25rem 4rem;font:16px/1.65 Inter,system-ui,sans-serif;color:#e7e9ee";
const muted = "color:#9aa3b2";
const link = "color:#8ab4ff";

const overviewDescription =
  "Whole-of-government view of long-run Estonian ministry performance indicators.";
const overviewJsonld = [
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "GovEesti whole-of-government performance overview",
    description: overviewDescription,
    url: `${SITE}/overview`,
    inLanguage: "en",
    isAccessibleForFree: true,
    dateModified: MODIFIED,
    creator: { "@type": "Organization", name: "GovEesti", url: SITE },
    spatialCoverage: { "@type": "Place", name: "Estonia" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whole of government",
    url: `${SITE}/overview`,
    isPartOf: { "@type": "WebSite", name: "GovEesti", url: SITE },
  },
];
const overviewBody = `<main style="${staticCss}">
<nav style="font-size:.8rem;${muted}"><a href="${SITE}/" style="${link}">GovEesti</a> / Whole of government</nav>
<h1 style="font-size:2rem;font-weight:650;margin:.5rem 0">Whole of government</h1>
<p style="${muted};max-width:46rem">Every tracked indicator at a glance. GovEesti groups long-run Estonian ministry performance measures by ministry, scores them against published targets where available, and marks stale or uncertain evidence instead of hiding it.</p>
<p style="font-size:.85rem;${muted}">Interactive charts, modals and drill-down routes hydrate from this same page shell when JavaScript is available. Source: <a href="https://github.com/AQVA121/GovEesti" style="${link}">github.com/AQVA121/GovEesti</a>.</p>
</main>`;

const aboutDescription =
  "How GovEesti sources, validates and presents Estonian government performance data.";
const aboutJsonld = [
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "How GovEesti is built",
    name: "How GovEesti is built",
    description: aboutDescription,
    url: `${SITE}/about`,
    inLanguage: "en",
    dateModified: MODIFIED,
    author: { "@type": "Organization", name: "GovEesti", url: SITE },
    about: ["Open data", "Estonian government statistics"].map((name) => ({
      "@type": "Thing",
      name,
    })),
  },
];
const aboutBody = `<main style="${staticCss}">
<nav style="font-size:.8rem;${muted}"><a href="${SITE}/" style="${link}">GovEesti</a> / About</nav>
<h1 style="font-size:2rem;font-weight:650;margin:.5rem 0">How GovEesti is built</h1>
<p style="${muted};max-width:46rem">GovEesti is a static dashboard of long-run Estonian government performance indicators, forked from <a href="https://github.com/Egly443/Govviz" style="${link}">Govviz</a> (UK). Its production build is designed around real official data, visible provenance, guard-range validation and explicit freshness limits.</p>
<section>
  <h2 style="font-size:1.15rem;margin:1.6rem 0 .4rem">Methodology in brief</h2>
  <ul>
    <li>Every charted series is fetched from a public source such as Statistikaamet, Eurostat, TAI or the World Bank.</li>
    <li>Each series records provenance, coverage, measurement basis, caveats and the source file used by the build.</li>
    <li>Guard ranges reject wrong-but-plausible values before they can ship.</li>
    <li>Stale or missing evidence is labelled instead of replaced with invented data.</li>
  </ul>
</section>
<p style="font-size:.85rem;${muted}">This static page hydrates into the full React route for browsers with JavaScript enabled.</p>
</main>`;

const pages = [
  {
    dir: "dist/overview",
    html: page({
      route: "overview",
      title: "Whole of government - GovEesti",
      description: overviewDescription,
      canonical: `${SITE}/overview`,
      jsonld: overviewJsonld,
      body: overviewBody,
    }),
  },
  {
    dir: "dist/about",
    html: page({
      route: "about",
      title: "How GovEesti is built - GovEesti",
      description: aboutDescription,
      canonical: `${SITE}/about`,
      jsonld: aboutJsonld,
      body: aboutBody,
    }),
  },
];

for (const p of pages) {
  await mkdir(p.dir, { recursive: true });
  await writeFile(`${p.dir}/index.html`, p.html, "utf8");
}

console.log("prerendered dist/overview/index.html and dist/about/index.html");
