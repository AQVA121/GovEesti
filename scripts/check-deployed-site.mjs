// Verify the public GitHub Pages deployment serves the key app routes with
// useful content. Intended for a short post-deploy retry loop, but also
// runnable locally:
//   node scripts/check-deployed-site.mjs --base=https://aqva121.github.io/GovEesti
//
// Trimmed during the Estonia fork (Этап 4, 2026-09-04): the UK original also
// checked /blog and the full /data/* open-data endpoints — both removed along
// with the DCAT/CSVW/MCP apparatus (BRIEF.md §3). Re-add data-endpoint checks
// once the minimal open-data layer (BRIEF.md §7, Этап 8) exists.

const DEFAULT_BASE = "https://aqva121.github.io/GovEesti";

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [k, ...rest] = arg.slice(2).split("=");
      return [k, rest.length ? rest.join("=") : "true"];
    }),
);

const base = String(args.get("base") || process.env.DEPLOYED_SITE_URL || DEFAULT_BASE).replace(/\/+$/, "");
const retries = Number(args.get("retries") || process.env.DEPLOY_CHECK_RETRIES || 1);
const delayMs = Number(args.get("delay-ms") || process.env.DEPLOY_CHECK_DELAY_MS || 5000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function urlFor(path) {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function hasAllowedType(actual, allowed) {
  const lower = (actual || "").toLowerCase();
  return allowed.some((type) => lower.includes(type));
}

async function get(path) {
  const res = await fetch(urlFor(path), {
    headers: {
      "user-agent": "goveesti-deploy-check/1.0",
      accept: "*/*",
    },
  });
  const text = await res.text();
  return { path, url: urlFor(path), status: res.status, type: res.headers.get("content-type") || "", text };
}

async function checkEndpoint(check) {
  const result = await get(check.path);
  const errors = [];
  if (result.status !== (check.status || 200)) {
    errors.push(`expected HTTP ${check.status || 200}, got ${result.status}`);
  }
  if (check.type && !hasAllowedType(result.type, check.type)) {
    errors.push(`expected content-type including ${check.type.join(" or ")}, got ${result.type || "(none)"}`);
  }
  if (check.includes && !result.text.includes(check.includes)) {
    errors.push(`missing key string ${JSON.stringify(check.includes)}`);
  }
  if (check.excludes && result.text.includes(check.excludes)) {
    errors.push(`unexpected string ${JSON.stringify(check.excludes)}`);
  }
  if (check.json) {
    try {
      check.json(JSON.parse(result.text));
    } catch (err) {
      errors.push(`JSON assertion failed: ${err.message}`);
    }
  }
  if (errors.length) {
    throw new Error(`${check.path}: ${errors.join("; ")}`);
  }
  console.log(`ok ${check.path} ${result.status} ${result.type}`);
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runOnce() {
  const checks = [
    { path: "/", type: ["text/html"], includes: "GovEesti" },
    { path: "/overview", type: ["text/html"], includes: "Whole of government" },
    { path: "/about", type: ["text/html"], includes: "How GovEesti is built" },
    { path: "/soc", type: ["text/html"] },
  ];

  for (const check of checks) await checkEndpoint(check);
}

let lastError;
for (let attempt = 1; attempt <= retries; attempt++) {
  try {
    if (attempt > 1) console.log(`retry ${attempt}/${retries}`);
    await runOnce();
    console.log(`deployed site checks passed for ${base}`);
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.error(`attempt ${attempt}/${retries} failed: ${err.message}`);
    if (attempt < retries) await sleep(delayMs);
  }
}

console.error(`deployed site checks failed for ${base}: ${lastError?.message || "unknown error"}`);
process.exit(1);
