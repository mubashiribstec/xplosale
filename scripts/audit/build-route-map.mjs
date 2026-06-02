// Read-only diagnostic: maps API routes ↔ frontend call sites.
// Usage: node scripts/audit/build-route-map.mjs > scripts/audit/route-map.json
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(SRC);

// 1. Catalog API routes with their exported HTTP methods.
const routeFiles = files.filter((f) => /[/\\]api[/\\].*route\.ts$/.test(f));
const routes = [];
for (const f of routeFiles) {
  const src = readFileSync(f, "utf8");
  const methods = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src) ||
        new RegExp(`export\\s+const\\s+${m}\\b`).test(src)) {
      methods.push(m);
    }
  }
  // Derive URL path from file path: src/app/api/foo/[id]/route.ts -> /api/foo/[id]
  const rel = relative(SRC, f).replace(/\\/g, "/");
  const urlPath = "/" + rel.replace(/^app\//, "").replace(/\/route\.ts$/, "");
  routes.push({ file: rel, url: urlPath, methods });
}

// 2. Catalog frontend fetch call sites referencing /api/.
const callSites = [];
const fetchRe = /fetch\(\s*[`"']([^`"')]*\/api\/[^`"')]*)[`"']/g;
for (const f of files) {
  if (!/\.(ts|tsx)$/.test(f)) continue;
  if (/[/\\]api[/\\].*route\.ts$/.test(f)) continue; // skip route handlers themselves
  const src = readFileSync(f, "utf8");
  let m;
  while ((m = fetchRe.exec(src)) !== null) {
    const rel = relative(SRC, f).replace(/\\/g, "/");
    callSites.push({ file: rel, url: m[1] });
  }
}

// 3. Compute orphans: routes with no matching call site (loose prefix match, ignoring dynamic segs + query).
const norm = (u) => u.split("?")[0].replace(/\[[^\]]+\]/g, ":p").replace(/\$\{[^}]+\}/g, ":p").replace(/\/+$/,"");
const calledPaths = new Set(callSites.map((c) => norm(c.url)));
const orphans = routes.filter((r) => {
  const rn = norm(r.url);
  for (const cp of calledPaths) {
    if (cp === rn || cp.startsWith(rn) || rn.startsWith(cp)) return false;
  }
  return true;
}).map((r) => r.url);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  counts: { routes: routes.length, callSites: callSites.length, orphans: orphans.length },
  routes,
  callSites,
  orphans,
}, null, 2));
