// Guard / release-assurance gate (BRIEF.md §7, Этап 7): checks every series
// baked into src/generated/seriesData.ts against its own validRange guard,
// and FAILS THE BUILD (exit 1) if any value is outside it, or if a series
// was baked with no guard at all. This is the "a wrong-but-resolving fetch
// can't ship silently" property from CLAUDE.md's hard rule, enforced as an
// explicit, independent check — not just relying on build-data.mjs's own
// in-loop filtering (which drops/rejects bad values at fetch time, but
// nothing previously re-verified that after the fact).
//
// Deliberately scoped to what exists today: reads seriesData.ts directly, no
// dependency on dist/data/* (that "minimal open-data layer" is Этап 8, not
// built yet). Rewritten 2026-09-06 — the previous version validated against
// docs/conformance/ai-ready-series.schema.json and dist/data/catalog.json,
// both produced by the full DCAT/CSVW/MCP apparatus removed in the Estonia
// fork (Этап 4); that heavier shape may be worth restoring pieces of once
// Этап 8 exists, but the core validRange guard doesn't need to wait for it.
//
// An empty seriesData.ts (local dev, no CI fetch) passes trivially — 0
// series checked, 0 violations — so this is safe to run unconditionally as
// part of `npm run build`.

import { readFileSync } from "node:fs";

const PATH = "src/generated/seriesData.ts";

function loadSeriesData() {
  const raw = readFileSync(PATH, "utf8");
  // build-data.mjs writes this file as `export const SERIES_DATA: Record<...> =
  // ${JSON.stringify(out, null, 2)};` — the right-hand side is plain JSON, so
  // extract and parse it rather than needing a TS loader for one file.
  const m = raw.match(/SERIES_DATA:\s*Record<[^=]*>\s*=\s*(\{[\s\S]*\});\s*$/);
  if (!m) throw new Error(`${PATH}: could not locate the SERIES_DATA object literal — has the generator's output shape changed?`);
  return JSON.parse(m[1]);
}

function checkPoints(id, label, points, guard, errors) {
  if (!guard) {
    errors.push(`${id}${label}: baked with no validRange guard — every SOURCES entry in scripts/build-data.mjs must declare min/max`);
    return;
  }
  for (const p of points ?? []) {
    if (!(p.value >= guard.min && p.value <= guard.max)) {
      errors.push(`${id}${label}: value ${p.value} at ${p.date} outside its own guard [${guard.min}, ${guard.max}]`);
    }
  }
}

const SERIES_DATA = loadSeriesData();
const ids = Object.keys(SERIES_DATA);
const errors = [];

for (const id of ids) {
  const rec = SERIES_DATA[id];
  if (rec.points) checkPoints(id, "", rec.points, rec.guard, errors);
  // Each line's OWN guard (baked alongside it — see build-data.mjs) is what
  // that line was actually fetch-time-validated against; fall back to the
  // record-level guard only if a line has none of its own (defensive, not
  // currently hit by any GovEesti series).
  for (const line of rec.lines ?? []) checkPoints(id, `:${line.id}`, line.points, line.guard ?? rec.guard, errors);
}

if (errors.length) {
  console.error(`check-open-data: FAILED — ${errors.length} guard violation(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(`check-open-data: OK — ${ids.length} series checked, every point within its declared validRange guard.`);
