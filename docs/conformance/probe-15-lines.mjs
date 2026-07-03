// The fifteen-line probe from the "Agentic Open Data" essay: resolve a public
// series id, fetch its tidy data, read the semantics in-band, reject an
// implausible value, and cite the source. No dependencies; Node 18+.
//
//   node docs/conformance/probe-15-lines.mjs [series-id]
//
// GOVVIZ_DATA_BASE overrides the portal root (e.g. a local build) for testing.
const base = process.env.GOVVIZ_DATA_BASE ?? "https://egly443.github.io/Govviz/data";
const id = process.argv[2] ?? "defra-sewage-hours";
const rec = await (await fetch(`${base}/series/${id}.json`)).json();
const rows = (await (await fetch(rec.latest)).text()).trim().split("\n");
const cols = rows[0].split(",");
const obs = Object.fromEntries(rows.at(-1).split(",").map((v, i) => [cols[i], v]));
const value = Number(obs.value);
const { min, max } = rec.validRange ?? { min: -Infinity, max: Infinity };
if (!(value >= min && value <= max))
  throw new Error(`rejected: "${obs.value}" is not a plausible value for ${id}`);
console.log(`${rec.title} — ${rec.producer} (${rec.statisticType}, ${rec.revisionStatus})`);
console.log(`${obs.period}: ${value} ${obs.unit} [status: ${obs.status}]`);
console.log(`geography: ${rec.geographyLabel ?? rec.geography ?? "not declared"}; licence: ${rec.licence}`);
console.log(`provenance: ${rec.provenance.source} — ${rec.provenance.upstreamUrl}`);
console.log(`cite: ${rec.id} (fetched ${rec.latestFetchedAt}, freshness: ${rec.freshnessStatus})`);
