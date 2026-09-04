# GovEesti — indicator selection (spec, draft)

Working spec for the real-data dashboard, adapted from the original
[`docs/INDICATORS.md`](INDICATORS.md) (UK). This is a **source-research
draft** (Этап 2 of [`docs/BRIEF.md`](BRIEF.md)) — sources are found and
sanity-checked here; the full per-indicator spec (`validRange`,
`producer`/`compiler`, licence, `revisionStatus` — see BRIEF.md §6) is filled
in at Этап 3, once a source is picked for each row.

## Status markers (this file only)

- ✅ **confirmed** — dataset/table code or API found this session, with a
  real published figure cross-checked (not just a guessed URL)
- 🔎 **candidate** — a plausible source page/portal found, but the exact
  table code, API shape, or a real value has not been confirmed yet
- 🔴 **blocked (probe found no machine-readable source)** — this session's
  search surfaced PDF/report-only publication; needs a dedicated probe
  before being counted as a real candidate (same treatment as the UK
  original's SKIP list — don't assume it's permanently blocked, don't spend
  more than one probe on it yet either)
- ❓ **not researched this session**

Feasibility (same convention as the original): 🟢 clean JSON/CSV/API ·
🟡 ODS/Excel/HTML (parseable, more brittle) · 🔴 hard.

**Important limitation of this pass:** the sandbox this file was drafted in
cannot fetch external URLs directly (`WebFetch`/`curl` are blocked by the
egress proxy — see `CLAUDE.md` "Environment gotchas"); only `WebSearch` was
available. So "✅ confirmed" here means *a search result surfaced a real
published number or an explicit dataset/table code*, not that a JSON
response was pulled and inspected byte-for-byte the way `build-data.mjs`
does in CI. Getting an actual sample response for each ✅/🔎 row is still
Этап 2's second checklist item and still needs doing (via CI, or a session
with live network access) before writing a fetcher.

---

## Sotsiaalministeerium (soc) — Health & Social Affairs

- At-risk-of-poverty rate, by age group (children ⇄ pensioners, AHC) —
  Eurostat `ilc_li02`, annual (EU-SILC) — **O** 🟢 ✅ (dataset code
  confirmed; EE overall rate ~21.7% reported for 2019, so the series is
  live and populated for Estonia)
- Healthy life expectancy / life expectancy at birth — Eurostat demography
  tables (candidate `hlth_hlye` or `demo_mlexpec`) — **O** 🟢 🔎 (code not
  pinned down this session)
- Hospital resources (beds, providers) — TAI `statistika.tai.ee` PxWeb,
  confirmed live paths: `Resources/PX/Databases/Andmebaas/04THressursid/
  11HAHaiglad` (hospitals), `.../01TTosutajad` (providers) — **C** 🟡 🔎
  (portal and path structure confirmed; a waiting-time/GP-access table
  specifically was not surfaced — may not exist as a clean PxWeb table,
  needs direct site navigation, not just search)
- Health spend per capita (VFM) — Statistikaamet/Eurostat COFOG government
  expenditure-by-function tables — **VFM** 🟡 ❓

## Haridus- ja Teadusministeerium (edu) — Education

- PISA reading/maths/science, Estonia — OECD PISA, triennial — **O** 🟢 ✅
  (same OECD API pattern as the UK original, just switch country to EST;
  Estonia is a strong, consistently-reported PISA performer)
- Teacher:pupil ratio — Statistikaamet, candidate tables `HT121` (pupils),
  `HT235` (teachers of general education) — **C** 🟡 🔎 (table IDs surfaced
  by search — a 2020/21 figure of ~11.9 pupils per teaching post was
  reported externally — but the exact PxWeb path/metric needs confirming
  against the live API, not just the table numbers)
- Per-pupil real funding — HaridusSilm portal (`haridussilm.ee`) /
  Haridus- ja Teadusministeerium statistics page — **VFM** 🔴 🔎
  (HaridusSilm reads as an interactive BI dashboard, not a confirmed API —
  treat as a probe candidate, not a committed source, until checked)

## Siseministeerium (int) — Internal security, police, rescue

- Recorded crimes, total and by offence type — **Justice Statistics portal**
  `statistika.justdigi.ee` (crime-statistics section) — **O** 🟡 🔎 (live
  source confirmed with a real number — 13,792 crimes registered H1 2025,
  −2% YoY — but this portal is *not* Statistikaamet/PxWeb; its own API
  shape is unconfirmed, needs a dedicated probe. Note: this portal belongs
  to Justiits- ja Digiministeerium, not Siseministeerium — despite being
  "crime" data, the natural home may be the `just` ministry page instead,
  worth revisiting at Этап 3)
- Police officers per 1,000 population — Statistikaamet "Security" theme,
  `stat.ee/en/find-statistics/statistics-theme/well-being/security` —
  **L** 🟡 🔎 (theme page confirmed, specific table not pinned)
- Rescue service response times / call volume — Päästeamet (`rescue.ee`) —
  **C** 🔴 (this session found only PDF annual reports — e.g. "Siseturvalisuse
  2024. aasta tulemusaruanne" — and no open dataset; candidate for the
  hard-blocked list unless a dedicated probe finds `opendata.riik.ee/paasteamet`
  publishing something machine-readable)

## Justiits- ja Digiministeerium (just) — Justice, courts

- Court clearance rate / disposition time — Council of Europe CEPEJ Estonia
  country profile (external benchmark, not a live feed) reports 100%
  first-instance civil/commercial clearance rate and +7.9% disposition
  time, 2020→2021 — **C** 🔴 🔎 (CEPEJ publishes periodic reports, not an
  API; the live Estonian source is likely `statistika.justdigi.ee` — same
  portal as the crime stats above, needs the same API-shape probe)
- Prison population — likely also on the Justice Statistics portal or a
  Vanglateenistus (prison service) page — ❓ not researched this session
- Reoffending rate — ❓ not researched this session (was 🟡 in the UK
  original via MoJ; no Estonian equivalent looked up yet)

## Kaitseministeerium (def) — Defence

- Defence spending, % of GDP — World Bank `MS.MIL.XPND.GD.ZS` — **VFM /
  context** 🟢 ✅ (confirmed live: WB series shows 2.87% in 2023, later
  NATO-reported figures put 2025 around 3.4–5.1% depending on definition/
  source — reuse the exact same World Bank fetch pattern already in
  `build-data.mjs`, just target `EE`)
- Military personnel, per capita — World Bank `MS.MIL.TOTL.P1` — **context**
  🟢 ✅ (standard WB indicator, same helper, high confidence though not
  explicitly searched this session)
- Public opinion on national defence — Kaitseministeerium annual survey
  (Kantar Emor, "Avalik arvamus riigikaitsest") — **O** 🔴 (PDF report only,
  confirmed this session — same shape as the UK AFCAS survey, but no open
  dataset found)

## Rahandusministeerium (fin) — Finance, budget

- General government debt, % of GDP ⇄ deficit/surplus, % of GDP —
  Statistikaamet **`RR061`** — **O/C** 🟢 ✅✅ (the strongest source in this
  file: already live-verified with real values in BRIEF.md §9 — debt/GDP
  9.0%→23.5%, 2019→2024 — and this session confirmed the *same table* also
  carries the deficit series, e.g. 2023 deficit 3.4% / €1.3bn. One table
  covers both the **O** and **C** rows — good hero-indicator candidate for
  the `fin` ministry, paired)
- Tax burden, % of GDP — World Bank `GC.TAX.TOTL.GD.ZS` — **O** 🟢 ✅
  (reused directly from the UK original's pattern, works for any country)
- Real GDP per capita — Statistikaamet/Eurostat national accounts — **O**
  🟢 🔎 (standard series, high confidence it exists, exact table code not
  pinned down this session)

## Kliimaministeerium (clim) — Climate, energy, transport

- Renewable energy share (gross final consumption) — Eurostat
  **`nrg_ind_ren`** — **O** 🟢 ✅ (dataset code confirmed, 173 series
  including per-country breakdowns)
- GHG emissions — Eurostat, candidate `env_air_gge` — 🟡 🔎 (standard
  Eurostat code guessed from convention, not confirmed this session)
- Road deaths — Statistikaamet transport-safety tables — **O** 🔴 🔎
  (general search did not surface an Estonia-specific table this session —
  results were dominated by US/global road-safety statistics; needs a
  direct `stat.ee` theme-page navigation rather than a keyword search)

## Majandus- ja Kommunikatsiooniministeerium (econ) — Economy, communications

- Unemployment rate — Statistikaamet **`TT3300`** — **O** 🟢 ✅ (table code
  confirmed)
- Exports, % of GDP — World Bank `NE.EXP.GNFS.ZS` — **VFM** 🟢 ✅ (reused
  from the UK original's DBT pattern, country-agnostic)
- R&D spend, % of GDP — World Bank/Eurostat `GB.XPD.RSDV.GD.ZS` — **L** 🟢
  ✅ (reused from the UK original's DSIT pattern)
- Broadband/internet penetration — Eurostat digital-economy tables
  (candidate `isoc_r_broad_h` or similar `isoc_*` code) — 🟡 ❓ not
  researched this session

---

## Cross-cutting: EMTA (tax) as a file-based source

Confirmed this session: the EMTA open-data landing page exists at
`emta.ee/en/private-client/board-news-and-contacts/news-press-information-
statistics/statistics-and-open-data` (and the Estonian-language
`avaandmed-maksulaekumine-statistika` path), and it does publish CSV/XLSX —
but the exact per-year direct file URLs weren't surfaced by search (search
results only reached the landing/category pages). As BRIEF.md §5/§9
anticipated, EMTA is a **file fetcher**, not a JSON API — confirming the
concrete file URL is a job for a live-network session or CI probe, not
further search. Worth wiring a shared `fetchCsvOrXlsx(url)` helper (per
BRIEF.md §9) once the first concrete URL is confirmed.

## Reading this file at Этап 3

Rows marked ✅ are the safest to spec first (`validRange`, `producer`/
`compiler`, licence — BRIEF.md §6). Rows marked 🔎 need one more targeted
search/probe before they're spec-ready. Rows marked 🔴 or ❓ should not be
promised for v1 — treat them the way the UK original treats its SKIP list
(documented, revisited later, never silently fabricated in the meantime).

Current tally this pass: **10 ✅, 12 🔎, 5 🔴, 3 ❓** across 8 ministries —
comfortably over the v1 target of 30–40 indicators (BRIEF.md §10) once the
🔎 rows are pinned down, without needing the 🔴/❓ rows at all.
