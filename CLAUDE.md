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

**Status (2026-09-04):** repo just forked, not yet cleaned up. UK-specific
content (department registry, MCP tool, conformance suite, UK docs/blog) is
still present and **has not been removed yet** — its removal is a deliberate
later step (BRIEF.md §1/§7 Этап 4), not an oversight. Don't treat UK content
found in the repo as intentional for GovEesti; it's pending cleanup, and
nothing has been fetched/wired for Estonia yet.

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
  kept from the original, no UK content)
- `src/components/departments.ts` — ministry registry; **currently the UK
  registry, to be emptied and refilled with Estonian ministries** (BRIEF.md §4)
- `src/routes/` — file-based routes (`overview.tsx` = treemap landing,
  `$dept.tsx` = per-ministry dashboard); `src/routeTree.gen.ts` is generated
- `src/components/GovTreemap.tsx`, `overview.ts`, `Modal.tsx`,
  `TrendPanel.tsx`, `TopNav.tsx` — reusable architectural shell, adapt
  props/styling only, do not rewrite
- `scripts/build-data.mjs` — fetch pattern (try/catch per source, `setSrc()`,
  retries) is reused as-is; the UK-specific fetchers inside it are not — a
  `pxweb()` helper (Statistikaamet/TAI) and a CSV/XLSX file fetcher (EMTA)
  replace them (BRIEF.md §5, §9)
- `scripts/check-open-data.mjs` — `validRange` guard logic, generic, kept
- `docs/conformance/probe-15-lines.mjs` — kept, adapt base URL only
- Slated for removal, not yet done: `tools/mcp/`, `docs/conformance/*`
  (except the probe script above), `docs/policy-*`, `docs/blog-*`,
  `docs/outreach/`, `docs/backlog-research/`, `src/lib/analytics.ts` — see
  BRIEF.md §1/§3 for the full removal list

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
