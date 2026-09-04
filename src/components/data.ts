import { SERIES_DATA } from "../generated/seriesData";

// `lo`/`hi` carry a published uncertainty interval (e.g. a survey's 95%
// confidence interval) around `value`, when the source provides one.
// `status` carries the official revision status of the observation when the
// source distinguishes it: a `provisional` figure is expected to be revised in
// a later edition, so the most recent points of many series are not yet final.
export type RevisionStatus = "provisional" | "revised" | "final";
export type Point = {
  date: string;
  value: number;
  lo?: number;
  hi?: number;
  status?: RevisionStatus;
};
// `break: true` marks a structural break (e.g. Covid, a methodology change) at
// which a control chart's process limits should be re-baselined — the series
// before and after is a different process, so limits must not be pooled across it.
export type Annotation = { date: string; label: string; break?: boolean };

export type SeriesUnit =
  | "people"
  | "percent"
  | "years"
  | "gbp"
  | "days"
  | "beds"
  | "count"
  | "currency";

/** One line within a (possibly multi-line) chart. */
export type SeriesLine = {
  id: string;
  label: string;
  color?: string; // defaults assigned by index when omitted
  points: Point[];
};

export type TrendSeries = {
  id: string;
  title: string;
  subtitle?: string;
  unit: SeriesUnit;
  format: (v: number) => string;
  shortFormat: (v: number) => string;
  /** Optional y-axis tick formatter (overrides built-in). */
  yFormat?: (v: number) => string;
  /** Optional delta formatter (overrides built-in). Receives signed delta. */
  deltaFormat?: (v: number) => string;
  goodDirection: "up" | "down";
  // kind "standard" = an official/statutory benchmark; "reference" = a historical
  // baseline or marker (labelled honestly as such, not implied to be a target).
  target?: { value: number; label: string; kind?: "standard" | "reference" };
  /** Marks the department's value-for-money indicator (cost ÷ outcome, unit
   *  cost, or spending efficiency/leakage). Shown with a "Value for money"
   *  badge so the pillar is explicit. */
  vfm?: boolean;
  source: string;
  sourceUrl: string;
  cadence: "monthly" | "quarterly" | "annual";
  /** Primary line (single-line charts) or a representative line for tiles. */
  points: Point[];
  /** When set (length > 1), the panel draws a multi-line comparison chart. */
  lines?: SeriesLine[];
  /**
   * Source series ids this series is computed from (e.g. a value-for-money
   * cost÷outcome ratio). When present, the "Official data" badge is shown iff
   * every source id has real baked data — a derived ratio is exactly as real
   * as its inputs, and never carries its own SERIES_DATA entry.
   */
  derivedFrom?: string[];
  /** Plain-language note on how a derived/aggregated value is computed (cost÷outcome ratio, region aggregation, etc.). Rendered as a "How it's calculated" note. */
  methodology?: string;
  /** Caveat shown on the chart: survey sampling error, provisional/revised figures, or a break in the series (e.g. a methodology change). */
  caveat?: string;
  /** Geographic / population scope of the series, e.g. "England", "UK", "Great Britain", "UK vs Germany & France". Surfaced so the common England-vs-UK misread is explicit. */
  coverage?: string;
  /** Precise statement of what is counted (numerator ÷ denominator in words), where the subtitle alone is ambiguous. */
  definition?: string;
  /** Measurement basis, e.g. "real terms, 2023-24 prices", "seasonally adjusted", "nominal", "cash terms". */
  basis?: string;
  /** Conservative policy/topic tags used by the open-data index and agent search. */
  semanticTags?: string[];
  /** Stable subject identifiers such as GOV.UK organisations, ONS geography URIs, or controlled vocabulary concepts. */
  subjectUris?: string[];
  /** Optional source-level quality evidence aligned to the Government Data Quality Framework. */
  qualityDimensions?: Partial<Record<"accuracy" | "completeness" | "uniqueness" | "consistency" | "timeliness" | "validity", string>>;
  /**
   * Which side of government the indicator measures (the "measurement gap"):
   * - "experience" = consumer/citizen-side outcome (could I get a GP, afford
   *   the bill, is my street safe) — what you actually receive.
   * - "process" = producer/delivery-side output (throughput, unit cost, RAGs,
   *   headcount) — what government does.
   * Makes the producer-vs-consumer split machine-visible. Untagged = unclassified.
   */
  lens?: "experience" | "process";
  annotations: Annotation[];
};

// Real fetched data (baked in CI) is the ONLY data shown. A series with no
// baked data renders an explicit "no source yet" placeholder rather than a
// fabricated trend.
export function realPoints(id: string): Point[] {
  return SERIES_DATA[id]?.points ?? [];
}
export function realLine(id: string, lineId: string): Point[] {
  return SERIES_DATA[id]?.lines?.find((x) => x.id === lineId)?.points ?? [];
}
/** True when CI baked real fetched data for this series id. */
export function isRealSeries(id: string): boolean {
  const d = SERIES_DATA[id];
  return !!d && (!!d.points?.length || !!d.lines?.length);
}
/**
 * Real-data check for a whole series, aware of derived (cost÷outcome) series:
 * a ratio is real iff every input it is derived from is real.
 */
export function seriesIsReal(series: TrendSeries): boolean {
  return series.derivedFrom
    ? series.derivedFrom.every(isRealSeries)
    : isRealSeries(series.id);
}
/**
 * Illustrative/fabricated data has been removed from the app entirely, so this
 * is now permanently false: an unsourced series renders an explicit
 * "no source yet" placeholder in every build (dev included), and the dashboard
 * can never display anything but real, officially-sourced data. A local build
 * without baked CI data therefore shows placeholders — populate
 * src/generated/seriesData.ts (or run the CI fetch) to see real charts.
 */
export const SHOW_ILLUSTRATIVE = false;
/** Fetch date (YYYY-MM-DD) of the baked data, if any. */
export function realAsOf(id: string): string | undefined {
  return SERIES_DATA[id]?.asOf;
}
/** Exact URL of the file/table CI actually fetched for this series, if known. */
export function realSourceUrl(id: string): string | undefined {
  return SERIES_DATA[id]?.srcUrl;
}
/** The plausibility guard range (min/max) the baked value passed, if known. */
export function realGuard(id: string): { min: number; max: number } | undefined {
  return SERIES_DATA[id]?.guard;
}
/** Short content fingerprint of the exact baked dataset (pins the data version). */
export function realHash(id: string): string | undefined {
  return SERIES_DATA[id]?.srcHash;
}
/** Hash of the raw upstream source bytes CI fetched for this series, if known. */
export function realSourceBytesHash(id: string): string | undefined {
  return SERIES_DATA[id]?.srcBytesHash;
}

// International peer set for World Bank comparator charts. Keep in sync with
// WB_PEERS in scripts/build-data.mjs and src/components/departments.ts.
// The chart shows the UK line alone until CI bakes per-country data
// (TrendPanel drops empty lines).
const WB_PEERS: { code: string; label: string }[] = [
  { code: "deu", label: "Germany" },
  { code: "fra", label: "France" },
];
export function wbLines(id: string): SeriesLine[] {
  return [
    { id: "gbr", label: "UK", points: realLine(id, "gbr") },
    ...WB_PEERS.map((p) => ({
      id: p.code,
      label: p.label,
      points: realLine(id, p.code),
    })),
  ];
}

/**
 * Build a value-for-money ratio (cost ÷ outcome) from two existing series by
 * dividing their values year-by-year. The result is genuinely real wherever
 * both inputs are real — no fabricated points are introduced — and is flagged
 * via `derivedFrom`. Year alignment keeps it robust to differing start dates
 * and cadences (both are reduced to their common years).
 */
export function ratioSeries(o: {
  id: string;
  title: string;
  subtitle?: string;
  num: TrendSeries;
  den: TrendSeries;
  unit?: SeriesUnit;
  format: (v: number) => string;
  shortFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  deltaFormat?: (v: number) => string;
  goodDirection: "up" | "down";
  // kind "standard" = an official/statutory benchmark; "reference" = a historical
  // baseline or marker (labelled honestly as such, not implied to be a target).
  target?: { value: number; label: string; kind?: "standard" | "reference" };
  source: string;
  sourceUrl: string;
  scale?: number;
  round?: number;
  vfm?: boolean;
  methodology?: string;
  annotations?: Annotation[];
}): TrendSeries {
  const scale = o.scale ?? 1;
  const round = o.round ?? 2;
  const denByYear = new Map<string, number>();
  for (const p of o.den.points) denByYear.set(p.date.slice(0, 4), p.value);
  const points: Point[] = [];
  for (const p of o.num.points) {
    const d = denByYear.get(p.date.slice(0, 4));
    if (d == null || d === 0) continue;
    points.push({ date: p.date, value: +((p.value / d) * scale).toFixed(round) });
  }
  return {
    id: o.id,
    title: o.title,
    subtitle: o.subtitle,
    unit: o.unit ?? "currency",
    format: o.format,
    shortFormat: o.shortFormat ?? o.format,
    yFormat: o.yFormat ?? o.shortFormat ?? o.format,
    deltaFormat: o.deltaFormat,
    goodDirection: o.goodDirection,
    target: o.target,
    vfm: o.vfm,
    source: o.source,
    sourceUrl: o.sourceUrl,
    cadence: o.num.cadence,
    points,
    derivedFrom: [o.num.id, o.den.id],
    methodology: o.methodology ?? `Computed as ${o.num.title} ÷ ${o.den.title}, aligned by year.`,
    annotations: o.annotations ?? [],
  };
}

// UK NHS/DHSC-specific TrendSeries constants (14 series + allSeries + the
// workforce turnover small-multiples) were removed here as part of the
// Estonia fork (Этап 4, BRIEF.md §1/§3) — see git history for the originals.
// Estonian department data lives in departments.ts, built from the sources
// confirmed in docs/INDICATORS-ee.md, with its own local format helpers.

// Helpers ----------------------------------------------------

// Sentinel for series with no baked data (illustrative fallbacks removed), so
// scoring/rendering never crash on an empty series — such series are gated out
// of display by the `seriesIsReal`/SHOW_ILLUSTRATIVE checks anyway.
const EMPTY_POINT: Point = { date: "", value: NaN };
export function latest(series: TrendSeries): Point {
  return series.points[series.points.length - 1] ?? EMPTY_POINT;
}

export function deltaVs(series: TrendSeries, monthsBack: number) {
  const pts = series.points;
  const stepMonths = series.cadence === "annual" ? 12 : 1;
  const steps = Math.round(monthsBack / stepMonths);
  const idx = pts.length - 1 - steps;
  if (idx < 0) return null;
  const now = pts[pts.length - 1].value;
  const then = pts[idx].value;
  const diff = now - then;
  return { diff, then, abs: Math.abs(diff) };
}

/**
 * Data vintage + staleness for a series: how old its most recent point is, and
 * whether that exceeds a cadence-aware tolerance for publication lag. Lets the
 * UI surface the actual coverage end ("to 2021") and loudly flag series whose
 * source has gone quiet — the honest counterpart to the "Official data" badge.
 */
export function stalenessOf(series: TrendSeries): {
  latestDate: string;
  latestYear: number;
  monthsOld: number;
  stale: boolean;
} {
  const last = series.points[series.points.length - 1];
  const latestDate = last?.date ?? "";
  const t = latestDate ? new Date(latestDate).getTime() : NaN;
  const monthsOld = Number.isFinite(t)
    ? Math.max(0, Math.round((Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44)))
    : Infinity;
  // Tolerances allow for normal publication lag; beyond them the source has
  // genuinely not refreshed and the chart is showing aged data.
  const limit =
    series.cadence === "monthly" ? 5 : series.cadence === "quarterly" ? 8 : 22;
  return {
    latestDate,
    latestYear: latestDate ? new Date(latestDate).getUTCFullYear() : NaN,
    monthsOld,
    stale: monthsOld > limit,
  };
}

/**
 * The date from which a series' trailing points are provisional (the first
 * provisional point in the final unbroken provisional run), or null if none are.
 * Used to shade the "subject to revision" region of the chart and to caption it.
 */
export function provisionalFrom(series: TrendSeries): { date: string; count: number } | null {
  const pts = series.points;
  let i = pts.length - 1;
  let count = 0;
  while (i >= 0 && pts[i].status === "provisional") {
    count++;
    i--;
  }
  return count ? { date: pts[i + 1].date, count } : null;
}

/** The latest point's published confidence interval, when it carries one. */
export function latestCI(series: TrendSeries): { lo: number; hi: number } | null {
  const p = series.points[series.points.length - 1];
  return p && p.lo != null && p.hi != null ? { lo: p.lo, hi: p.hi } : null;
}

/** True when any point in the series carries a published confidence interval. */
export function hasUncertainty(series: TrendSeries): boolean {
  return series.points.some((p) => p.lo != null && p.hi != null);
}

export function minMax(series: TrendSeries) {
  if (!series.points.length) return { min: EMPTY_POINT, max: EMPTY_POINT };
  let min = series.points[0];
  let max = series.points[0];
  for (const p of series.points) {
    if (p.value < min.value) min = p;
    if (p.value > max.value) max = p;
  }
  return { min, max };
}

export function slicePoints(points: Point[], years: number | "max"): Point[] {
  if (years === "max" || points.length === 0) return points;
  const last = new Date(points[points.length - 1].date);
  const cutoff = new Date(last);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return points.filter((p) => new Date(p.date) >= cutoff);
}

export function sliceRange(series: TrendSeries, years: number | "max"): Point[] {
  return slicePoints(series.points, years);
}

export function formatMonth(iso: string, opts?: { year?: boolean }) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: opts?.year === false ? undefined : "numeric",
  });
}

