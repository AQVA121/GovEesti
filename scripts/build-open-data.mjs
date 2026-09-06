// Minimal open-data layer (BRIEF.md §8, Этап 8) — deliberately NOT the full
// DCAT/CSVW/OpenAPI/MCP apparatus removed in the Estonia fork (Этап 4): just
// a stable JSON metadata record and a tidy CSV per series, growable later
// without a core rewrite (see BRIEF.md §8's own framing).
//
// Emits, per series that departments.ts references:
//   dist/data/series/{id}.json      — id, title, unit, producer, compiler,
//                                      licence, validRange, revisionStatus,
//                                      sourceUrl, plus a few extra fields
//                                      (statisticType/geography/provenance/
//                                      freshness) that docs/conformance/
//                                      probe-15-lines.mjs already expects —
//                                      no separate schema to keep in sync.
//   dist/data/series/{id}/data.csv  — period,value,unit,status (tidy, one
//                                      observation per row)
//
// A series with no baked data (e.g. the Justiits placeholder) gets a JSON
// record honestly saying so and no CSV/`latest` field — never an empty or
// fabricated data file. Multi-line series (e.g. soc-life-expectancy) publish
// only their top-level "representative" line for now; per-line publishing is
// exactly the kind of thing this minimal layer can grow into later.
//
// Run AFTER `vite build` (writes into dist/, which must already exist).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Same env var and default as docs/conformance/probe-15-lines.mjs, so a
// local build can be probed before deploy (point both at the same base).
const DATA_BASE = process.env.GOVVIZ_DATA_BASE ?? "https://aqva121.github.io/GovEesti/data";
const OUT = "dist/data";

// --- Load the real department registry (single source of truth) -----------
let departments;
try {
  const out = await build({
    entryPoints: ["src/components/departments.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
  });
  const tmp = join(tmpdir(), `goveesti-departments-open-data-${process.pid}.mjs`);
  await writeFile(tmp, out.outputFiles[0].text, "utf8");
  const mod = await import(pathToFileURL(tmp).href);
  departments = mod.departments;
} catch (err) {
  console.warn("build-open-data: could not load registry, skipping:", err.message);
  process.exit(0);
}

// --- Load the CI-baked data (empty in git; populated by build-data.mjs) ---
// Same extraction trick as scripts/check-open-data.mjs: the generated file's
// right-hand side is plain JSON (build-data.mjs writes it via
// JSON.stringify), so this reads it directly rather than needing a TS loader.
function loadSeriesData() {
  const raw = readFileSync("src/generated/seriesData.ts", "utf8");
  const m = raw.match(/SERIES_DATA:\s*Record<[^=]*>\s*=\s*(\{[\s\S]*\});\s*$/);
  if (!m) throw new Error("could not locate the SERIES_DATA object literal");
  return JSON.parse(m[1]);
}
const SERIES_DATA = loadSeriesData();

// --- Per-producer licence lookup ------------------------------------------
// Working assumptions carried over from docs/INDICATORS-ee.md's "Licence
// confidence" notes, not a final per-source audit — that's BRIEF.md §7
// Этап 10's job. Matched by substring so "Statistikaamet (RR056 ...)" etc.
// still resolve.
const LICENCES = [
  [/eurostat/i, "CC BY 4.0 (Eurostat reuse policy)"],
  [/world bank/i, "CC BY 4.0 (World Bank Open Data)"],
  [/statistikaamet/i, "CC BY-SA 4.0 (search-confirmed, not yet read off a primary licence page — see DATA-LICENCE.md)"],
  [/tervise arengu instituut|tai\b/i, "Not formally named — TAI states free use with attribution requested (see DATA-LICENCE.md)"],
  [/ministry of justice/i, "Not stated on the source portal (see DATA-LICENCE.md)"],
  [/not yet identified/i, "N/A — no source"],
];
function licenceFor(producer) {
  for (const [re, licence] of LICENCES) if (re.test(producer)) return licence;
  return "Not yet audited (see DATA-LICENCE.md)";
}

// --- Freshness (mirrors src/components/data.ts's stalenessOf, duplicated in
// plain JS here since this script runs outside the Vite/TS toolchain) ------
const CADENCE_TOLERANCE_MONTHS = { monthly: 5, quarterly: 8, annual: 22 };
function freshnessOf(latestDate, cadence) {
  if (!latestDate) return { status: "unknown", monthsOld: null };
  const monthsOld = Math.max(
    0,
    Math.round((Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  const limit = CADENCE_TOLERANCE_MONTHS[cadence] ?? 22;
  return { status: monthsOld > limit ? "aged" : "fresh", monthsOld };
}

function seriesOf(d) {
  const seen = new Set();
  return [d.hero, ...d.core, ...(d.supporting ?? [])].filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

const csvEsc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

let written = 0;
for (const dept of departments) {
  for (const s of seriesOf(dept)) {
    const rec = SERIES_DATA[s.id];
    const points = rec?.points ?? [];
    const hasData = points.length > 0;
    const url = `${DATA_BASE}/series/${s.id}`;
    const { status: freshnessStatus, monthsOld } = freshnessOf(
      points.at(-1)?.date,
      s.cadence,
    );

    const json = {
      id: s.id,
      title: s.title,
      unit: s.unit,
      coverage: s.coverage ?? null,
      cadence: s.cadence,
      producer: s.producer,
      compiler: s.compiler,
      licence: licenceFor(s.producer),
      validRange: rec?.guard ?? null,
      revisionStatus: points.at(-1)?.status ?? "not specified by producer",
      sourceUrl: s.sourceUrl,
      // Fields docs/conformance/probe-15-lines.mjs already expects, so it has
      // something real to check against once this layer exists.
      statisticType: hasData ? "official statistics" : "not applicable — no source",
      geography: "EE",
      geographyLabel: s.coverage ?? "Estonia",
      provenance: { source: s.producer, upstreamUrl: s.sourceUrl },
      latest: hasData ? `${url}/data.csv` : null,
      latestFetchedAt: rec?.asOf ?? null,
      latestObservedPeriod: hasData ? points.at(-1).date : null,
      freshnessStatus: hasData ? freshnessStatus : "unknown",
      freshnessReason: hasData
        ? monthsOld != null
          ? `latest observation is ${monthsOld} month(s) old`
          : null
        : "no baked data yet",
    };

    await mkdir(`${OUT}/series/${s.id}`, { recursive: true });
    await writeFile(`${OUT}/series/${s.id}.json`, JSON.stringify(json, null, 2));

    if (hasData) {
      const rows = points.map(
        (p) => `${csvEsc(p.date.slice(0, 10))},${csvEsc(p.value)},${csvEsc(s.unit)},${csvEsc(p.status ?? "")}`,
      );
      const csv = ["period,value,unit,status", ...rows].join("\n") + "\n";
      await writeFile(`${OUT}/series/${s.id}/data.csv`, csv);
    }
    written++;
  }
}

console.log(`build-open-data: wrote ${written} series record(s) to ${OUT}/series/`);
