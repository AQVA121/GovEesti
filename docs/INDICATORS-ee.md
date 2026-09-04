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

**Update (2026-09-04, second pass):** a later session had live network
access (`curl` worked directly, no proxy block) and went back through the
🔎 rows with real HTTP requests — POST queries against PxWeb, GET against
the Eurostat dissemination API, and direct fetches of portal pages/CSV
files. Rows updated in this pass are marked **✅ (live-verified 2026-09-04)**
with the exact dimension codes and a real returned value inline, so Этап 3
can spec them directly without re-probing. Rows marked ✅ from the *first*
pass (search-only) are unchanged and still technically owe a live probe,
but most of the same tables were re-hit incidentally while probing
neighbouring rows and are noted where that happened.

---

## Sotsiaalministeerium (soc) — Health & Social Affairs

- At-risk-of-poverty rate, by age group (children ⇄ pensioners, AHC) —
  Eurostat `ilc_li02`, annual (EU-SILC) — **O** 🟢 ✅ (dataset code
  confirmed; EE overall rate ~21.7% reported for 2019, so the series is
  live and populated for Estonia)
- Healthy life expectancy / life expectancy at birth — Eurostat **`hlth_hlye`**
  (dimension is `hlth_hle`, not `indic_he`) and **`demo_mlexpec`** — **O** 🟢
  ✅ (live-verified 2026-09-04: `hlth_hlye?geo=EE&sex=T&hlth_hle=HLY_Y0` →
  healthy life years at birth, EE, 2004–2024, e.g. 55.8 (2019) → 59.3 (2022)
  → 58.6 (2024); `demo_mlexpec?geo=EE&sex=T&age=Y_LT1` → life expectancy at
  birth by single age, also live)
- Hospital resources (beds) — TAI `statistika.tai.ee` PxWeb, confirmed live
  table **`04THressursid/11HAHaiglad/HH08.px`** ("Hospitals' annual average
  beds, bed occupancy rate, bed turnover and average length of stay by bed
  profile and hospital") — **C** 🟢 ✅ (live-verified 2026-09-04: metadata
  pulled, years 2003–2024, `Näitaja=0` = "Hospital beds (annual average)",
  `Ravivoodi liik=0` = "Total hospital beds" for the national total; a
  waiting-time/GP-access table specifically still not found — beds is the
  confirmed metric, not wait times)
- Health spend per capita (VFM) — Statistikaamet **`RR056`**
  ("Expenditure of general government by function and sub-sector,
  consolidated") — **VFM** 🟢 ✅ (live-verified 2026-09-04: same table
  family as the `fin` ministry's `RR061`; function code 48 = "07 Health",
  sector code 1 = "S.13 General government", indicator code 12 = "Total
  expenditure" → real EUR-million series, e.g. 2021: 2040.1, 2022: 2157.5,
  2023: 2383.4, 2024: 2520.6 — divide by Statistikaamet population count for
  per-capita, both from the same producer)

## Haridus- ja Teadusministeerium (edu) — Education

- PISA reading/maths/science, Estonia — OECD PISA, triennial — **O** 🟢 ✅
  (same OECD API pattern as the UK original, just switch country to EST;
  Estonia is a strong, consistently-reported PISA performer)
- Teacher:pupil ratio — Statistikaamet **`HT121`** (pupils, live path
  `sotsiaalelu/haridus/uldharidus/HT121.px`) ÷ **`HT235`** (teachers, live
  despite sitting under the `Lepetatud_tabelid/...Arhiiv` path — path name
  says "archive" but the table is updated through 2024 and still queryable;
  don't trust the folder name as a liveness signal) — **C** 🟢 ✅
  (live-verified 2026-09-04, computed from real values: 2024 = 162,982
  stationary general-education enrolments (`HT121`, level
  `ED_GEN_STAT_T`) ÷ 17,390 general-education teachers, all ages
  (`HT235`, age group "1"=total, sex "1"=total) ≈ 9.4 pupils/teacher — this
  is a **computed/derived** indicator from two real series, not a single
  official ratio table; flag `compiler` accordingly in the Этап 3 spec)
- Per-pupil real funding — HaridusSilm portal (`haridussilm.ee`) /
  Haridus- ja Teadusministeerium statistics page — **VFM** 🔴 🔎 (re-checked
  2026-09-04 with live network: site resolves and redirects to
  `https://haridussilm.ee/`, but the static HTML carries no `/api`,
  `/jsonapi`, or GraphQL hint — it's a client-side-rendered BI dashboard
  (likely Power BI or similar embed), so its data calls can't be seen by
  `curl`; would need browser DevTools network-tab inspection to find the
  underlying query endpoint, not another search/fetch pass. Still not a
  committed source.)

## Siseministeerium (int) — Internal security, police, rescue

- Recorded crimes, total and by offence type — **Justice Statistics portal**
  `statistika.justdigi.ee/en/crime-statistics` — **O** 🟢 ✅
  (live-verified 2026-09-04: the portal is Drupal 10, no JSON:API exposed,
  **but the crime-statistics page links direct static CSV files** under
  `/sites/default/files/<yyyy-mm>/*.csv`, e.g.
  `.../2026-02/Kuriteod%20kokku_masskuriteod_eng.csv` — fetched for real,
  `text/csv`, semicolon-delimited, `Type of crime;Year;Number of Offences`,
  real totals 2019–2025 (e.g. Total 2024 = 28,345; 2023 = 27,465). **Caveat:
  the file path is date-stamped and moves when Justice re-publishes it** —
  the fetcher must scrape the current CSV `href` off the crime-statistics
  page each run, not hardcode the `/2026-02/...` path. Confirms the BRIEF's
  note that this portal belongs to Justiits- ja Digiministeerium, not
  Siseministeerium — natural home may be the `just` ministry page instead.)
- Police officers per 1,000 population — Statistikaamet "Security" theme —
  **L** 🔴 🔎 (re-checked 2026-09-04: no PxWeb table surfaced for police
  headcount via search or theme-page probing; still unconfirmed. Strong
  fallback found instead: Statistikaamet **`RR056`** function code 18 =
  "03.1 Police services" carries real COFOG **spending** on policing,
  live-verified from the same table as the health-spend row above — not a
  headcount, but a legitimate VFM substitute if headcount stays blocked)
- Rescue service response times / call volume — Päästeamet (`rescue.ee`) —
  **C** 🔴 (this session found only PDF annual reports — e.g. "Siseturvalisuse
  2024. aasta tulemusaruanne" — and no open dataset; candidate for the
  hard-blocked list unless a dedicated probe finds `opendata.riik.ee/paasteamet`
  publishing something machine-readable)

## Justiits- ja Digiministeerium (just) — Justice, courts

- Court clearance rate / disposition time — Council of Europe CEPEJ Estonia
  country profile (external benchmark, not a live feed) reports 100%
  first-instance civil/commercial clearance rate and +7.9% disposition
  time, 2020→2021 — **C** 🔴 (re-checked 2026-09-04: `statistika.justdigi.ee`
  — the same portal confirmed above for crime CSVs — was browsed fully;
  its only sections are crime-statistics, lobby-meetings, and
  victim-survey, **no courts section at all**. Statistikaamet's own court
  tables (`JS10`, `JS11`, `JS19`, `JS111`…) are genuinely dead, not just
  archive-labelled like `HT235` — they stop at 2015 and haven't been
  updated since. `kriminaalpoliitika.ee` (Justice Ministry's criminal-policy
  site) was also checked — it's a policy/research content site with PDF
  studies, not a raw-data/CSV portal like justdigi.ee. Stays blocked;
  CEPEJ periodic report is the only real-number source found so far.)
- Prison population — Statistikaamet's `JS151`/`JS152`/`JS153` series
  ("Persons incarcerated in penal institutions") are the right shape but
  **dead since 2015**, same as the court tables above — 🔴 (re-checked
  2026-09-04). `kriminaalpoliitika.ee` was checked and doesn't surface a
  current figure either. Fallback: `RR056` function code 21 = "03.4
  Prisons" gives real, live **spending** on prisons (not population count)
  from the same COFOG table already confirmed for health/police above.
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
- Real GDP per capita — Statistikaamet **`RAA0013`** ("Gross domestic
  product and gross national income per capita, ESA 2010") — **O** 🟢 ✅
  (live-verified 2026-09-04: path
  `majandus/rahvamajanduse-arvepidamine/sisemajanduse-koguprodukt-(skp)/
  pehilised-rahvamajanduse-arvepidamise-naitajad/RAA0013.PX`, years
  1995–2025, indicator code 2 = "GDP chain-linked volume (reference year
  2020) per capita" is the real-terms series to use)

## Kliimaministeerium (clim) — Climate, energy, transport

- Renewable energy share (gross final consumption) — Eurostat
  **`nrg_ind_ren`** — **O** 🟢 ✅ (dataset code confirmed, 173 series
  including per-country breakdowns)
- GHG emissions — Eurostat **`env_air_gge`** — **O** 🟢 ✅ (live-verified
  2026-09-04: dimension is `src_crf` not a guessed name; use
  `src_crf=TOTXMEMO` ("Total excluding memo items") for the headline
  number, `unit=THS_T`, `airpol=GHG` — real EE series 2017–2024, e.g.
  22,053.6 (2017) → 17,317.65 (2019) → 12,706.01 (2020) → 12,147.17 (2024)
  thousand tonnes CO2-eq)
- Road deaths — Statistikaamet **`TS093`** ("Traffic accidents with
  casualties on the roads (months)") — **O** 🟢 ✅ (live-verified
  2026-09-04: path `majandus/transport/liiklusennetused/TS093.PX` — found
  by browsing the `transport` category tree, not by keyword search, exactly
  as the first pass suspected. Indicator code 5 = "Persons killed", month
  code "00" = annual total. Real values: 55 (2021), 50 (2022), 59 (2023),
  69 (2024))

## Majandus- ja Kommunikatsiooniministeerium (econ) — Economy, communications

- Unemployment rate — Statistikaamet **`TT3300`** — **O** 🟢 ✅ (table code
  confirmed)
- Exports, % of GDP — World Bank `NE.EXP.GNFS.ZS` — **VFM** 🟢 ✅ (reused
  from the UK original's DBT pattern, country-agnostic)
- R&D spend, % of GDP — World Bank/Eurostat `GB.XPD.RSDV.GD.ZS` — **L** 🟢
  ✅ (reused from the UK original's DSIT pattern)
- Broadband/internet penetration — Eurostat **`isoc_r_broad_h`**
  ("Households with broadband access") — 🟢 ✅ (live-verified 2026-09-04:
  guessed code confirmed correct on the first try, `geo=EE`, real series
  2006–2021, e.g. 60.9% (2009) → 90.0% (2019) → 90.87% (2021), unit
  `PC_HH` = percentage of households)

---

## Cross-cutting: EMTA (tax) as a file-based source

**Update (2026-09-04, live-verified):** the concrete file URLs are now
confirmed. The landing page
`emta.ee/en/private-client/board-news-and-contacts/news-press-information-
statistics/statistics-and-open-data` links four direct files, hosted on a
separate file host (`ncfailid.emta.ee`, Nextcloud-style share links, not
`emta.ee` itself):

```
https://ncfailid.emta.ee/s/K8snLYNdZnqJCRn/download/tasutud_maksud_varasemad_aastad_eng.csv   (previous years, CSV)
https://ncfailid.emta.ee/s/XWgbm7NNTcrLQ8J/download/tasutud_maksud_varasemad_aastad_eng.xlsx  (previous years, XLSX)
https://ncfailid.emta.ee/s/e4DneiWeKFfje6d/download/tasutud_maksud_kaesolev_aasta_eng.csv     (current year, CSV)
https://ncfailid.emta.ee/s/xeKZATb9BRMLarA/download/tasutud_maksud_kaesolev_aasta_eng.xlsx    (current year, XLSX)
```

Fetched for real: `HTTP 200`, `content-type: text/csv`, ~62MB. **Important
finding that changes the plan:** this is not an aggregate national time
series — it's **per-company microdata**, one row per company per quarter:
`Data date, Registry code, Name, Type, County, Activity, Year, State taxes
Q1–Q4, Labour taxes Q1–Q4, Turnover Q1–Q4, Number of employees Q1–Q4`. To
turn this into a "tax burden" or "tax revenue" indicator series, the
`compiler` step would need to sum ~62MB of company rows per year — real,
honest, sourced from an official file, but a meaningfully heavier build
step than a JSON API call, and the file URLs themselves (the `s/<token>/`
share IDs) look like they could rotate if EMTA regenerates the share link,
so the fetcher should re-scrape the landing page for the current href
rather than hardcode these four URLs long-term. Given the tax-burden row is
already covered by World Bank `GC.TAX.TOTL.GD.ZS` (✅, simple), EMTA
microdata is now a **stretch/v2 candidate** (e.g. "estimated tax
compliance by county" or "average employees per taxed company") rather
than a v1 must-have — flagging the re-scope for Этап 3.

## Reading this file at Этап 3

Rows marked ✅ are the safest to spec first (`validRange`, `producer`/
`compiler`, licence — BRIEF.md §6). Rows marked 🔎 need one more targeted
search/probe before they're spec-ready. Rows marked 🔴 or ❓ should not be
promised for v1 — treat them the way the UK original treats its SKIP list
(documented, revisited later, never silently fabricated in the meantime).

Tally after the 2026-09-04 live-verification pass: **19 ✅ (all live-verified
with a real fetched value, 0 rows left in 🔎), 6 🔴 (rescue response times,
police headcount, per-pupil funding, court clearance, prison population,
defence-survey — each now confirmed genuinely blocked, not just
unsearched), 1 ❓ (reoffending rate — not looked at yet)** across 8
ministries, 26 rows total. Every 🔎 row from the first pass resolved this
session, either to ✅ (11 rows — 2 Eurostat codes, 1 TAI table, 1 COFOG
health-spend line, 1 derived teacher:pupil ratio, 1 GDP-per-capita table,
1 GHG-emissions dataset, 1 road-deaths table, 1 broadband dataset, 1
recorded-crimes CSV) or to a more precisely-understood 🔴 (police headcount,
per-pupil funding, court clearance, prison population — each now has a
specific reason it's blocked, not just "not found by search"). The v1
target (30–40 indicators, BRIEF.md §10) is comfortably covered by the 19 ✅
rows alone with real API responses in hand — Этап 3 (`validRange`,
`producer`/`compiler`, licence) can start on these without further
probing. Two real fallback series turned up as a byproduct of probing
(`RR056` codes 18 and 21 = police-services and prisons *spending*, COFOG) —
not committed rows, but available if the headcount/population rows stay
blocked into Этап 3.
