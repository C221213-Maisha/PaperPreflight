// Notebook check (beta, for ML papers). Reads Jupyter notebooks with saved outputs and compares the
// results reported in the paper against the numbers the notebooks actually printed.
// Deterministic: plain parsing and arithmetic, no execution, no network.

const MAX_CELLS = 5000;
const stripHtml = (s) => s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const joinText = (t) => (Array.isArray(t) ? t.join("") : typeof t === "string" ? t : "");

// Parses .ipynb JSON. Returns { name, cells: [{ n, exec, text }], errors: [n], unrun: [n], outOfOrder, outputs }.
export function parseNotebook(json, name) {
  let nb;
  try { nb = typeof json === "string" ? JSON.parse(json) : json; } catch { throw new Error(`${name} is not a valid notebook`); }
  if (!nb || !Array.isArray(nb.cells)) throw new Error(`${name} is not a valid notebook`);
  const cells = [], errors = [], unrun = [];
  let code = 0, lastExec = 0, outOfOrder = false, outputs = 0;
  nb.cells.slice(0, MAX_CELLS).forEach((c) => {
    if (!c || c.cell_type !== "code") return;
    code++;
    const n = code;
    const exec = Number.isInteger(c.execution_count) ? c.execution_count : null;
    if (exec === null && !(c.outputs || []).length && joinText(c.source).trim()) unrun.push(n);
    if (exec !== null) { if (exec < lastExec) outOfOrder = true; lastExec = exec; }
    let text = "";
    for (const o of Array.isArray(c.outputs) ? c.outputs : []) {
      if (!o || typeof o !== "object") continue;
      if (o.output_type === "error") { errors.push(n); continue; }
      if (o.output_type === "stream") text += joinText(o.text) + "\n";
      else if (o.data && typeof o.data === "object") {
        if (o.data["text/plain"] !== undefined) text += joinText(o.data["text/plain"]) + "\n";
        else if (o.data["text/html"] !== undefined) text += stripHtml(joinText(o.data["text/html"])) + "\n";
        else if (o.data["text/markdown"] !== undefined) text += joinText(o.data["text/markdown"]) + "\n";
      }
    }
    if (text.trim()) { outputs++; cells.push({ n, exec, text: text.slice(0, 200000) }); }
  });
  return { name, kind: "notebook", unit: "cell", cells, errors, unrun, outOfOrder, outputs, codeCells: code };
}

// Every number a notebook printed, with where it came from.
function notebookValues(nbs) {
  const vals = [];
  for (const nb of nbs) for (const c of nb.cells)
    for (const m of c.text.matchAll(/(?<![\w.])-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?(?![\w])/g)) {
      const v = Number(m[0]);
      if (Number.isFinite(v)) vals.push({ v, s: m[0], nb: nb.name, cell: c.n, unit: nb.unit || "cell" });
      if (vals.length > 2000000) return vals;
    }
  return vals;
}

const METRIC = /accura|\bf1\b|f-?score|precision|recall|\bauc\b|roc|bleu|rouge|meteor|perplexity|\bloss\b|error|\bmae\b|\bmse\b|rmse|\bmap\b|map@|top-?[15]|exact match|\bem\b|score|improv|outperform|gain|reach|achiev|\bwer\b|\bcer\b|iou|dice|ndcg|hits@|mrr|win rate|pass@|throughput|latency|speed-?up/i;
// Decimals and percentages that look like reported results (not versions, dates or exponents).
const RESULT_NUM = /(?<![\w.\\-])(\d{1,4}\.\d+|\d{1,3}(?:\.\d+)?(?=\s*\\?%))(?![\d.]*[eE][-+]?\d)(?!\.\d)(\s*\\?%)?/g;

// rows: [{ text, line, table, abstract }]. Returns the paper results worth checking.
export function paperResults(rows) {
  const out = [];
  for (const r of rows) {
    if (!(r.table || r.abstract || METRIC.test(r.text))) continue;
    const text = r.text.replace(/\\(?:label|ref|cite[a-z]*|eqref|includegraphics)\*?(?:\[[^\]]*\])?\{[^}]*\}/g, " ");
    for (const m of text.matchAll(RESULT_NUM)) {
      const s = m[1], pct = !!m[2];
      const v = Number(s);
      if (!Number.isFinite(v) || (v >= 1900 && v <= 2100 && !s.includes("."))) continue;
      out.push({ s: s + (pct ? "%" : ""), v, d: (s.split(".")[1] || "").length, pct, line: r.line });
    }
  }
  return out;
}

const roundTo = (x, d) => Math.round((x + Number.EPSILON * Math.sign(x)) * 10 ** d) / 10 ** d;
const same = (a, b, d) => Math.abs(a - b) < 0.5 * 10 ** -d + 1e-9;

// Compares paper results with notebook outputs. A paper value matches when a notebook value equals it,
// rounds to it, or does so after converting between a fraction and a percentage.
export function matchResults(results, nbs) {
  // Sorted, de-duplicated values so each lookup is a binary search, even for large results files.
  const byVal = new Map();
  for (const n of notebookValues(nbs)) if (!byVal.has(n.v)) byVal.set(n.v, n);
  const vals = [...byVal.values()].sort((a, b) => a.v - b.v);
  const lower = (t) => { let lo = 0, hi = vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m].v < t) lo = m + 1; else hi = m; } return lo; };
  const seen = new Set();
  const report = { checked: 0, matched: 0, differ: [], missing: [] };
  for (const p of results) {
    const key = p.s + "@" + p.line;
    if (seen.has(key)) continue;
    seen.add(key);
    report.checked++;
    let hit = null, best = null;
    for (const [k, how] of [[1, ""], [100, "as a percentage"], [0.01, "as a fraction"]]) {
      // Candidates around p.v / k: the closest values on either side, plus everything inside the rounding window.
      const tol = 0.5 * 10 ** -p.d + 1e-9, lo = (p.v - tol) / k, hi = (p.v + tol) / k;
      for (let i = lower(Math.min(lo, hi)); i < vals.length && vals[i].v <= Math.max(lo, hi); i++) {
        const x = vals[i].v * k;
        if (same(roundTo(x, p.d), p.v, p.d)) { hit = { ...vals[i], how }; break; }
      }
      if (hit) break;
      const j = lower(p.v / k);
      for (const n of [vals[j - 1], vals[j]]) {
        if (!n) continue;
        const x = n.v * k, rel = Math.abs(x - p.v) / Math.max(Math.abs(p.v), 1e-9);
        if (rel <= 0.03 && (!best || rel < best.rel)) best = { ...n, how, rel, shown: Number(x.toFixed(4)) };
      }
    }
    if (hit) report.matched++;
    else if (best) report.differ.push({ ...p, near: best });
    else report.missing.push(p);
  }
  return report;
}

// Adds findings for the paper. add(sev, title, detail, line) is the engine's adder.
// nbs: parsed notebooks and results files (CSV and text). images: image file names found in results zips.
export function notebookFindings(rows, nbs, add, images = []) {
  for (const nb of nbs) {
    if (nb.kind && nb.kind !== "notebook") {
      if (!nb.cells.length) add("info", "Results file has no numbers", `${nb.name} has no numbers to compare.`);
      continue;
    }
    if (!nb.outputs) add("warn", "Notebook has no saved outputs", `${nb.name} has no outputs to compare. Run it and save it with outputs.`);
    if (nb.errors.length) add("warn", "Notebook has error outputs", `${nb.name}: cell ${nb.errors.slice(0, 5).join(", ")} ended with an error, so later results may be stale.`);
    if (nb.outOfOrder) add("warn", "Notebook cells ran out of order", `${nb.name} was not run top to bottom. Restart and run all before reporting results.`);
    if (nb.unrun.length) add("info", "Notebook has cells that never ran", `${nb.name}: ${nb.unrun.length} code cell${nb.unrun.length === 1 ? "" : "s"} have no output and no run count.`);
  }
  const results = paperResults(rows);
  const r = matchResults(results, nbs);
  for (const p of r.differ) {
    const where = `${p.near.unit || "cell"} ${p.near.cell} of ${p.near.nb}`;
    add("warn", "Result differs from your outputs", `The paper reports ${p.s}, but the closest output is ${p.near.s}${p.near.how ? ", which is " + p.near.shown + " " + p.near.how : ""}, in ${where}.`, p.line);
  }
  for (const p of r.missing) add("info", "Result not found in your outputs", `${p.s} does not appear in any notebook or results file, even after rounding. Fine for numbers quoted from other papers.`, p.line);
  if (images.length) add("info", "Images in your results are not checked", `${images.length === 1 ? `1 image was found: ${images[0]}.` : `${images.length} images were found, such as ${images.slice(0, 3).join(", ")}.`} Plots cannot be compared by fixed rules, so check them against your figures by eye.`);
  return { files: nbs.map((n) => n.name), checked: r.checked, matched: r.matched, differ: r.differ.length, missing: r.missing.length };
}

export const SAMPLE_NOTEBOOK = JSON.stringify({
  nbformat: 4, nbformat_minor: 5, metadata: {},
  cells: [
    { cell_type: "markdown", source: ["# Experiments for Fast Fake News Detection"] },
    { cell_type: "code", execution_count: 1, source: ["import torch, numpy as np"], outputs: [] },
    { cell_type: "code", execution_count: 2, source: ["results = evaluate(model, test_set)\n", "print(results)"],
      outputs: [{ output_type: "stream", name: "stdout", text: ["{'f1': 0.98547, 'precision': 0.9861, 'recall': 0.9848}\n"] }] },
    { cell_type: "code", execution_count: 3, source: ["throughput(model)"],
      outputs: [{ output_type: "execute_result", execution_count: 3, data: { "text/plain": ["41.27"] }, metadata: {} }] },
    { cell_type: "code", execution_count: 5, source: ["gain_over_baseline()"],
      outputs: [{ output_type: "execute_result", execution_count: 5, data: { "text/plain": ["7.41"] }, metadata: {} }] },
    { cell_type: "code", execution_count: 4, source: ["ablation_table()"],
      outputs: [{ output_type: "error", ename: "KeyError", evalue: "'no_kg'", traceback: [] }] },
    { cell_type: "code", execution_count: 6, source: ["latency_ms(model)"],
      outputs: [{ output_type: "stream", name: "stdout", text: ["mean latency: 15.2 ms\n"] }] },
  ],
});
