import assert from "node:assert/strict";
import { sanitize, readJson } from "../netlify/lib/report.mjs";
import { cleanRequest, userPrompt, tidy, cacheKey } from "../netlify/lib/explain.mjs";

// Reports: allow-list, redaction of quoted manuscript text, recomputed counts
const r = sanitize({ score: 71.6, grade: "Needs polish", unit: "X", counts: { error: 99 }, manuscript: "secret",
  findings: [{ sev: "warn", title: "Placeholder left in document", detail: "TODO secret sentence", line: 4, loc: "P4", cat: "hygiene" },
             { sev: "bad", title: "X", detail: "y", line: -1, loc: "<script>", cat: "nope" }],
  checklist: [{ name: "Seeds", pass: "yes" }] });
assert.equal(r.score, 72);
assert.equal(r.unit, "L");
assert(!("manuscript" in r));
assert(!JSON.stringify(r).includes("secret"));
assert.deepEqual(r.counts, { error: 0, warn: 1, info: 1 });
assert.equal(r.findings[1].sev, "info");
assert.equal(r.findings[1].loc, null);
assert.equal(r.findings[1].line, null);
assert.equal(r.findings[1].cat, "format");
assert.equal(r.checklist[0].pass, false);
{
  const n = sanitize({ score: 80, findings: [{ sev: "warn", title: "Result differs from the notebook", detail: "d", cat: "notebook" }], checklist: [],
    notebook: { files: 2, checked: 5, matched: 3, differ: 1.5, missing: "x", names: ["secret.ipynb"] } });
  assert.equal(n.findings[0].cat, "notebook");
  assert.deepEqual(n.notebook, { files: 2, checked: 5, matched: 3, differ: 0, missing: 0 });
  assert.equal(sanitize({ score: 80, findings: [], checklist: [] }).notebook, null);
}
assert.equal(sanitize({ score: 101, findings: [], checklist: [] }), null);
assert.equal(sanitize([]), null);

// readJson: origin, type and size
const mk = (body, h = {}) => new Request("https://pp.example/api/reports", { method: "POST", body, headers: { origin: "https://pp.example", "content-type": "application/json", ...h } });
assert.equal((await readJson(mk("{}", { origin: "https://evil.example" }), 100)).status, 403);
assert.equal((await readJson(mk("{}", { "content-type": "text/plain" }), 100)).status, 415);
assert.equal((await readJson(mk("x".repeat(200)), 100)).status, 413);
assert.equal((await readJson(mk("{nope"), 100)).status, 400);
assert.deepEqual((await readJson(mk('{"a":1}'), 100)).body, { a: 1 });

// Explain: input cleaning, prompt, output tidy
const q = cleanRequest({ title: "Abstract number not found", detail: "98.55%", sev: "warn", venue: "../etc", excerpt: "x".repeat(900) });
assert.equal(q.venue, "none");
assert.equal(q.excerpt.length, 600);
assert.equal(cleanRequest({ title: "" }), null);
assert(userPrompt(q).includes("<excerpt>"));
assert.equal(tidy("**Why** it matters \u2014 a lot.\n- fix it \u2013 now"), "Why it matters, a lot.\nfix it to now");
assert(!/[\u2014]/.test(tidy("a \u2014 b")));
assert.equal(await cacheKey(q), await cacheKey({ ...q, excerpt: "other" }), "cache key ignores the excerpt");
console.log("functions ok");
