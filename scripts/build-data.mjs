// Fetches official statistics and bakes them into src/generated/seriesData.ts.
//
// Runs in CI (which has internet) before `vite build`. Each source is isolated
// in try/catch and the script NEVER fails the build — any source that errors is
// skipped and the app renders its honest "no source yet" placeholder for that
// series (never a fabricated/illustrative fallback — see CLAUDE.md's hard
// rule). The repo commits an EMPTY object, so no datasets live in git; CI
// overwrites this file for the production build only.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const OUT = "src/generated/seriesData.ts";

// --- Source-bytes lineage (review item 1) -------------------------------------
// Hash the raw bytes of every successful response, keyed to the series currently
// being fetched, so each chart can be pinned to the exact upstream file(s) it
// was built from (not just the parsed values). We wrap the global fetch and tee
// each response: the clone is read for hashing, the original flows to the helper
// untouched. Failures here must never break a fetch, so everything is guarded.
let _currentSeries = null;
const _srcByteHashers = new Map(); // series id -> running sha256 over response bytes
const _origFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const res = await _origFetch(...args);
  if (_currentSeries && res && res.ok) {
    try {
      const buf = Buffer.from(await res.clone().arrayBuffer());
      let h = _srcByteHashers.get(_currentSeries);
      if (!h) {
        h = createHash("sha256");
        _srcByteHashers.set(_currentSeries, h);
      }
      h.update(buf);
    } catch {
      /* clone/read failure must not affect the real fetch */
    }
  }
  return res;
};

// Shared fetch options: identify ourselves (some gov APIs throttle anonymous
// bots) and bound every request so a hung server can't stall the CI job.
const fetchOpts = (headers) => ({
  headers: { "user-agent": "GovEesti data fetcher (github.com/AQVA121/GovEesti)", ...headers },
  signal: AbortSignal.timeout(30_000),
});

// Exact-source provenance: helpers record the URL they actually fetched so the
// baked dataset can link to the precise file/table (not just a landing page).
// The main loop resets this per series and keeps the first non-null value.
let _src = null;
const setSrc = (u) => { if (u) _src = String(u); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// World Bank open API → clean JSON, no key, very stable, sourced from
// OECD/WHO/UN (so internationally comparable and hard to fudge).
async function wb(indicator, country = "EE") {
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=20000`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, fetchOpts({ accept: "application/json" }));
      if (!res.ok) {
        lastErr = new Error(`WB ${indicator} → HTTP ${res.status}`);
        if (res.status === 404) break;
        await sleep(600 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      const rows = Array.isArray(j) ? j[1] : null;
      if (!rows) {
        lastErr = new Error(`WB ${indicator}: no data array`);
        await sleep(600 * (attempt + 1));
        continue;
      }
      const points = rows
        .filter((r) => r && r.value != null)
        .map((r) => ({ date: `${r.date}-01-01`, value: Number(r.value) }))
        .filter((p) => Number.isFinite(p.value))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!points.length) throw new Error(`WB ${indicator}: no usable points`);
      setSrc(url);
      return points;
    } catch (e) {
      lastErr = e;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr || new Error(`WB ${indicator}: failed`);
}

// International peer set for World Bank comparator charts. Same indicator,
// same methodology, different country — the hardest framing for anyone to
// massage. Not used by any current GovEesti source (see BRIEF.md §7/§10:
// neighbour comparison — Latvia, Lithuania — is scoped as v2, not v1), kept
// as ready infra for when that's picked up rather than removed and rewritten
// later. Update the peer list (and add a matching WB_PEERS in
// src/components/departments.ts) before actually wiring a comparator series.
const WB_PEERS = [
  ["lva", "Latvia"],
  ["ltu", "Lithuania"],
];
// Expand one WB indicator into an Estonia line ("ee") plus a comparator line
// per peer, so the baked output is a multi-line { ee, lva, ltu } series.
function wbCompare(id, indicator, { min, max, scale } = {}) {
  return [
    { id, line: "ee", min, max, scale, get: () => wb(indicator, "EE") },
    ...WB_PEERS.map(([code]) => ({
      id,
      line: code,
      min,
      max,
      scale,
      get: () => wb(indicator, code.toUpperCase()),
    })),
  ];
}

// --- Eurostat dissemination API (GovEesti) ---
// GET .../data/{dataset}?format=JSON&lang=EN&<dimension filters>. Every
// dimension except `time` must be pinned to a single value in `params` (e.g.
// geo: "EE"), or the JSON-stat `value` object's keys stop mapping 1:1 to time
// periods and would silently produce wrong-but-plausible data — so this
// throws instead of guessing when more than one non-time dimension varies.
// Confirmed working live 2026-09-04, see docs/BRIEF.md §9.
async function eurostat(dataset, params = {}) {
  const qs = new URLSearchParams({ format: "JSON", lang: "EN", ...params });
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${qs}`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, fetchOpts({ accept: "application/json" }));
      if (!res.ok) {
        lastErr = new Error(`Eurostat ${dataset} → HTTP ${res.status}`);
        if (res.status === 404) break;
        await sleep(600 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      const dims = j?.id ?? [];
      const sizes = j?.size ?? [];
      const unfiltered = dims.filter((d, i) => d !== "time" && sizes[i] > 1);
      if (unfiltered.length)
        throw new Error(`Eurostat ${dataset}: unfiltered dimension(s) ${unfiltered.join(",")} — pin them in params`);
      const timeIndex = j?.dimension?.time?.category?.index;
      const values = j?.value;
      if (!timeIndex || !values || !Object.keys(values).length) {
        lastErr = new Error(`Eurostat ${dataset}: no data for this filter combination`);
        await sleep(600 * (attempt + 1));
        continue;
      }
      const yearOf = Object.fromEntries(Object.entries(timeIndex).map(([year, idx]) => [idx, year]));
      const points = Object.entries(values)
        .map(([idx, value]) => ({ date: `${yearOf[Number(idx)]}-01-01`, value: Number(value) }))
        .filter((p) => /^\d{4}-01-01$/.test(p.date) && Number.isFinite(p.value))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!points.length) throw new Error(`Eurostat ${dataset}: no usable points`);
      setSrc(url);
      return points;
    } catch (e) {
      lastErr = e;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr || new Error(`Eurostat ${dataset}: failed`);
}

// --- PxWeb (GovEesti) — shared by Statistikaamet (andmed.stat.ee) and
// TAI (statistika.tai.ee); same engine, same query/response shape, only the
// base URL differs. POST is required for data (GET only returns metadata).
// `query` is the PxWeb query array — every classification dimension must be
// pinned explicitly (PxWeb does not default an omitted dimension to "all").
// PxWeb time values are either a plain year ("2024") or a quarter
// ("2019Q3", no space) — converts either to an ISO date (quarter -> its
// start month), or returns null for an unrecognised format so the caller
// drops it rather than emitting a bogus date.
function pxwebDate(t) {
  const s = String(t);
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  const q = s.match(/^(\d{4})Q([1-4])$/);
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  return null;
}
async function pxweb(url, query) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        ...fetchOpts({ accept: "application/json", "content-type": "application/json" }),
        body: JSON.stringify({ query, response: { format: "json" } }),
      });
      if (!res.ok) {
        lastErr = new Error(`PxWeb ${url} → HTTP ${res.status}`);
        if (res.status === 400 || res.status === 404) break;
        await sleep(600 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      const rows = j?.data;
      if (!Array.isArray(rows) || !rows.length) {
        lastErr = new Error(`PxWeb ${url}: no data rows`);
        await sleep(600 * (attempt + 1));
        continue;
      }
      const timeIdx = (j.columns || []).findIndex((c) => c.type === "t");
      if (timeIdx < 0) throw new Error(`PxWeb ${url}: no time column in response`);
      if ((j.columns || []).filter((c) => c.type === "c").length !== 1)
        throw new Error(`PxWeb ${url}: expected exactly one content column — pin more dimensions in query`);
      const points = rows
        .map((r) => ({ date: pxwebDate(r.key[timeIdx]), value: Number(r.values[0]) }))
        .filter((p) => p.date != null && Number.isFinite(p.value))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (!points.length) throw new Error(`PxWeb ${url}: no usable points`);
      setSrc(url);
      return points;
    } catch (e) {
      lastErr = e;
      await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr || new Error(`PxWeb ${url}: failed`);
}

// --- Justiits- ja Digiministeerium statistics portal (GovEesti) ---
// Not an API: the crime-statistics page links a direct CSV file whose path
// is date-stamped and moves whenever the ministry republishes it (confirmed
// live 2026-09-04, docs/INDICATORS-ee.md). So the fetcher scrapes the
// current href off the page each run, rather than hardcoding a path. Real
// CSV shape confirmed live: UTF-8 with a BOM, CRLF line endings, ';'
// delimiter, header "Type of crime;Year;Number of Offences".
async function intRecordedCrimes() {
  const PAGE_URL = "https://statistika.justdigi.ee/en/crime-statistics";
  const pageRes = await fetch(PAGE_URL, fetchOpts({ accept: "text/html" }));
  if (!pageRes.ok) throw new Error(`int-recorded-crimes: crime-statistics page → HTTP ${pageRes.status}`);
  const html = await pageRes.text();
  const m = html.match(/href="([^"]*masskuriteod[^"]*\.csv)"/);
  if (!m)
    throw new Error("int-recorded-crimes: could not find the recorded-crimes CSV link on the page — layout may have changed");
  const csvUrl = new URL(m[1], PAGE_URL).href;
  const csvRes = await fetch(csvUrl, fetchOpts({ accept: "text/csv" }));
  if (!csvRes.ok) throw new Error(`int-recorded-crimes: CSV fetch → HTTP ${csvRes.status}`);
  const text = (await csvRes.text()).replace(/^﻿/, "");
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(";");
  const typeIdx = header.indexOf("Type of crime");
  const yearIdx = header.indexOf("Year");
  const valueIdx = header.indexOf("Number of Offences");
  if (typeIdx < 0 || yearIdx < 0 || valueIdx < 0)
    throw new Error(`int-recorded-crimes: unexpected CSV header: ${lines[0]}`);
  const points = lines
    .slice(1)
    .map((l) => l.split(";"))
    .filter((cols) => cols[typeIdx] === "Total")
    .map((cols) => ({ date: `${cols[yearIdx]}-01-01`, value: Number(cols[valueIdx]) }))
    .filter((p) => /^\d{4}-01-01$/.test(p.date) && Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!points.length) throw new Error("int-recorded-crimes: no 'Total' rows found in CSV");
  setSrc(csvUrl);
  return points;
}

// --- Spreadsheet (ODS/XLSX) parsing ---
// Some official series are published only as Excel/ODS files rather than a
// queryable API (e.g. EMTA's open-data files — see BRIEF.md §5/§9, not yet
// wired to a GovEesti source as of Этап 5). SheetJS reads .ods/.xlsx/.xls; it
// is installed in CI via `npm install --no-save xlsx`, so we import it lazily
// (local/offline runs produce an empty dataset and never reach this code).
let _sheetjs;
async function sheetjs() {
  if (!_sheetjs) {
    const m = await import("xlsx");
    _sheetjs = m.default ?? m;
  }
  return _sheetjs;
}
// Fetch a spreadsheet URL and return the parsed SheetJS workbook.
async function xlsxBook(url) {
  // Retry transient rate-limits / 5xx with backoff before giving up.
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, fetchOpts({ accept: "application/octet-stream,*/*" }));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const XLSX = await sheetjs();
      setSrc(url);
      try {
        return XLSX.read(buf, { type: "buffer" });
      } catch (e) {
        // SheetJS's ODS reader throws "Unsupported value type" on some
        // real-world "accessible" workbooks. Fall back to a minimal
        // in-house ODS parser that reads content.xml directly.
        if (/\.ods(\?|$)/i.test(url)) {
          console.log(`  xlsxBook: SheetJS failed on ODS (${e.message}); using raw ODS parser`);
          return await odsBookRaw(buf);
        }
        throw e;
      }
    }
    lastErr = new Error(`spreadsheet ${url} → HTTP ${res.status}`);
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
    throw lastErr;
  }
  throw lastErr;
}
// Parse an in-memory spreadsheet buffer (e.g. an entry unzipped from a .zip).
async function xlsxBookFromBuffer(buf) {
  const XLSX = await sheetjs();
  return XLSX.read(buf, { type: "buffer" });
}
// Download a .zip and return its entries as { name, buf } (lazy fflate import;
// installed in CI alongside xlsx).
let _fflate;
async function unzipUrl(url) {
  if (!_fflate) { const m = await import("fflate"); _fflate = m.default ?? m; }
  const res = await fetch(url, fetchOpts({ accept: "application/zip,application/octet-stream,*/*" }));
  if (!res.ok) throw new Error(`zip ${url} → HTTP ${res.status}`);
  const files = _fflate.unzipSync(new Uint8Array(await res.arrayBuffer()));
  return Object.entries(files).map(([name, data]) => ({ name, buf: Buffer.from(data) }));
}
// Minimal ODS reader for files SheetJS rejects ("Unsupported value type"). An
// .ods is a zip; content.xml holds the tables. We extract each <table:table>
// into an array-of-arrays, honouring number-columns/rows-repeated and using
// office:value for numerics (falling back to the cell's text). Returns a
// book-shaped object with __raw so sheetRows reads it without SheetJS.
async function odsBookRaw(buf) {
  if (!_fflate) { const m = await import("fflate"); _fflate = m.default ?? m; }
  const files = _fflate.unzipSync(new Uint8Array(buf));
  const xml = Buffer.from(files["content.xml"] ?? new Uint8Array()).toString("utf8");
  const unesc = (s) => s.replace(/<text:s\b[^>]*\/>/g, " ").replace(/<text:tab\b[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
  const SheetNames = [], Sheets = {};
  const tableRe = /<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g;
  let tm;
  while ((tm = tableRe.exec(xml))) {
    const name = (tm[1].match(/table:name="([^"]*)"/) || [, ""])[1];
    const body = tm[2];
    const rows = [];
    const rowRe = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/g;
    let rm;
    while ((rm = rowRe.exec(body))) {
      const rowRep = Math.min(parseInt((rm[1].match(/number-rows-repeated="(\d+)"/) || [, "1"])[1], 10) || 1, 1000);
      const content = rm[2] ?? "";
      const cells = [];
      const cellRe = /<table:(covered-table-cell|table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:\1>)/g;
      let cm;
      while ((cm = cellRe.exec(content))) {
        const attrs = cm[2] ?? "", inner = cm[3] ?? "";
        const rep = Math.min(parseInt((attrs.match(/number-columns-repeated="(\d+)"/) || [, "1"])[1], 10) || 1, 4096);
        const ov = attrs.match(/office:value="([^"]*)"/);
        let val;
        if (ov) { const n = Number(ov[1]); val = Number.isFinite(n) ? n : ov[1]; }
        else { const t = unesc(inner); val = t === "" ? null : t; }
        for (let k = 0; k < rep; k++) cells.push(val);
      }
      while (cells.length && cells[cells.length - 1] == null) cells.pop();
      for (let k = 0; k < rowRep; k++) rows.push(cells.slice());
    }
    SheetNames.push(name);
    Sheets[name] = rows;
  }
  return { __raw: true, SheetNames, Sheets };
}
// Read one sheet as an array-of-arrays (header:1), blank rows removed.
async function sheetRows(book, name) {
  if (book && book.__raw) return (book.Sheets[name] ?? []).filter((r) => r.some((c) => c != null && String(c).trim() !== ""));
  const XLSX = await sheetjs();
  return XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, blankrows: false });
}

const SOURCES = [
  // --- GovEesti (Этап 5, one source at a time — see BRIEF.md §7/§8) ---
  // At-risk-of-poverty rate (60% of median equivalised income), Estonia.
  // min/max = the validRange from docs/INDICATORS-ee.md's Этап 3 spec,
  // derived from the real 2000-2025 series fetched live during research
  // (observed 15.8-22.8%), not invented.
  {
    id: "soc-poverty-rate",
    min: 5,
    max: 35,
    get: () =>
      eurostat("ilc_li02", {
        geo: "EE",
        sex: "T",
        age: "TOTAL",
        unit: "PC",
        rskpovth: "B_60",
        statinfo: "MED_EI",
      }),
  },

  // Life expectancy at birth ⇄ healthy life years at birth (paired). Three
  // entries share one id: the plain entry (no `line`) feeds the
  // "representative" top-level `points` used for tile summaries, and the two
  // `line` entries feed the two-line chart in TrendPanel. min/max per entry
  // matches docs/INDICATORS-ee.md's Этап 3 spec, derived from the real
  // 1960-2024 / 2004-2024 series fetched live during research.
  {
    id: "soc-life-expectancy",
    min: 60,
    max: 90,
    get: () => eurostat("demo_mlexpec", { geo: "EE", sex: "T", age: "Y_LT1" }),
  },
  {
    id: "soc-life-expectancy",
    line: "life-expectancy",
    min: 60,
    max: 90,
    get: () => eurostat("demo_mlexpec", { geo: "EE", sex: "T", age: "Y_LT1" }),
  },
  {
    id: "soc-life-expectancy",
    line: "healthy-life-years",
    min: 30,
    max: 70,
    get: () => eurostat("hlth_hlye", { geo: "EE", sex: "T", hlth_hle: "HLY_Y0", unit: "YR" }),
  },

  // Hospital beds (national total, annual average) — TAI PxWeb table HH08.
  // Näitaja=0 "Hospital beds (annual average)", Ravivoodi liik=0 "Total
  // hospital beds", Haigla nimi=0 = national total across all hospitals.
  {
    id: "soc-hospital-beds",
    min: 4500,
    max: 7500,
    get: () =>
      pxweb("https://statistika.tai.ee/api/v1/en/Andmebaas/04THressursid/11HAHaiglad/HH08.px", [
        { code: "Näitaja", selection: { filter: "item", values: ["0"] } },
        { code: "Ravivoodi liik", selection: { filter: "item", values: ["0"] } },
        { code: "Haigla nimi", selection: { filter: "item", values: ["0"] } },
        { code: "Aasta", selection: { filter: "all", values: ["*"] } },
      ]),
  },

  // General government health expenditure per capita (VFM) — DERIVED, not a
  // direct pass-through: Statistikaamet's RR056 (COFOG expenditure by
  // function, Sektor=1 "S.13 General government", Valitsemisfunktsioon=48
  // "07 Health", Näitaja=12 "Total expenditure", EUR millions) divided by
  // World Bank population (SP.POP.TOTL). Statistikaamet does not publish a
  // ready per-capita health-spend series.
  {
    id: "soc-health-spend-per-capita",
    // Widened from the Этап 3 spec's [500, 3000]: that range was derived
    // from only the 2015-2024 window. The live full-history pull (1995-2024)
    // shows a real, monotonic climb from €96.61 (1995) to €1,836.72 (2024) —
    // a poorer post-Soviet Estonia, not an anomaly — so the original min
    // dropped 12 of 30 real points. min widened to keep the full history.
    min: 50,
    max: 3000,
    get: async () => {
      const RR056_URL =
        "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR056.PX";
      const spend = await pxweb(RR056_URL, [
        { code: "Sektor", selection: { filter: "item", values: ["1"] } },
        { code: "Valitsemisfunktsioon", selection: { filter: "item", values: ["48"] } },
        { code: "Näitaja", selection: { filter: "item", values: ["12"] } },
        { code: "Aasta", selection: { filter: "all", values: ["*"] } },
      ]);
      const pop = await wb("SP.POP.TOTL", "EE");
      const popByYear = new Map(pop.map((p) => [p.date.slice(0, 4), p.value]));
      const points = spend
        .map((p) => {
          const population = popByYear.get(p.date.slice(0, 4));
          // RR056 is EUR millions; population is an absolute headcount.
          return population
            ? { date: p.date, value: +((p.value * 1_000_000) / population).toFixed(2) }
            : null;
        })
        .filter((p) => p != null);
      if (!points.length)
        throw new Error("soc-health-spend-per-capita: no overlapping years between RR056 and population");
      // Both pxweb() and wb() call setSrc — re-assert the primary (spend)
      // source so provenance points at RR056, not the population lookup.
      setSrc(RR056_URL);
      return points;
    },
  },

  // Pupil:teacher ratio, general education — DERIVED: Statistikaamet HT121
  // (stationary general-education enrolments, level=ED_GEN_STAT_T) divided
  // by HT235 (teachers, Vanuserühm=1 total, Sugu=1 total). HT235 sits under
  // a "Lepetatud_tabelid/...Arhiiv" (archive) path but is still updated
  // through the latest year — the folder name is not a liveness signal, see
  // docs/INDICATORS-ee.md. Statistikaamet does not publish this ratio
  // directly.
  {
    id: "edu-pupil-teacher-ratio",
    min: 5,
    max: 20,
    get: async () => {
      const HT121_URL = "https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/haridus/uldharidus/HT121.px";
      const enrolments = await pxweb(HT121_URL, [
        { code: "Õppetase / õppeasutuse tüüp", selection: { filter: "item", values: ["ED_GEN_STAT_T"] } },
        { code: "Vaatlusperiood", selection: { filter: "all", values: ["*"] } },
      ]);
      const teachers = await pxweb(
        "https://andmed.stat.ee/api/v1/en/stat/Lepetatud_tabelid/Sotsiaalelu.%20Arhiiv/Haridus.%20Arhiiv/HT235.PX",
        [
          { code: "Vanuserühm", selection: { filter: "item", values: ["1"] } },
          { code: "Sugu", selection: { filter: "item", values: ["1"] } },
          { code: "Aasta", selection: { filter: "all", values: ["*"] } },
        ],
      );
      const teachersByYear = new Map(teachers.map((p) => [p.date.slice(0, 4), p.value]));
      const points = enrolments
        .map((p) => {
          const t = teachersByYear.get(p.date.slice(0, 4));
          return t ? { date: p.date, value: +(p.value / t).toFixed(2) } : null;
        })
        .filter((p) => p != null);
      if (!points.length)
        throw new Error("edu-pupil-teacher-ratio: no overlapping years between HT121 and HT235");
      setSrc(HT121_URL);
      return points;
    },
  },

  // Recorded crimes, total. See intRecordedCrimes() above for the CSV
  // scraping approach (the file path is not a stable API endpoint).
  {
    id: "int-recorded-crimes",
    min: 15000,
    max: 40000,
    get: intRecordedCrimes,
  },

  // Defence spending, % of GDP — World Bank, same wb() helper as the UK
  // entries below, just targeting Estonia.
  {
    id: "def-spend-gdp",
    min: 0,
    max: 6,
    get: () => wb("MS.MIL.XPND.GD.ZS", "EE"),
  },

  // Military personnel per 1,000 population — DERIVED: World Bank
  // MS.MIL.TOTL.P1 is an absolute headcount, not a per-capita rate (no WB
  // series gives that directly), divided by SP.POP.TOTL and scaled per
  // 1,000. Last updated by WB for 2020 as of 2026-09-04 — expect a short,
  // stale-looking series, not a fetcher bug.
  {
    id: "def-personnel-per-1000",
    min: 1,
    max: 15,
    get: async () => {
      const PERSONNEL_URL = "https://api.worldbank.org/v2/country/EE/indicator/MS.MIL.TOTL.P1?format=json&per_page=20000";
      const personnel = await wb("MS.MIL.TOTL.P1", "EE");
      const pop = await wb("SP.POP.TOTL", "EE");
      const popByYear = new Map(pop.map((p) => [p.date.slice(0, 4), p.value]));
      const points = personnel
        .map((p) => {
          const population = popByYear.get(p.date.slice(0, 4));
          return population ? { date: p.date, value: +((p.value / population) * 1000).toFixed(2) } : null;
        })
        .filter((p) => p != null);
      if (!points.length)
        throw new Error("def-personnel-per-1000: no overlapping years between personnel and population");
      setSrc(PERSONNEL_URL);
      return points;
    },
  },

  // General government debt ⇄ deficit/surplus, % of GDP — Statistikaamet
  // RR061, same table as both indicators (Näitaja=2 debt%, Näitaja=4
  // deficit/surplus%). Two independent ids (not lines of one series, unlike
  // soc-life-expectancy) since departments.ts treats them as separate charts.
  {
    id: "fin-debt-gdp",
    min: 0,
    max: 40,
    get: () =>
      pxweb(
        "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR061.px",
        [
          { code: "Näitaja", selection: { filter: "item", values: ["2"] } },
          { code: "Aasta", selection: { filter: "all", values: ["*"] } },
        ],
      ),
  },
  {
    id: "fin-deficit-gdp",
    min: -10,
    max: 5,
    get: () =>
      pxweb(
        "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR061.px",
        [
          { code: "Näitaja", selection: { filter: "item", values: ["4"] } },
          { code: "Aasta", selection: { filter: "all", values: ["*"] } },
        ],
      ),
  },

  // Tax burden, % of GDP — World Bank, same wb() helper, EE.
  {
    id: "fin-tax-burden",
    min: 10,
    max: 30,
    get: () => wb("GC.TAX.TOTL.GD.ZS", "EE"),
  },

  // Real GDP per capita, chain-linked volume (reference year 2020) —
  // Statistikaamet RAA0013, Näitaja=2.
  {
    id: "fin-gdp-per-capita",
    min: 5000,
    max: 30000,
    get: () =>
      pxweb(
        "https://andmed.stat.ee/api/v1/en/stat/majandus/rahvamajanduse-arvepidamine/sisemajanduse-koguprodukt-(skp)/pehilised-rahvamajanduse-arvepidamise-naitajad/RAA0013.PX",
        [
          { code: "Näitaja", selection: { filter: "item", values: ["2"] } },
          { code: "Aasta", selection: { filter: "all", values: ["*"] } },
        ],
      ),
  },

  // Renewable energy share of gross final consumption — Eurostat nrg_ind_ren.
  {
    id: "clim-renewable-share",
    min: 5,
    max: 55,
    get: () => eurostat("nrg_ind_ren", { geo: "EE", nrg_bal: "REN" }),
  },

  // Greenhouse gas emissions, total (excl. memo items) — Eurostat
  // env_air_gge. The 1990 Soviet-era oil-shale peak is a real historical
  // extreme kept as the guard ceiling, not a target — see
  // docs/INDICATORS-ee.md.
  {
    id: "clim-ghg-emissions",
    min: 8000,
    max: 40000,
    get: () => eurostat("env_air_gge", { geo: "EE", airpol: "GHG", unit: "THS_T", src_crf: "TOTXMEMO" }),
  },

  // Road deaths (persons killed in traffic accidents) — Statistikaamet
  // TS093, Näitaja=5 "Persons killed", Kuu=00 = annual total.
  // Widened from the Этап 3 spec's [30, 150]: that range was calibrated
  // against only the 2021-2024 window ("modern band 48-69"), but the full
  // live pull shows a real, gradual multi-decade decline (491 in 1991 to
  // 48-69 in the 2010s-2020s) with ~half the years above 150, not a small
  // early-1990s outlier — the narrow guard rejected the WHOLE series
  // (18/35 points out of range > 50% cutoff), not just a few points.
  {
    id: "clim-road-deaths",
    min: 40,
    max: 500,
    get: () =>
      pxweb("https://andmed.stat.ee/api/v1/en/stat/majandus/transport/liiklusennetused/TS093.PX", [
        { code: "Näitaja", selection: { filter: "item", values: ["5"] } },
        { code: "Kuu", selection: { filter: "item", values: ["00"] } },
        { code: "Aasta", selection: { filter: "all", values: ["*"] } },
      ]),
  },

  // Unemployment rate (15-74), quarterly — Statistikaamet TT3300. First
  // quarterly PxWeb source (values like "2019Q3", not a plain year) —
  // required extending pxweb()'s date parser (see pxwebDate() above).
  {
    id: "econ-unemployment-rate",
    min: 2,
    max: 22,
    get: () =>
      pxweb(
        "https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/tooturg/tooturu-uldandmed/luhiajastatistika/TT3300.px",
        [
          { code: "Näitaja", selection: { filter: "item", values: ["UNEMP_RATE"] } },
          { code: "Sugu", selection: { filter: "item", values: ["T"] } },
          { code: "Vanuserühm", selection: { filter: "item", values: ["Y15-74"] } },
          { code: "Vaatlusperiood", selection: { filter: "all", values: ["*"] } },
        ],
      ),
  },

  // Exports of goods and services, % of GDP — World Bank, EE.
  {
    id: "econ-exports-gdp",
    min: 30,
    max: 100,
    get: () => wb("NE.EXP.GNFS.ZS", "EE"),
  },

  // R&D expenditure, % of GDP — World Bank (compiled from UNESCO/Eurostat), EE.
  {
    id: "econ-rd-spend-gdp",
    min: 0,
    max: 4,
    get: () => wb("GB.XPD.RSDV.GD.ZS", "EE"),
  },

  // Households with broadband access — Eurostat isoc_r_broad_h. unit has two
  // variants (PC_HH households vs PC_HH_IACC households with internet
  // access at home) — pinned to PC_HH explicitly up front, learned from the
  // hlth_hlye mistake earlier in this Этап.
  {
    id: "econ-broadband-penetration",
    min: 20,
    max: 100,
    get: () => eurostat("isoc_r_broad_h", { geo: "EE", unit: "PC_HH" }),
  },

];

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean))
  : null;
const selectedSources = only ? SOURCES.filter((s) => only.has(s.id)) : SOURCES;
if (only) {
  const selected = new Set(selectedSources.map((s) => s.id));
  for (const id of only) if (!selected.has(id)) console.warn(`WARN --only ignored unknown source id: ${id}`);
  console.log(`fetch-data: --only ${selectedSources.length}/${SOURCES.length} source entries`);
}

const out = {};
let ok = 0;
let fail = 0;
for (const s of selectedSources) {
  const tag = `${s.id}${s.line ? ":" + s.line : ""}`;
  try {
    _src = null;
    _currentSeries = s.id;
    let points = await s.get();
    if (s.scale)
      points = points.map((p) => ({
        ...p,
        value: p.value * s.scale,
        ...(p.lo != null ? { lo: p.lo * s.scale } : {}),
        ...(p.hi != null ? { hi: p.hi * s.scale } : {}),
      }));
    // Sanity guard: a wrong-but-resolving code can't show wrong data. Reject
    // the whole series when the latest value or a majority of points is out
    // of range; isolated out-of-range points (e.g. a corrupt row mixing an
    // absolute value into a %-of-GDP series) are dropped with a warning.
    const oob = (v) => (s.min != null && v < s.min) || (s.max != null && v > s.max);
    const last = points[points.length - 1].value;
    if (oob(last))
      throw new Error(`latest ${last} outside expected [${s.min ?? "-∞"},${s.max ?? "∞"}] — wrong series?`);
    const bad = points.filter((p) => oob(p.value));
    if (bad.length > points.length / 2)
      throw new Error(`${bad.length}/${points.length} points outside expected [${s.min ?? "-∞"},${s.max ?? "∞"}] — wrong series?`);
    if (bad.length) {
      console.warn(`warn ${tag}  dropping ${bad.length} point(s) outside [${s.min ?? "-∞"},${s.max ?? "∞"}], e.g. ${bad[0].value} at ${bad[0].date}`);
      points = points.filter((p) => !oob(p.value));
    }
    // Revision honesty: mark not-yet-final point(s) so the UI can shade them and
    // caption "subject to revision". A read on a provisional figure should be
    // visibly hedged. Preference order: (1) a status the fetcher read straight
    // from the source (e.g. a workbook "(p)" marker via `revisionMarker`) is
    // authoritative and kept as-is; (2) otherwise the per-source `provisional: N`
    // manifest fallback marks the trailing N points, for sources that publish
    // recent periods as provisional by convention but carry no in-file flag.
    const fetcherSetStatus = points.some((p) => p && p.status);
    if (!fetcherSetStatus && s.provisional && Number.isFinite(s.provisional) && points.length) {
      const n = Math.min(s.provisional, points.length);
      points = points.map((p, i) =>
        i >= points.length - n ? { ...p, status: "provisional" } : p,
      );
    }
    out[s.id] ??= {};
    if (s.line) (out[s.id].lines ??= []).push({ id: s.line, points });
    else out[s.id].points = points;
    out[s.id].asOf = new Date().toISOString().slice(0, 10);
    // Exact source URL of the file/table actually fetched (first line wins for
    // multi-line series). Falls back to the series' static sourceUrl if unknown.
    if (_src) out[s.id].srcUrl ??= _src;
    // The plausibility guard this value passed — surfaced in the UI as a visible
    // QA signal (first writer wins for multi-line series).
    if (s.min != null && s.max != null) out[s.id].guard ??= { min: s.min, max: s.max };
    ok++;
    console.log(
      `ok   ${tag}  ${points.length} pts  ${points[0].date}..${points[points.length - 1].date}  src=${_src ?? "-"}`,
    );
  } catch (e) {
    fail++;
    console.warn(`SKIP ${tag}  ${e.message}`);
  }
  await sleep(120); // be gentle on the APIs across a big batch
}

// Content fingerprint of each baked dataset (short SHA-256 over the points /
// lines). Pins a chart to an exact data version — lets two builds be compared
// for identical data and surfaces silent upstream changes. Computed over the
// data only (deterministic, independent of fetch date).
for (const [id, series] of Object.entries(out)) {
  const payload = series.lines
    ? series.lines.map((l) => [l.id, l.points])
    : series.points ?? [];
  series.srcHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 10);
  // Source-bytes lineage (item 1): fingerprint of the exact upstream file bytes
  // fetched for this series, distinct from the parsed-data fingerprint above.
  const bh = _srcByteHashers.get(id);
  if (bh) series.srcBytesHash = bh.digest("hex").slice(0, 12);
}

const file =
  `// AUTO-GENERATED by scripts/build-data.mjs — do not edit or commit populated data.\n` +
  `export type RawPoint = { date: string; value: number; lo?: number; hi?: number; status?: "provisional" | "revised" | "final" };\n` +
  `export type RawSeries = { points?: RawPoint[]; lines?: { id: string; points: RawPoint[] }[]; asOf?: string; srcUrl?: string; guard?: { min: number; max: number }; srcHash?: string; srcBytesHash?: string };\n` +
  `export const SERIES_DATA: Record<string, RawSeries> = ${JSON.stringify(out, null, 2)};\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, file);
console.log(`\nwrote ${OUT}: ${ok} ok, ${fail} skipped`);
process.exit(0); // never fail the build over data fetching
