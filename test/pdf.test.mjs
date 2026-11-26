import fs from "node:fs";
import assert from "node:assert/strict";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { parsePdf, linesToParas } from "../public/pdfread.js";
import { analyze } from "../public/engine.js";

const b = fs.readFileSync(new URL("./fixtures/paper.pdf", import.meta.url));
const model = await parsePdf(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), pdfjs, new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).pathname);
assert.equal(model.pages, 3);
const text = model.paras.map((p) => p.text).join("\n");
assert(text.includes("cross-document reasoning"), "hyphenated line ends are kept for compound words");
assert(text.includes("We compare against"), "hyphenated words are joined");
const refs = model.paras.find((p) => p.text === "References");
assert.equal(refs.page, 3);

const has = (r, t, d) => r.findings.some((f) => f.title.includes(t) && (!d || f.detail.includes(d)));
let r = analyze({ kind: "pdf", model });
assert.equal(r.format, "PDF");
assert(has(r, "Abstract number matches only after rounding", "91.4%"));
assert(has(r, "Abstract number not found", "3.2"));
assert(has(r, "Reference to a missing figure or table", "Figure 2"));
assert(has(r, "Citation without a reference entry", "[4]"));
assert(!has(r, "Reference to a missing figure or table", "Table 1"));
const fig2 = r.findings.find((f) => f.detail.includes("Figure 2"));
assert.match(fig2.loc, /^p1 l\d+$/);

r = analyze({ kind: "pdf", model }, { venue: "acl-long", pageLimit: 2 });
assert(has(r, "Required section missing: Limitations"));
assert(has(r, "Over the page limit", "runs to page 3"));
r = analyze({ kind: "pdf", model }, { venue: "neurips", pageLimit: 9 });
assert(!has(r, "Over the page limit"));
r = analyze({ kind: "pdf", model }, { venue: "icml" });
assert(has(r, "Citation style does not match the venue", "numeric"));

// Two columns: a jump back up the page starts a new paragraph.
const p = linesToParas([{ items: [
  { str: "Left column line one", x: 50, y: 700, h: 10 }, { str: "left column line two", x: 50, y: 688, h: 10 },
  { str: "Right column starts", x: 320, y: 700, h: 10 },
] }]);
assert.equal(p.length, 2);
console.log("pdf ok");
