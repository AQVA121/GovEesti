# Data licence

GovEesti is a **downstream compiler**: it fetches official Estonian and EU
statistics from their primary producers and re-publishes them as trend charts.
Each series names its own `producer` (who officially issues the data) separately
from `compiler` (GovEesti, and what we did to it — see `CLAUDE.md`).

**Status: not yet audited.** A full per-source licence audit is explicitly
scoped as its own step — BRIEF.md §7 "Этап 10" — and hasn't run yet. This file
is a placeholder, not the authoritative per-series licence statement that
Этап 10 will produce. Until then, treat the licence notes gathered per source
during Этап 2/3 research (`docs/INDICATORS-ee.md`, "Licence confidence"
section) as working assumptions, not audited fact:

- **Eurostat**-sourced series: CC BY 4.0 (webpage-confirmed).
- **World Bank**-derived series: CC BY 4.0 (well-documented, high confidence).
- **Statistikaamet** (Statistics Estonia)-sourced series: CC BY-SA 4.0
  (search-confirmed by multiple independent sources, not yet read directly
  off a primary licence page).
- **TAI** (Tervise Arengu Instituut) and the Justiits- ja Digiministeerium
  statistics portal: no formally named licence found — only a "free to use,
  please cite the source" statement (TAI) or nothing at all (Justice portal).
  Needs a direct answer at Этап 10, not assumed.

## Provenance, not impersonation

Every series names its **primary producer** — GovEesti does not assert
authorship of the underlying statistics, and does not claim official status
or certification for any indicator it republishes. See `CLAUDE.md`'s hard
rule: no fabricated or interpolated data — a missing or unfetched source
renders an explicit "no source yet" placeholder instead of a generated number.
