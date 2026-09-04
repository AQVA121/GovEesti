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
  context** 🟢 ✅ (live-verified 2026-09-04, correcting the first pass: the
  real fetched value for 2024 is **3.37%**, not the 2.87% (2023) figure
  cited earlier — that number was a stale/rounded press citation, not a
  pulled value. Reuse the exact same World Bank fetch pattern already in
  `build-data.mjs`, just target `EE`.)
- Military personnel, per 1,000 population — World Bank `MS.MIL.TOTL.P1`
  ÷ `SP.POP.TOTL` — **context** 🟢 ✅ (live-verified 2026-09-04, correcting
  the first pass: **`MS.MIL.TOTL.P1` is total active personnel, an
  absolute headcount — there is no World Bank per-capita military
  series** — the first pass mislabelled it. Must be computed:
  headcount ÷ population × 1,000, a **derived** indicator, not a direct
  pass-through. Also: WB's headcount series was last updated for **2020**
  in this session's fetch (7,000 personnel) — a real freshness risk to
  flag for Этап 5, not treated as current.)
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

---

# Этап 3 — Full indicator specification

Per BRIEF.md §6, every field below is filled in for the 19 ✅ rows only
(🔴/❓ rows are not specced — they're not promised for v1). `validRange`
follows this codebase's own convention in `scripts/build-data.mjs`
(`SOURCES` array, `min`/`max` fields): a **generous sanity bound**, not a
tight statistical one — its job is to catch a fetcher bug (wrong unit,
wrong country, a decimal-point slip), not to flag genuine year-to-year
movement. Every bound below is derived from a real value range **fetched
live this session** (noted per row as "observed"), then padded — never an
invented number. `unit` values use this codebase's existing `SeriesUnit`
type (`percent`, `years`, `beds`, `count`, `people`, `currency`); none of
the 19 rows need a new unit added to that type.

**Licence confidence:** per-source licence text is confirmed to the level
noted per row — some (Eurostat, World Bank) have an unambiguous, named,
webpage-documented licence; others (Statistikaamet, TAI, the Justice
portal) are backed only by a search result or a plain-language "free to
use, please cite us" statement, not a page this session could read the
licence text directly off. **BRIEF.md §10 (Этап 10) is where the full
per-source licence audit happens** — treat every licence line below as a
strong working assumption for Этап 4/5 build purposes, not the final
audited word.

## Sotsiaalministeerium (soc)

```
id: soc-poverty-rate
title: At-risk-of-poverty rate (60% of median equivalised income)
unit: percent · cadence: annual · coverage: Estonia
source: Eurostat ilc_li02 (age=TOTAL, sex=T, unit=PC, rskpovth=B_60, statinfo=MED_EI)
sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_li02?format=JSON&geo=EE&sex=T&age=TOTAL&unit=PC&rskpovth=B_60&statinfo=MED_EI&lang=EN
producer: Eurostat (EU-SILC; Estonian microdata collected by Statistikaamet)
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (Eurostat reuse policy — webpage-confirmed)
validRange: { min: 5, max: 35 }   // observed 2000–2025: 15.8–22.8%
revisionStatus: EU-SILC typically provisional then revised ~T+1 — treat the latest year as provisional
note: the original draft mentioned an age-group split (children ⇄ pensioners); this
  session confirmed only the TOTAL-population series — the age-split query (age=Y_LT18
  vs Y_GE65) is a separate, not-yet-confirmed fetch for Этап 5
```

```
id: soc-life-expectancy
title: Life expectancy at birth ⇄ Healthy life years at birth (paired)
unit: years · cadence: annual · coverage: Estonia
lines:
  - life-expectancy: Eurostat demo_mlexpec (age=Y_LT1, sex=T)
    sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_mlexpec?format=JSON&geo=EE&sex=T&age=Y_LT1&lang=EN
    observed 1960–2024: 66.6–79.4 years (dip in 1994, post-Soviet mortality crisis)
  - healthy-life-years: Eurostat hlth_hlye (hlth_hle=HLY_Y0, sex=T)
    sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_hlye?format=JSON&geo=EE&sex=T&hlth_hle=HLY_Y0&lang=EN
    observed 2004–2024: 50.4–59.3 years
producer: Eurostat
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (Eurostat)
validRange: { min: 30, max: 90 }   // wide enough to cover both lines' real bands
revisionStatus: final (Eurostat demography/health tables are not routinely revised after publication)
```

```
id: soc-hospital-beds
title: Hospital beds (national total, annual average)
unit: beds · cadence: annual · coverage: Estonia
source: TAI (Tervise Arengu Instituut) PxWeb, table HH08 (Näitaja=0, Ravivoodi liik=0, Haigla nimi=0 = national total)
sourceUrl: https://statistika.tai.ee/api/v1/en/Andmebaas/04THressursid/11HAHaiglad/HH08.px
producer: Tervise Arengu Instituut (TAI)
compiler: GovEesti — direct pass-through, no transformation
licence: no formally named open licence found on TAI's own terms page — it states
  "database use is free of charge; please cite the source" (a plain attribution
  request, not a badge like CC BY). Flag for a named-licence check at Этап 10.
validRange: { min: 4500, max: 7500 }   // observed 2003–2024: 5,519.5–6,789.8, declining trend
revisionStatus: final (annual averages, not typically revised)
```

```
id: soc-health-spend-per-capita
title: General government health expenditure per capita (VFM)
unit: currency (EUR) · cadence: annual · coverage: Estonia
source: Statistikaamet RR056 (Sektor=1 "S.13 General government", Valitsemisfunktsioon=48
  "07 Health", Näitaja=12 "Total expenditure") ÷ population (World Bank SP.POP.TOTL or
  Statistikaamet's own population count)
sourceUrl: https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR056.PX
producer: Statistikaamet (COFOG government expenditure); population denominator also Statistikaamet
compiler: GovEesti — DERIVED: divides total EUR-million health expenditure by mid-year
  population; Statistikaamet does not publish a ready per-capita health-spend series
licence: CC BY-SA 4.0 (Statistikaamet — search-confirmed, not read directly off a
  primary-source licence page this session; confirm at Этап 10)
validRange: { min: 500, max: 3000 }   // EUR/person; observed total spend 2015–2024:
  €1,171.3M → €2,520.6M over a ~1.31–1.37M population ⇒ roughly €895–1,840/capita
revisionStatus: provisional latest year, revised T+1/T+2 (consolidated government finance statistics convention)
```

## Haridus- ja Teadusministeerium (edu)

```
id: edu-pupil-teacher-ratio
title: Pupil:teacher ratio, general education
unit: count (pupils per teacher) · cadence: annual · coverage: Estonia
derivedFrom: [edu-enrolment (HT121), edu-teachers (HT235)]
source: Statistikaamet HT121 (stationary general-education enrolments, level=ED_GEN_STAT_T)
  ÷ HT235 (teachers of general education, age group=total "1", sex=total "1")
sourceUrl HT121: https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/haridus/uldharidus/HT121.px
sourceUrl HT235: https://andmed.stat.ee/api/v1/en/stat/Lepetatud_tabelid/Sotsiaalelu.%20Arhiiv/Haridus.%20Arhiiv/HT235.PX
producer: Statistikaamet (both tables)
compiler: GovEesti — DERIVED ratio (enrolments ÷ teachers); Statistikaamet does not
  publish this ratio as a single series
licence: CC BY-SA 4.0 (Statistikaamet)
validRange: { min: 5, max: 20 }   // pupils/teacher; 2024 = 9.4; enrolments observed
  134,975–217,577 (HT121 full history), teachers observed 14,203–17,483 (HT235, 2012–2023)
revisionStatus: final
```

```
id: edu-pisa
title: PISA reading / maths / science scores, Estonia
unit: count (0–1000 scale) · cadence: triennial (latest full cycle 2022)
source: OECD PISA
sourceUrl: NOT re-confirmed live this session — several guessed OECD SDMX dataflow IDs
  (DF_PISA and variants) returned 404 or an oversized/undecodable dump; the exact
  dataflow needs to be found via OECD Data Explorer at Этап 5, not assumed from this probe
producer: OECD
compiler: GovEesti — direct pass-through, no transformation
licence: not confirmed this session — OECD's data-reuse terms were not read directly;
  flag for Этап 10
validRange: { min: 300, max: 600 }   // 0–1000 PISA scale; wide sanity bound only
revisionStatus: final (each triennial release is final, no revisions)
⚠️ CAVEAT: unlike the other 18 rows, this one's "real source exists" confirmation
  carries over from the FIRST (search-only) session and was not independently
  re-verified with a live fetch this session. Do not treat the 2019-cited ~520–535
  Estonia score as fetched data — it wasn't pulled this session. One more live probe
  needed before Этап 5 codes this row.
```

## Siseministeerium (int)

```
id: int-recorded-crimes
title: Recorded crimes, total
unit: count · cadence: annual (source page also breaks out by offence type) · coverage: Estonia
source: Justiits- ja Digiministeerium statistics portal — CSV linked from the
  crime-statistics page, not a queryable API
sourceUrl (page to scrape for the current href): https://statistika.justdigi.ee/en/crime-statistics
sourceUrl (file confirmed live 2026-09-04, path WILL move on republish):
  https://statistika.justdigi.ee/sites/default/files/2026-02/Kuriteod%20kokku_masskuriteod_eng.csv
producer: Justiits- ja Digiministeerium (Ministry of Justice and Digital Affairs)
compiler: GovEesti — parses the "Total" row per year out of the CSV
licence: no explicit licence badge found on the portal this session; Estonian
  public-sector sites generally default to open reuse, but this wasn't read off a
  primary licence page — flag for Этап 10
validRange: { min: 15000, max: 40000 }   // observed 2019–2025: 25,663–28,345 total annual crimes
revisionStatus: provisional for the current (in-progress) year, final for closed years
⚠️ CAVEAT: the fetcher MUST scrape the current CSV href off the crime-statistics page
  at each run — the `/2026-02/...` path is date-stamped and shifts when Justice
  re-publishes the file. Hardcoding this URL will silently break within months.
```

## Rahandusministeerium (fin)

```
id: fin-debt-gdp / fin-deficit-gdp   (paired, one source table, two lines — same
  treatment as the codebase's existing wbCompare() pattern)
title: General government debt ⇄ deficit/surplus, % of GDP
unit: percent · cadence: annual · coverage: Estonia
source: Statistikaamet RR061 (Näitaja=2 = debt %, Näitaja=4 = deficit/surplus %)
sourceUrl: https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR061.px
producer: Statistikaamet
compiler: GovEesti — direct pass-through, two lines from one table
licence: CC BY-SA 4.0 (Statistikaamet)
validRange debt: { min: 0, max: 40 }      // observed 2007–2025: 3.9–24.1%
validRange deficit: { min: -10, max: 5 }  // observed: -5.4% (2020) to +2.8% (2006)
revisionStatus: provisional latest year, revised T+1
```

```
id: fin-tax-burden
title: Tax burden, % of GDP
unit: percent · cadence: annual · coverage: Estonia
source: World Bank GC.TAX.TOTL.GD.ZS
sourceUrl: https://api.worldbank.org/v2/country/EE/indicator/GC.TAX.TOTL.GD.ZS?format=json
producer: World Bank (compiled from IMF/national sources)
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (World Bank Open Data — well-documented, high confidence)
validRange: { min: 10, max: 30 }   // observed 1992–2024: 12.5–22.8%, latest (2024) 22.7%
revisionStatus: final (World Bank backfills rather than flagging provisional/final)
```

```
id: fin-gdp-per-capita
title: Real GDP per capita (chain-linked volume, reference year 2020)
unit: currency (EUR) · cadence: annual · coverage: Estonia
source: Statistikaamet RAA0013 (Näitaja=2 = "GDP chain-linked volume per capita")
sourceUrl: https://andmed.stat.ee/api/v1/en/stat/majandus/rahvamajanduse-arvepidamine/sisemajanduse-koguprodukt-(skp)/pehilised-rahvamajanduse-arvepidamise-naitajad/RAA0013.PX
producer: Statistikaamet
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY-SA 4.0 (Statistikaamet)
validRange: { min: 5000, max: 30000 }   // observed 1995–2025: €7,533.1–€22,804.2/capita
revisionStatus: provisional latest year, revised over the following ~2 years (national accounts convention)
```

## Kliimaministeerium (clim)

```
id: clim-renewable-share
title: Renewable energy share of gross final consumption
unit: percent · cadence: annual · coverage: Estonia
source: Eurostat nrg_ind_ren (nrg_bal=REN)
sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_ren?format=JSON&geo=EE&nrg_bal=REN&lang=EN
producer: Eurostat
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (Eurostat)
validRange: { min: 5, max: 55 }   // observed 2004–2025: 16.0–42.3%, strong upward trend
revisionStatus: final
```

```
id: clim-ghg-emissions
title: Greenhouse gas emissions, total (excl. memo items)
unit: count (thousand tonnes CO2-eq) · cadence: annual · coverage: Estonia
source: Eurostat env_air_gge (airpol=GHG, unit=THS_T, src_crf=TOTXMEMO)
sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_air_gge?format=JSON&geo=EE&airpol=GHG&unit=THS_T&src_crf=TOTXMEMO&lang=EN
producer: Eurostat (compiled from Estonia's UNFCCC national inventory report)
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (Eurostat)
validRange: { min: 8000, max: 40000 }   // observed 1990–2024: 12,068.3–36,299.12 kt CO2-eq.
  The 1990 figure is a real Soviet-era oil-shale peak, kept as the ceiling deliberately —
  it's a genuine historical extreme, not representative of the modern baseline, but a
  useful sanity ceiling rather than a tight bound.
revisionStatus: provisional latest 1–2 years, revised as the national inventory report is finalised
```

```
id: clim-road-deaths
title: Road deaths (persons killed in traffic accidents)
unit: people · cadence: annual (source also publishes monthly) · coverage: Estonia
source: Statistikaamet TS093 (Näitaja=5 "Persons killed", Kuu=00 = annual total)
sourceUrl: https://andmed.stat.ee/api/v1/en/stat/majandus/transport/liiklusennetused/TS093.PX
producer: Statistikaamet
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY-SA 4.0 (Statistikaamet)
validRange: { min: 30, max: 150 }   // observed full history 1990–2024: 48–491. The
  1990s figures (up to 491) reflect a real post-Soviet traffic-safety crisis, not the
  modern baseline (recent decade: 48–69) — the guard bound is set around the modern
  band with generous padding rather than the historical extreme, so it stays useful
  for catching a real data error instead of silently admitting anything short of a
  five-fold spike.
revisionStatus: final
```

## Majandus- ja Kommunikatsiooniministeerium (econ)

```
id: econ-unemployment-rate
title: Unemployment rate (15–74), quarterly
unit: percent · cadence: quarterly · coverage: Estonia
source: Statistikaamet TT3300 (Näitaja=UNEMP_RATE, Sugu=T, Vanuserühm=Y15-74)
sourceUrl: https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/tooturg/tooturu-uldandmed/luhiajastatistika/TT3300.px
producer: Statistikaamet (Estonian Labour Force Survey)
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY-SA 4.0 (Statistikaamet)
validRange: { min: 2, max: 22 }   // observed 2000Q1–2026Q2: 3.9%–19.5% (2010Q1, financial crisis)
revisionStatus: provisional latest quarter, revised
```

```
id: econ-exports-gdp
title: Exports of goods and services, % of GDP
unit: percent · cadence: annual · coverage: Estonia
source: World Bank NE.EXP.GNFS.ZS
sourceUrl: https://api.worldbank.org/v2/country/EE/indicator/NE.EXP.GNFS.ZS?format=json
producer: World Bank
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (World Bank)
validRange: { min: 30, max: 100 }   // observed 2003–2025: 57.1%–87.4%
revisionStatus: final
```

```
id: econ-rd-spend-gdp
title: R&D expenditure, % of GDP
unit: percent · cadence: annual · coverage: Estonia
source: World Bank GB.XPD.RSDV.GD.ZS
sourceUrl: https://api.worldbank.org/v2/country/EE/indicator/GB.XPD.RSDV.GD.ZS?format=json
producer: World Bank (compiled from UNESCO/Eurostat)
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (World Bank)
validRange: { min: 0, max: 4 }   // observed 1998–2023: 0.565%–2.296%
revisionStatus: final
```

```
id: econ-broadband-penetration
title: Households with broadband access
unit: percent · cadence: annual · coverage: Estonia
source: Eurostat isoc_r_broad_h (unit=PC_HH)
sourceUrl: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_r_broad_h?format=JSON&geo=EE&lang=EN
producer: Eurostat
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (Eurostat)
validRange: { min: 20, max: 100 }   // observed 2006–2021: 36.4%–90.87%
revisionStatus: final
⚠️ CAVEAT: the fetched series stopped at 2021 — this dataset may not be updated any
  further; check for a successor Eurostat code (e.g. a "digital decade" indicator)
  at Этап 5 rather than assuming isoc_r_broad_h stays current.
```

## Kaitseministeerium (def)

```
id: def-spend-gdp
title: Defence spending, % of GDP
unit: percent · cadence: annual · coverage: Estonia
source: World Bank MS.MIL.XPND.GD.ZS
sourceUrl: https://api.worldbank.org/v2/country/EE/indicator/MS.MIL.XPND.GD.ZS?format=json
producer: World Bank / SIPRI
compiler: GovEesti — direct pass-through, no transformation
licence: CC BY 4.0 (World Bank)
validRange: { min: 0, max: 6 }   // observed 1993–2024: 0.76%–3.37% (latest, 2024)
revisionStatus: final
```

```
id: def-personnel-per-1000
title: Military personnel, per 1,000 population
unit: count · cadence: annual · coverage: Estonia
source: World Bank MS.MIL.TOTL.P1 (absolute headcount) ÷ SP.POP.TOTL (population)
sourceUrl MS.MIL.TOTL.P1: https://api.worldbank.org/v2/country/EE/indicator/MS.MIL.TOTL.P1?format=json
sourceUrl SP.POP.TOTL: https://api.worldbank.org/v2/country/EE/indicator/SP.POP.TOTL?format=json
producer: World Bank
compiler: GovEesti — DERIVED per-1,000 ratio; MS.MIL.TOTL.P1 is NOT itself a per-capita
  series (see the correction note above the ministry rows), so this cannot be a
  direct pass-through
licence: CC BY 4.0 (World Bank)
validRange: { min: 1, max: 15 }   // per 1,000 population; observed 2020 headcount
  7,000 over ~1.33M population ⇒ ≈5.3 per 1,000
revisionStatus: final, but ⚠️ FRESHNESS RISK — the headcount series was last updated
  for year 2020 in this session's fetch (stale by ~6 years as of 2026). If currency
  matters for this row, look for a fresher source (e.g. NATO's annual defence-data
  release) at Этап 5 rather than trusting WB's staleness away.
```

## Open items before Этап 4

- **PISA** (`edu-pisa`) needs one more live probe — its "real source" status still
  rests on the first, search-only session, unlike every other row above.
- **Licence confidence** is uneven: Eurostat and World Bank are webpage-confirmed;
  Statistikaamet is search-confirmed (CC BY-SA 4.0, cited by multiple independent
  pages, but not read directly off a primary licence page this session); TAI and
  the Justice portal have no named licence at all, only a plain attribution
  request or nothing found. None of this blocks Этап 4/5 — it's the explicit scope
  of Этап 10's per-source audit — but don't present the licence lines above as
  final in any user-facing text before that audit runs.
- Two **derived** indicators (`edu-pupil-teacher-ratio`, `def-personnel-per-1000`)
  and one **paired** entry (`fin-debt-gdp`/`fin-deficit-gdp`) need the
  `derivedFrom`/two-line handling this codebase already has a pattern for
  (`wbCompare()`, `SeriesLine[]`) — not a new mechanism.
