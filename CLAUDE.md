# CLAUDE.md

Guidance for Claude when working in this repo.

## Project

GovEesti — a static dashboard of long-run Estonian government performance
indicators. Fork/adaptation of [Govviz](https://github.com/Egly443/Govviz)
(UK original) — same architecture, Estonian ministries and data sources.

**The plan lives in [docs/BRIEF.md](docs/BRIEF.md) — read it before starting
new work.** It has the fork strategy, the ministry list, the data-source
survey (Statistikaamet/PxWeb, TAI, Eurostat, EMTA, ECB SDW…), the stage
checklist, and the vibecoding rules (small tasks, no fabricated data, real
API response before writing a parser).

**Status (2026-09-04):** Этап 1–4 done. Source research for 19 indicators is
complete and live-verified (`docs/INDICATORS-ee.md`); the app shell is
adapted for Estonia — UK content removed (MCP tool, conformance suite,
policy/blog docs, the UK department registry and its NHS series), 8 Estonian
ministries populated in `departments.ts` with real source metadata but
**empty `points` arrays** (no fetcher has run yet — every chart currently
renders the honest "no source yet" placeholder, exactly as designed).
`npm run dev`/`build`/`typecheck` all pass. **Next: Этап 5** — wire one real
fetcher at a time into `scripts/build-data.mjs` (`pxweb()` helper for
Statistikaamet/TAI, a CSV/XLSX fetcher for EMTA-style sources), per
BRIEF.md §5/§9.

## Hard rule: no fabricated data

Never fall back to synthetic/interpolated/"plausible" data. A missing or
unfetched source must render an explicit "no source yet" placeholder instead
of a generated number. Guard every series with a `validRange` so a
wrong-but-resolving fetch can't ship silently (see BRIEF.md §3, §7, §8).

## Stack (kept from the original — works well)

- Vite + React + TypeScript
- TanStack Router (file-based routing, codegen via `@tanstack/router-plugin`)
- Tailwind v4 (`@tailwindcss/vite`, theme in `src/styles.css`)
- Recharts (charts), d3-hierarchy (treemap), lucide-react (icons)
- GitHub Actions + GitHub Pages (deploy)

Interface/content language: **English** (ministry names, chart labels, series
metadata) — not Estonian or Russian by default. See BRIEF.md §2.

## Project structure

- `src/components/data.ts` — series/data helpers (`realPoints`/`realLine`,
  `ratioSeries`, staleness/format helpers). Purely generic infra now — the 14
  UK NHS `TrendSeries` constants and the workforce-turnover data that used to
  live here were removed in the Этап 4 cleanup (see git history).
- `src/components/departments.ts` — the ministry registry, now Estonian: 8
  ministries (`soc`/`edu`/`int`/`just`/`def`/`fin`/`clim`/`econ`), each with
  real source metadata (id/title/unit/source/sourceUrl) from
  `docs/INDICATORS-ee.md`'s Этап 3 spec, but `points: []` — no fetcher has
  run yet. `just` has no confirmed source at all yet (explicit placeholder
  series, not a fabricated number). `SPEND_BASIS`/`spendBn` is an
  equal-weight placeholder — no real per-ministry budget figure has been
  sourced yet, don't treat it as data.
- `src/routes/` — file-based routes: `overview.tsx` (treemap landing),
  `about.tsx` (methodology page), `$dept.tsx` (per-ministry dashboard).
  `blog.tsx`/`data.tsx` and their components were removed in Этап 4 along
  with the DCAT/CSVW/MCP apparatus they served (see below).
  `src/routeTree.gen.ts` is generated.
- `src/components/GovTreemap.tsx`, `overview.ts`, `Modal.tsx`,
  `TrendPanel.tsx`, `TopNav.tsx`, `DataHealthStrip.tsx` — reusable
  architectural shell, adapt props/styling only, do not rewrite.
- `src/lib/analytics.ts` — generic cookieless GoatCounter wrapper, no UK
  content, kept as-is.
- `scripts/build-data.mjs` — fetch pattern (try/catch per source, `setSrc()`,
  retries) is reused as-is. The UK `SOURCES` array/fetchers were fully
  removed at Этап 4's follow-up cleanup (git history has the originals);
  `eurostat()`, `pxweb()`/`pxwebDate()` (Statistikaamet/TAI, one engine),
  and a one-off `intRecordedCrimes()` CSV scraper (Этап 5) now cover all 19
  confirmed Estonian indicators. `wb()`/`wbCompare()` and the generic
  XLSX/ODS helpers are kept as real infra, not UK content — `wbCompare()`
  isn't used by any current source but is scoped for BRIEF.md §10's v2
  neighbour comparison (Latvia/Lithuania), and the spreadsheet helpers
  await the still-unwired EMTA file source (§5/§9).
- `scripts/check-open-data.mjs` — rewritten at Этап 7 (2026-09-06) into a
  small, self-contained guard: reads `src/generated/seriesData.ts` directly
  (no dependency on `dist/data/*`, the minimal open-data layer built at
  Этап 8 below) and fails the build if any baked series has no `validRange`
  guard, or any
  point falls outside it. Reconnected to `npm run build` and both CI
  workflows. Guards are now per-line where a series has multiple lines
  (`soc-life-expectancy`'s two lines have genuinely different plausible
  ranges) — `build-data.mjs`'s main loop bakes a `guard` onto each line
  object, not just once at the record level.
- `scripts/build-open-data.mjs` — the minimal open-data layer (Этап 8,
  2026-09-06): `dist/data/series/{id}.json` (producer/compiler/licence/
  validRange/freshness) + `dist/data/series/{id}/data.csv` per series
  `departments.ts` references. Deliberately not the DCAT/CSVW/OpenAPI
  apparatus removed in Этап 4 — reads `seriesData.ts` and `departments.ts`
  directly, no schema of its own. A series with no baked data (currently
  `just-no-source-yet`) gets an honest metadata record with `validRange`/
  `latest` as `null` and no CSV file — never a fabricated one. Wired into
  `npm run build`, after the prerender steps and before the Этап 7 guard
  check.
- `docs/conformance/probe-15-lines.mjs` — kept per the original plan, base
  URL adapted to GovEesti's `/data/` path. Confirmed working end-to-end
  2026-09-06 against a local build (`GOVVIZ_DATA_BASE=http://localhost:PORT/data`,
  same env var `build-open-data.mjs` also reads) — real values, real
  validRange check. Known gap: it assumes every series has real data (no
  `rec.latest === null` handling), so it throws an unhandled URL error if
  pointed at an unsourced placeholder like `just-no-source-yet` — fine for
  its actual use (probing a real series id), not something this session
  changed since the probe's own logic wasn't in scope.
- Removed in Этап 4 (2026-09-04, see git history for the originals):
  `tools/mcp/`, `docs/conformance/*` (except the probe script above),
  `docs/policy-*`, `docs/blog-*`, `docs/outreach/`, `docs/backlog-research/`,
  `docs/benchmarks/`, `docs/evidence/`, several other UK-Govviz-essay docs
  (`measurement-gap-thesis.md`, `producer-guide.md`, etc.), `scripts/
  build-open-data.mjs`, `scripts/check-policy-references.mjs`, `scripts/
  test-mcp.mjs`, `scripts/run-conformance-suite.mjs`, `scripts/
  prerender-blog.mjs`, the Blog/Data routes and components, and
  `TurnoverBreakdown.tsx` (UK NHS-specific, no Estonian equivalent planned).
  `src/lib/analytics.ts` was **kept** (it's generic, not UK-specific —
  correcting the earlier assumption that it needed removing).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also regenerates `routeTree.gen.ts`)
- `npm run typecheck` — `tsc -b`
- `npm run fetch-data -- --only=<id>` — run one series' fetcher locally
- After adding/renaming a route file, run `npm run build` (or dev) so the
  router plugin regenerates `routeTree.gen.ts`; then `typecheck`.

## Vibecoding rules (from BRIEF.md §8)

1. Small, checkable tasks — "add one indicator", not "do all of Sotsiaalministeerium".
2. No synthetic/"plausible" fallback data — honest "no source yet" placeholder instead.
3. Before writing a parser, fetch and show a real API response — don't rely on
   memorized assumptions about Estonian source formats.
4. Small, frequent commits — one broken fetcher must never take down the
   whole pipeline (every fetcher stays wrapped in try/catch).
5. Periodically revisit written fetchers for duplicated logic → shared helpers.
