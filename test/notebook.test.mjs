import assert from "node:assert/strict";
import { parseNotebook, paperResults, matchResults, notebookFindings, SAMPLE_NOTEBOOK } from "../public/notebook.js";
import { analyze, SAMPLE, modelFromText } from "../public/engine.js";

const nb = (cells) => JSON.stringify({ nbformat: 4, cells });
const out = (exec, text, src = "x") => ({ cell_type: "code", execution_count: exec, source: [src], outputs: [{ output_type: "stream", name: "stdout", text: [text] }] });

// Parsing: outputs, errors, unrun cells, run order
{
  const p = parseNotebook(nb([
    out(1, "acc 0.9123\n"),
    { cell_type: "code", execution_count: 2, source: ["y"], outputs: [{ output_type: "execute_result", data: { "text/html": ["<table><td>77.5</td></table>"], "text/plain": ["df"] } }] },
    { cell_type: "code", execution_count: null, source: ["never()"], outputs: [] },
    { cell_type: "code", execution_count: 3, source: ["boom"], outputs: [{ output_type: "error", ename: "E", evalue: "v", traceback: [] }] },
    { cell_type: "markdown", source: ["# 99.9"] },
  ]), "a.ipynb");
  assert.equal(p.codeCells, 4);
  assert.equal(p.outputs, 2);
  assert.deepEqual(p.unrun, [3]);
  assert.deepEqual(p.errors, [4]);
  assert.equal(p.outOfOrder, false);
  // text/plain wins over html when both exist; markdown cells are ignored
  assert(!p.cells.some((c) => c.text.includes("99.9")));
  const h = parseNotebook(nb([{ cell_type: "code", execution_count: 1, source: ["t"], outputs: [{ output_type: "display_data", data: { "text/html": ["<b>77.5</b>"] } }] }]), "h.ipynb");
  assert(h.cells[0].text.includes("77.5") && !h.cells[0].text.includes("<b>"));
  assert.equal(parseNotebook(nb([out(2, "1"), out(1, "2")]), "o.ipynb").outOfOrder, true);
  assert.throws(() => parseNotebook("{not json", "bad.ipynb"), /not a valid notebook/);
  assert.throws(() => parseNotebook("{}", "bad.ipynb"), /not a valid notebook/);
}

// Matching: exact, rounding, fraction to percent, near misses and missing values
{
  const nbs = [parseNotebook(nb([out(1, "f1=0.98547 bleu 27.314 loss 0.0821\n")]), "n.ipynb")];
  const rows = [
    { text: "Our model reaches 98.55% F1.", line: 1 },
    { text: "BLEU improves to 27.3.", line: 2 },
    { text: "BLEU score of 27.9 on the test set.", line: 3 },
    { text: "The loss is 0.082 after training.", line: 4 },
    { text: "Accuracy is 63.2 on the hard split.", line: 5 },
    { text: "Published in 2023 with version 1.2 of the code.", line: 6 },
  ];
  const res = paperResults(rows);
  assert.deepEqual(res.map((r) => r.s), ["98.55%", "27.3", "27.9", "0.082", "63.2"]);
  const m = matchResults(res, nbs);
  assert.equal(m.checked, 5);
  assert.equal(m.matched, 3);
  assert.deepEqual(m.differ.map((d) => d.s), ["27.9"]);
  assert.deepEqual(m.missing.map((d) => d.s), ["63.2"]);
  // Table rows are checked even without a metric word
  assert.deepEqual(paperResults([{ text: "Ours & 91.40 & 88.2", line: 9, table: true }]).map((r) => r.s), ["91.40", "88.2"]);
}

// Findings and the engine wiring
{
  const found = [];
  const s = notebookFindings([{ text: "accuracy 50.5", line: 3 }], [parseNotebook(nb([{ cell_type: "code", execution_count: 1, source: ["a"], outputs: [] }]), "empty.ipynb")], (sev, title, detail, line) => found.push({ sev, title, line }));
  assert(found.some((f) => f.title === "Notebook has no saved outputs"));
  assert(found.some((f) => f.title === "Result not found in your outputs" && f.line === 3 && f.sev === "info"));
  assert.deepEqual(s, { files: ["empty.ipynb"], checked: 1, matched: 0, differ: 0, missing: 1 });

  const nbs = [parseNotebook(SAMPLE_NOTEBOOK, "sample_experiments.ipynb")];
  const r = analyze(SAMPLE, { notebooks: nbs });
  assert.equal(r.notebook.matched, 3);
  assert.equal(r.notebook.differ, 2);
  const nbf = r.findings.filter((f) => f.cat === "notebook");
  assert(nbf.some((f) => f.title === "Result differs from your outputs" && f.loc === "L5" && f.detail.includes("7.41")));
  assert(nbf.some((f) => f.title === "Notebook has error outputs"));
  assert(nbf.some((f) => f.title === "Notebook cells ran out of order"));
  // Without notebooks there is no notebook section and the score is unchanged
  const plain = analyze(SAMPLE);
  assert.equal(plain.notebook, null);
  assert(!plain.findings.some((f) => f.cat === "notebook"));
  // Deterministic: the same input gives the same report
  assert.deepEqual(analyze(SAMPLE, { notebooks: nbs }), r);

  // Plain text and Word-style paragraphs
  const t = analyze({ kind: "text", text: "Abstract\nWe reach 98.55% F1 on the benchmark and gain 7.6 points over prior work in our experiments.\nIntroduction\nMore text." }, { notebooks: nbs });
  assert(t.findings.some((f) => f.title === "Result differs from your outputs" && f.line === 2));
  const d = analyze({ kind: "docx", model: { ...modelFromText("Abstract\nShort abstract text that is long enough to count here.\nIntroduction\nx"), kind: "docx", paras: [
    { text: "Introduction", style: "Heading1" }, { text: "Ours", style: "", inTable: true }, { text: "98.3", style: "", inTable: true }] , fonts: new Map(), sizes: new Map(), defaults: {}, page: {}, styleIds: new Set(), used: new Set() } }, { notebooks: nbs });
  assert(d.findings.some((f) => f.title === "Result differs from your outputs" && f.detail.includes("98.3")));
}
console.log("notebook tests passed");

// Results files and zips
{
  const { readFileSync } = await import("node:fs");
  const { readResultsZip, parseTextResults } = await import("../public/results.js");
  const buf = readFileSync(new URL("./fixtures/results.zip", import.meta.url));
  const z = await readResultsZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "output.zip");
  assert.deepEqual(z.sources.map((s) => s.name).sort(), ["kaggle/working/gain.txt", "kaggle/working/metrics.csv", "kaggle/working/run.ipynb"]);
  assert.deepEqual(z.images, ["kaggle/working/plots/confusion.png"]);
  assert(z.skipped.includes("kaggle/working/model.pt") && z.skipped.includes("kaggle/working/broken.ipynb"));
  assert(!z.skipped.some((n) => n.includes("__MACOSX")));
  await assert.rejects(() => readResultsZip(new TextEncoder().encode("not a zip at all, just text").buffer, "x.zip"), /not a valid zip/);

  const r = analyze(SAMPLE, { notebooks: z.sources, resultImages: z.images });
  assert.equal(r.notebook.matched, 3);
  const diff = r.findings.find((f) => f.title === "Result differs from your outputs" && f.loc === "L5");
  assert(diff && diff.detail.includes("line 1 of kaggle/working/gain.txt"));
  assert(r.findings.some((f) => f.title === "Images in your results are not checked" && f.detail.includes("confusion.png")));
  assert(!r.findings.some((f) => f.title.startsWith("Notebook has")));

  const csv = parseTextResults("epoch,acc\n1,0.5\n\n2,0.61\n", "log.csv");
  assert.deepEqual(csv.cells.map((c) => c.n), [2, 4]);
  assert.equal(csv.unit, "row");

  // Large results files stay fast
  const big = parseTextResults(Array.from({ length: 200000 }, (_, i) => `${i},${(i / 7).toFixed(5)},${(i * 0.37).toFixed(3)}`).join("\n"), "big.csv");
  const t0 = Date.now();
  analyze(SAMPLE, { notebooks: [big] });
  assert(Date.now() - t0 < 4000, "matching a large CSV took too long");
}
console.log("results tests passed");
