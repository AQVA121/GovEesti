import { Footer } from "./Footer";
import { TopNav } from "./TopNav";

/**
 * User-facing transparency page: documents how GovEesti sources, validates and
 * presents its data — the methodology counterpart to the charts themselves.
 * Copy is kept accurate to the actual implementation (real-data-only pipeline,
 * range guards, staleness flags, per-number provenance). GovEesti is a
 * fork/adaptation of Govviz (github.com/Egly443/Govviz, UK) for Estonia — see
 * CLAUDE.md and docs/BRIEF.md for the fork plan and current build status.
 */
export function AboutPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How GovEesti is built
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          GovEesti is a static dashboard of long-run Estonian government
          performance indicators — a fork/adaptation of{" "}
          <a
            href="https://github.com/Egly443/Govviz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Govviz
          </a>{" "}
          (UK). Every chart is meant to be trustworthy by construction — here
          is exactly how, and where the limits are.
        </p>

        <div className="mt-10 space-y-8">
          <Section title="Real official data only — never fabricated">
            Every series shows real figures fetched from a reputable public
            source (Statistikaamet, Eurostat, the World Bank, TAI and
            others). There is no illustrative or synthetic data anywhere in
            the production build: an indicator with no source wired yet
            renders an explicit <em>“no source yet”</em> placeholder rather
            than an invented trend line. If you see a chart, the numbers
            behind it are real.
          </Section>

          <Section title="Provenance you can check">
            Each chart links the exact file the build actually fetched, along
            with the date it was fetched. The source link is not a vague
            pointer to a department home page; it is the specific dataset, table
            or workbook the value came from, so any figure can be traced back to
            its origin.
          </Section>

          <Section title="Quality assurance: guard ranges">
            Every fetched series is validated against a hand-set plausible range
            (a minimum and maximum). A value that resolves but falls outside its
            expected range is rejected and the chart falls back rather than
            display a wrong-but-plausible number. Combined with the
            real-data-only rule, this means a mis-resolved source code can never
            silently surface incorrect data.
          </Section>

          <Section title="Honesty about freshness">
            Official statistics are published with a lag, and some sources go
            quiet. Each chart shows the vintage of its latest data point, and
            flags a series as <em>aged</em> when its source has not refreshed
            within the expected publication window for its cadence.
          </Section>

          <Section title="Definitions, coverage and caveats">
            Charts carry their geographic coverage (the common England-vs-UK
            distinction is made explicit), measurement basis (e.g. real terms
            vs cash terms), and how any derived or aggregated value is computed.
            Survey-based estimates and breaks in a series (such as a
            questionnaire redesign) are flagged with a caveat, because a
            survey estimate is not a full population count and figures either
            side of a methodology change are not directly comparable.
          </Section>

          <Section title="What the treemap’s channels mean">
            Each visual channel encodes exactly one thing. <em>Colour</em> scores
            each indicator against its published target where one exists (green =
            at or beyond the standard), otherwise against its own history (those
            are desaturated, because an own-range score isn’t comparable to a
            target-anchored one). Where the latest value carries a confidence
            interval that straddles the target, the tile shows a distinct
            “uncertain” state (≈) rather than a confident green or red — we won’t
            claim pass or fail inside the margin of error. A <em>trend glyph</em>{" "}
            (▲/▼ rising/falling, oriented to track the value; a smaller glyph for
            a slighter move) shows the recent direction, computed from a robust
            slope with a noise floor so a wobble doesn’t read as a trend. Every
            indicator in a department gets an <em>equal-size</em> tile, so it is a
            department’s whole block — not the individual tiles — whose area is
            meant to reflect its approximate budget. That figure has not been
            sourced yet for GovEesti (see <code>SPEND_BASIS</code> in{" "}
            <code>departments.ts</code>), so every ministry currently renders at
            equal size rather than showing an unverified number; the lead
            indicator is marked with an accent ring, not a bigger tile.
          </Section>

          <Section title="Accessibility">
            Every chart has a text summary for screen readers and a
            “View&nbsp;as&nbsp;table” alternative exposing the underlying data
            points. Rating indicators are not encoded by colour alone — they
            carry redundant letters (G / A / R) so the rating survives
            colour-blindness and greyscale.
          </Section>

          <Section title="AI-ready open data — planned, not built yet">
            The UK original this project forked from re-publishes every series
            as a machine-readable record (stable id, tidy CSV, CSVW schema, a
            DCAT catalogue, an MCP agent interface, a build-time conformance
            gate). GovEesti has not built that layer yet — it was deliberately
            dropped during the fork (see BRIEF.md §3) in favour of a much
            smaller version: a plain <code>/data/series/&#123;id&#125;.json</code>{" "}
            plus <code>data.csv</code> per indicator, with no DCAT/CSVW/MCP
            apparatus. That minimal layer is scoped as its own later step
            (BRIEF.md §7, “Этап 8”) and does not exist in this build yet — the
            claim will be updated here once it does, not before.
          </Section>

          <Section title="Built in the open">
            The data pipeline, the validation rules and this site are all open
            source. Data is fetched in continuous integration before each
            deploy; the code that does it — and the per-series source manifest —
            is public.{" "}
            <a
              href="https://github.com/AQVA121/GovEesti"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Read the source on GitHub
            </a>
            .
          </Section>
        </div>

        <Footer />
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
