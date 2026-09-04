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
  retries) is reused as-is; the UK-specific `SOURCES` array/fetchers inside
  it are **not yet replaced** (still UK, Этап 5 work) — a `pxweb()` helper
  (Statistikaamet/TAI) and a CSV/XLSX file fetcher (EMTA) will replace them
  (BRIEF.md §5, §9).
- `scripts/check-open-data.mjs` — the `validRange` guard idea is genuinely
  core (see the hard rule below), but this file's current implementation is
  the **full DCAT-conformance validator** — heavier than what CLAUDE.md
  originally assumed, and it depended on the schema/catalogue removed below.
  It is disconnected from `npm run build`/CI as of Этап 4 (see its header
  comment) and needs a real rewrite against whatever the minimal open-data
  layer (BRIEF.md §7, Этап 8) emits — not a restoration as-is.
- `docs/conformance/probe-15-lines.mjs` — kept per the original plan, base
  URL adapted to GovEesti's expected `/data/` path — but that path doesn't
  exist yet either (same Этап 8 dependency as above), so this probe has
  nothing to fetch right now.
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
