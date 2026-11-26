import fs from "node:fs";
import assert from "node:assert/strict";
import { parseDocx } from "../public/docx.js";
import { analyze, profileOf, SAMPLE } from "../public/engine.js";

const buf = (f) => { const b = fs.readFileSync(new URL("./fixtures/" + f, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const paper = await parseDocx(buf("paper.docx"));
const tpl = await parseDocx(buf("template.docx"));
const has = (r, t, d) => r.findings.some((f) => f.title.includes(t) && (!d || f.detail.includes(d)));

let r = analyze({ kind: "docx", model: paper });
assert.equal(r.format, "Word document");
for (const [t, d] of [
  ["Abstract number", "98.55%"], ["Abstract number", "7.6"], ["Citation inside the abstract"],
  ["Reference to a missing figure or table", "Table III"], ["Caption is never referenced", "Figure 2"],
  ["More images than figure captions"], ["Citation without a reference entry", "[5]"], ["Reference entry never cited", "[3]"],
  ["Highlighted text", "Check this number"], ["Unresolved tracked changes"], ["Comments left"], ["Several fonts"],
]) assert(has(r, t, d), `missing: ${t} ${d || ""}`);
assert(!has(r, "Reference to a missing figure or table", "Table II."), "Table II has a caption");
assert(!r.findings.some((f) => f.title.startsWith("Template")), "no template, no template findings");

r = analyze({ kind: "docx", model: paper }, { pageLimit: 4 });
assert(has(r, "Over the page limit"));

r = analyze({ kind: "docx", model: paper }, { template: profileOf({ kind: "docx", model: tpl }), templateName: "template.docx" });
for (const t of ["Template: page size", "Template: margins", "Template: column count", "Template: body font", "Template: styles not in the template"]) assert(has(r, t), "missing " + t);
assert(r.template.includes("template.docx"));

r = analyze(SAMPLE, { template: profileOf({ kind: "latex", text: String.raw`\documentclass[journal]{IEEEtran}\usepackage{cite}\section{Introduction}\section{Results}` }) });
for (const t of ["Template: class options", "Template: packages not loaded", "Template: sections not found"]) assert(has(r, t), "missing " + t);

r = analyze({ kind: "docx", model: paper }, { template: profileOf({ kind: "latex", text: String.raw`\documentclass{article}` }) });
assert(has(r, "Template: comparison skipped"));

r = analyze("Abstract\nShort one.\nIntroduction\nSee Figure 4. We got 12.5% accuracy.\n");
assert.equal(r.format, "Plain text");
assert(has(r, "Reference to a missing figure or table", "Figure 4"));
console.log("docx ok");
