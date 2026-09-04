import { realLine, realPoints, type TrendSeries } from "./data";

export type Department = {
  code: string; // url slug
  name: string; // short, for tab
  fullName: string;
  pageTitle?: string; // H1 override; defaults to `Department for {fullName}`
  blurb: string;
  synthesis: string;
  themes: string[];
  // Treemap tile size. See SPEND_BASIS below — currently an equal-weight
  // placeholder (no fabricated per-ministry budget figure), not a fetched or
  // hand-sourced series.
  spendBn: number;
  hero: TrendSeries;
  core: TrendSeries[];
  supporting?: TrendSeries[];
};

// ----- formatting helpers -----
// Kept intentionally minimal: only what the 19 confirmed-source indicators
// below actually need (docs/INDICATORS-ee.md, Этап 3 spec).
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtEur = (v: number) => `€${Math.round(v).toLocaleString("en-GB")}`;
const fmtRatio = (v: number) => `${v.toFixed(1)} : 1`;
const fmtCount = (v: number) => `${Math.round(v).toLocaleString("en-GB")}`;
const fmtBeds = (v: number) => `${Math.round(v).toLocaleString("en-GB")} beds`;
const fmtYears = (v: number) => `${v.toFixed(1)} yrs`;
const fmtKt = (v: number) => `${Math.round(v).toLocaleString("en-GB")} kt CO₂e`;
const fmtPer1000 = (v: number) => `${v.toFixed(1)} / 1,000`;

/**
 * Provenance for the treemap tile sizing. Unlike every *series* (which is
 * fetched and byte-hashed in CI), a real per-ministry budget figure has not
 * been sourced yet — a first attempt at pulling Estonia's 2025 state budget
 * by valitsemisala (governance area) via web search only surfaced fragmented
 * sub-line items (e.g. specific salary-increase allocations), not clean,
 * comparable totals for each ministry. Rather than presenting an
 * approximate-looking number that wasn't actually confirmed against a
 * primary source, every ministry is sized equally for now. Replace with real
 * figures (e.g. from Rahandusministeerium's riigieelarve seletuskiri annex
 * tables) once confirmed — do not guess individual values in the meantime.
 */
export const SPEND_BASIS = {
  source: "Not yet sourced",
  // Live-verified 2026-09-05: the ministry's own budget-year landing page,
  // not the specific per-ministry breakdown (that's the unconfirmed part).
  url: "https://www.fin.ee/riigi-rahandus-ja-maksud/riigieelarve-ja-eelarvestrateegia/2025-riigieelarve",
  asOf: "n/a",
  measure: "Equal-weight placeholder (no confirmed per-ministry total yet)",
  note: "Every ministry is sized equally on the treemap until a real, confirmed per-ministry budget figure is found — see the comment above this constant.",
} as const;

// ============================================================
// Sotsiaalministeerium (soc) — Health & Social Affairs
// ============================================================
const socPovertyRate: TrendSeries = {
  id: "soc-poverty-rate",
  title: "At-risk-of-poverty rate",
  subtitle: "60% of median equivalised income, total population",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "down",
  source: "Eurostat (EU-SILC; Estonian microdata collected by Statistikaamet)",
  sourceUrl:
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ilc_li02?format=JSON&geo=EE&sex=T&age=TOTAL&unit=PC&rskpovth=B_60&statinfo=MED_EI&lang=EN",
  cadence: "annual",
  points: realPoints("soc-poverty-rate"),
  annotations: [],
};

const socLifeExpectancy: TrendSeries = {
  id: "soc-life-expectancy",
  title: "Life expectancy at birth ⇄ healthy life years at birth",
  coverage: "Estonia",
  unit: "years",
  format: fmtYears,
  shortFormat: fmtYears,
  goodDirection: "up",
  source: "Eurostat",
  sourceUrl:
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_mlexpec?format=JSON&geo=EE&sex=T&age=Y_LT1&lang=EN",
  cadence: "annual",
  points: realPoints("soc-life-expectancy"),
  lines: [
    { id: "life-expectancy", label: "Life expectancy", points: realLine("soc-life-expectancy", "life-expectancy") },
    { id: "healthy-life-years", label: "Healthy life years", points: realLine("soc-life-expectancy", "healthy-life-years") },
  ],
  annotations: [],
};

const socHospitalBeds: TrendSeries = {
  id: "soc-hospital-beds",
  title: "Hospital beds",
  subtitle: "National total, annual average",
  coverage: "Estonia",
  unit: "beds",
  format: fmtBeds,
  shortFormat: fmtBeds,
  goodDirection: "up",
  source: "Tervise Arengu Instituut (TAI)",
  sourceUrl: "https://statistika.tai.ee/api/v1/en/Andmebaas/04THressursid/11HAHaiglad/HH08.px",
  cadence: "annual",
  points: realPoints("soc-hospital-beds"),
  annotations: [],
};

const socHealthSpendPerCapita: TrendSeries = {
  id: "soc-health-spend-per-capita",
  title: "General government health expenditure per capita",
  coverage: "Estonia",
  unit: "currency",
  format: fmtEur,
  shortFormat: fmtEur,
  goodDirection: "up",
  vfm: true,
  source: "Statistikaamet (RR056 COFOG expenditure ÷ population)",
  sourceUrl:
    "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR056.PX",
  cadence: "annual",
  points: realPoints("soc-health-spend-per-capita"),
  methodology: "Computed: total general-government health expenditure (RR056, function 07) ÷ mid-year population. Not published by Statistikaamet as a single ready series.",
  annotations: [],
};

// ============================================================
// Haridus- ja Teadusministeerium (edu) — Education
// ============================================================
const eduPupilTeacherRatio: TrendSeries = {
  id: "edu-pupil-teacher-ratio",
  title: "Pupil:teacher ratio",
  subtitle: "General education",
  coverage: "Estonia",
  unit: "count",
  format: fmtRatio,
  shortFormat: fmtRatio,
  goodDirection: "down",
  source: "Statistikaamet (HT121 enrolments ÷ HT235 teachers)",
  sourceUrl: "https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/haridus/uldharidus/HT121.px",
  cadence: "annual",
  points: realPoints("edu-pupil-teacher-ratio"),
  methodology: "Computed: stationary general-education enrolments (HT121) ÷ general-education teachers, all ages (HT235). Statistikaamet does not publish this ratio directly.",
  annotations: [],
};

// ============================================================
// Siseministeerium (int) — Internal security
// ============================================================
const intRecordedCrimes: TrendSeries = {
  id: "int-recorded-crimes",
  title: "Recorded crimes, total",
  coverage: "Estonia",
  unit: "count",
  format: fmtCount,
  shortFormat: fmtCount,
  goodDirection: "down",
  source: "Justiits- ja Digiministeerium (statistics portal)",
  sourceUrl: "https://statistika.justdigi.ee/en/crime-statistics",
  cadence: "annual",
  points: realPoints("int-recorded-crimes"),
  caveat: "Source publishes this as a direct CSV download whose file path is date-stamped and moves on republish, not a stable API endpoint — the fetcher must scrape the current link from the crime-statistics page each run.",
  annotations: [],
};

// ============================================================
// Justiits- ja Digiministeerium (just) — Justice, courts
// ============================================================
// No indicator with a confirmed, live source exists yet for this ministry —
// court-statistics tables at Statistikaamet stopped updating in 2015, and
// the Justice statistics portal (statistika.justdigi.ee) has no courts or
// prisons section (see docs/INDICATORS-ee.md). Rather than omit the ministry
// entirely or invent a number, this hero series is explicitly labelled as
// unsourced — it renders the app's normal "no source yet" placeholder.
const justNoSourceYet: TrendSeries = {
  id: "just-no-source-yet",
  title: "No confirmed indicator source yet",
  subtitle: "Court clearance rate and prison population were researched but blocked",
  coverage: "Estonia",
  unit: "count",
  format: fmtCount,
  shortFormat: fmtCount,
  goodDirection: "down",
  source: "Not yet identified — see docs/INDICATORS-ee.md",
  sourceUrl:
    "https://github.com/AQVA121/GovEesti/blob/main/docs/INDICATORS-ee.md#justiits--ja-digiministeerium-just--justice-courts",
  cadence: "annual",
  points: realPoints("just-no-source-yet"),
  annotations: [],
};

// ============================================================
// Kaitseministeerium (def) — Defence
// ============================================================
const defSpendGdp: TrendSeries = {
  id: "def-spend-gdp",
  title: "Defence spending",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  vfm: true,
  source: "World Bank / SIPRI",
  sourceUrl: "https://api.worldbank.org/v2/country/EE/indicator/MS.MIL.XPND.GD.ZS?format=json",
  cadence: "annual",
  points: realPoints("def-spend-gdp"),
  annotations: [],
};

const defPersonnelPer1000: TrendSeries = {
  id: "def-personnel-per-1000",
  title: "Military personnel",
  subtitle: "Per 1,000 population",
  coverage: "Estonia",
  unit: "count",
  format: fmtPer1000,
  shortFormat: fmtPer1000,
  goodDirection: "up",
  source: "World Bank (MS.MIL.TOTL.P1 headcount ÷ SP.POP.TOTL population)",
  sourceUrl: "https://api.worldbank.org/v2/country/EE/indicator/MS.MIL.TOTL.P1?format=json",
  cadence: "annual",
  points: realPoints("def-personnel-per-1000"),
  methodology: "Computed: World Bank's MS.MIL.TOTL.P1 is an absolute headcount, not a per-capita rate — divided by SP.POP.TOTL and scaled per 1,000.",
  caveat: "World Bank's headcount series was last updated for 2020 as of the 2026-09-04 session — treat as stale, not current.",
  annotations: [],
};

// ============================================================
// Rahandusministeerium (fin) — Finance, budget
// ============================================================
const finDebtGdp: TrendSeries = {
  id: "fin-debt-gdp",
  title: "General government debt",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "down",
  source: "Statistikaamet (RR061)",
  sourceUrl:
    "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR061.px",
  cadence: "annual",
  points: realPoints("fin-debt-gdp"),
  annotations: [],
};

const finDeficitGdp: TrendSeries = {
  id: "fin-deficit-gdp",
  title: "General government deficit/surplus",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  source: "Statistikaamet (RR061)",
  sourceUrl:
    "https://andmed.stat.ee/api/v1/en/stat/majandus/rahandus/valitsemissektori-rahandus/valitsemissektori-tulud-kulud/RR061.px",
  cadence: "annual",
  points: realPoints("fin-deficit-gdp"),
  annotations: [],
};

const finTaxBurden: TrendSeries = {
  id: "fin-tax-burden",
  title: "Tax burden",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "down",
  source: "World Bank",
  sourceUrl: "https://api.worldbank.org/v2/country/EE/indicator/GC.TAX.TOTL.GD.ZS?format=json",
  cadence: "annual",
  points: realPoints("fin-tax-burden"),
  annotations: [],
};

const finGdpPerCapita: TrendSeries = {
  id: "fin-gdp-per-capita",
  title: "Real GDP per capita",
  subtitle: "Chain-linked volume, reference year 2020",
  coverage: "Estonia",
  unit: "currency",
  format: fmtEur,
  shortFormat: fmtEur,
  goodDirection: "up",
  source: "Statistikaamet (RAA0013)",
  sourceUrl:
    "https://andmed.stat.ee/api/v1/en/stat/majandus/rahvamajanduse-arvepidamine/sisemajanduse-koguprodukt-(skp)/pehilised-rahvamajanduse-arvepidamise-naitajad/RAA0013.PX",
  cadence: "annual",
  points: realPoints("fin-gdp-per-capita"),
  annotations: [],
};

// ============================================================
// Kliimaministeerium (clim) — Climate, energy, transport
// ============================================================
const climRenewableShare: TrendSeries = {
  id: "clim-renewable-share",
  title: "Renewable energy share",
  subtitle: "Of gross final consumption",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  source: "Eurostat",
  sourceUrl:
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_ren?format=JSON&geo=EE&nrg_bal=REN&lang=EN",
  cadence: "annual",
  points: realPoints("clim-renewable-share"),
  annotations: [],
};

const climGhgEmissions: TrendSeries = {
  id: "clim-ghg-emissions",
  title: "Greenhouse gas emissions",
  subtitle: "Total, excl. memo items",
  coverage: "Estonia",
  unit: "count",
  format: fmtKt,
  shortFormat: fmtKt,
  goodDirection: "down",
  source: "Eurostat (compiled from Estonia's UNFCCC national inventory report)",
  sourceUrl:
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_air_gge?format=JSON&geo=EE&airpol=GHG&unit=THS_T&src_crf=TOTXMEMO&lang=EN",
  cadence: "annual",
  points: realPoints("clim-ghg-emissions"),
  annotations: [],
};

const climRoadDeaths: TrendSeries = {
  id: "clim-road-deaths",
  title: "Road deaths",
  subtitle: "Persons killed in traffic accidents",
  coverage: "Estonia",
  unit: "people",
  format: fmtCount,
  shortFormat: fmtCount,
  goodDirection: "down",
  source: "Statistikaamet (TS093)",
  sourceUrl: "https://andmed.stat.ee/api/v1/en/stat/majandus/transport/liiklusennetused/TS093.PX",
  cadence: "annual",
  points: realPoints("clim-road-deaths"),
  annotations: [],
};

// ============================================================
// Majandus- ja Kommunikatsiooniministeerium (econ) — Economy, communications
// ============================================================
const econUnemploymentRate: TrendSeries = {
  id: "econ-unemployment-rate",
  title: "Unemployment rate",
  subtitle: "Ages 15–74",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "down",
  source: "Statistikaamet (TT3300, Estonian Labour Force Survey)",
  sourceUrl:
    "https://andmed.stat.ee/api/v1/en/stat/sotsiaalelu/tooturg/tooturu-uldandmed/luhiajastatistika/TT3300.px",
  cadence: "quarterly",
  points: realPoints("econ-unemployment-rate"),
  annotations: [],
};

const econExportsGdp: TrendSeries = {
  id: "econ-exports-gdp",
  title: "Exports of goods and services",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  vfm: true,
  source: "World Bank",
  sourceUrl: "https://api.worldbank.org/v2/country/EE/indicator/NE.EXP.GNFS.ZS?format=json",
  cadence: "annual",
  points: realPoints("econ-exports-gdp"),
  annotations: [],
};

const econRdSpendGdp: TrendSeries = {
  id: "econ-rd-spend-gdp",
  title: "R&D expenditure",
  subtitle: "% of GDP",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  source: "World Bank (compiled from UNESCO/Eurostat)",
  sourceUrl: "https://api.worldbank.org/v2/country/EE/indicator/GB.XPD.RSDV.GD.ZS?format=json",
  cadence: "annual",
  points: realPoints("econ-rd-spend-gdp"),
  annotations: [],
};

const econBroadbandPenetration: TrendSeries = {
  id: "econ-broadband-penetration",
  title: "Households with broadband access",
  coverage: "Estonia",
  unit: "percent",
  format: fmtPct,
  shortFormat: fmtPct,
  goodDirection: "up",
  source: "Eurostat",
  sourceUrl:
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_r_broad_h?format=JSON&geo=EE&lang=EN",
  cadence: "annual",
  points: realPoints("econ-broadband-penetration"),
  caveat: "The fetched series stopped at 2021 as of the 2026-09-04 session — check whether Eurostat has retired this code in favour of a newer digital-decade indicator before wiring the fetcher.",
  annotations: [],
};

// ============================================================
// Ministries
// ============================================================
export const departments: Department[] = [
  {
    code: "soc",
    name: "Sotsiaalministeerium",
    fullName: "Social Affairs",
    pageTitle: "Ministry of Social Affairs",
    spendBn: 1,
    blurb:
      "Health and social-protection outcomes: poverty, life expectancy, hospital capacity, and how much government spends per person on health.",
    synthesis:
      "All four indicators are live-fetched from their official sources (Этап 5, 2026-09-05). Editorial trend synthesis — interpreting what the numbers show — has not been written yet.",
    themes: ["Poverty", "Health outcomes", "Hospital capacity", "Spending"],
    hero: socPovertyRate,
    core: [socLifeExpectancy, socHospitalBeds, socHealthSpendPerCapita],
  },
  {
    code: "edu",
    name: "Haridus- ja Teadusministeerium",
    fullName: "Education and Research",
    pageTitle: "Ministry of Education and Research",
    spendBn: 1,
    blurb:
      "How the school system is resourced. Only one indicator (pupil:teacher ratio) has a confirmed, live source so far — PISA needs one more source probe before it can be added (see docs/INDICATORS-ee.md).",
    synthesis:
      "Its one indicator is live-fetched from Statistikaamet (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Class size", "Outcomes (pending)"],
    hero: eduPupilTeacherRatio,
    core: [],
  },
  {
    code: "int",
    name: "Siseministeerium",
    fullName: "Internal Affairs",
    pageTitle: "Ministry of the Interior",
    spendBn: 1,
    blurb:
      "Internal security. Recorded crime has a confirmed source; police headcount and rescue-service response times were researched but blocked — see docs/INDICATORS-ee.md.",
    synthesis:
      "Its one indicator is live-fetched from the Justice statistics portal (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Crime"],
    hero: intRecordedCrimes,
    core: [],
  },
  {
    code: "just",
    name: "Justiits- ja Digiministeerium",
    fullName: "Justice and Digital Affairs",
    pageTitle: "Ministry of Justice and Digital Affairs",
    spendBn: 1,
    blurb:
      "Courts and prisons. No indicator has a confirmed, live source yet — Statistikaamet's court/prison tables stopped updating in 2015 and the Justice statistics portal has no courts section. See docs/INDICATORS-ee.md.",
    synthesis:
      "No confirmed source yet for this ministry as of 2026-09-04 — shown honestly rather than papered over with an invented number.",
    themes: ["Courts (blocked)", "Prisons (blocked)"],
    hero: justNoSourceYet,
    core: [],
  },
  {
    code: "def",
    name: "Kaitseministeerium",
    fullName: "Defence",
    pageTitle: "Ministry of Defence",
    spendBn: 1,
    blurb:
      "Defence spending and force size, benchmarked internationally via World Bank data.",
    synthesis:
      "Both indicators are live-fetched from World Bank data (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Spending", "Personnel"],
    hero: defSpendGdp,
    core: [defPersonnelPer1000],
  },
  {
    code: "fin",
    name: "Rahandusministeerium",
    fullName: "Finance",
    pageTitle: "Ministry of Finance",
    spendBn: 1,
    blurb:
      "The public finances: government debt, deficit, tax burden, and living standards via real GDP per capita. The strongest-sourced ministry so far — debt/deficit share a single, already live-verified Statistikaamet table.",
    synthesis:
      "All four indicators are live-fetched from their official sources (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Debt", "Deficit", "Tax", "Living standards"],
    hero: finDebtGdp,
    core: [finDeficitGdp, finTaxBurden, finGdpPerCapita],
  },
  {
    code: "clim",
    name: "Kliimaministeerium",
    fullName: "Climate",
    pageTitle: "Ministry of Climate",
    spendBn: 1,
    blurb:
      "Climate, energy and transport-safety outcomes: renewables share, greenhouse-gas emissions, and road deaths.",
    synthesis:
      "All three indicators are live-fetched from their official sources (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Emissions", "Renewables", "Road safety"],
    hero: climRenewableShare,
    core: [climGhgEmissions, climRoadDeaths],
  },
  {
    code: "econ",
    name: "Majandus- ja Kommunikatsiooniministeerium",
    fullName: "Economic Affairs and Communications",
    pageTitle: "Ministry of Economic Affairs and Communications",
    spendBn: 1,
    blurb:
      "The wider economy: employment, trade, research intensity, and digital infrastructure reach.",
    synthesis:
      "All four indicators are live-fetched from their official sources (Этап 5, 2026-09-05). Editorial trend synthesis has not been written yet.",
    themes: ["Employment", "Trade", "R&D", "Connectivity"],
    hero: econUnemploymentRate,
    core: [econExportsGdp, econRdSpendGdp, econBroadbandPenetration],
  },
];

export function getDepartment(code: string): Department | undefined {
  return departments.find((d) => d.code === code);
}
