import assert from "node:assert/strict";
import { analyze, SAMPLE, compareAbstractNumbers } from "../public/engine.js";

const has = (r, t, d) => r.findings.some((f) => f.title.includes(t) && (!d || f.detail.includes(d)));

// The sample paper
let r = analyze(SAMPLE);
assert(has(r, "undefined label", "tab:ablation"));
assert(has(r, "never cited", "wang2019"));
assert(has(r, "Abstract number not found", "98.55%"));
assert(has(r, "Abstract number not found", "7.6"));
assert(has(r, "matches only after rounding", "41.27"));
assert(has(r, "Placeholder"));
assert(has(r, "without a caption"));
assert(has(r, "Citation inside the abstract"));
assert(!has(r, "never referenced", "fig:arch"));
assert(r.findings.every((f) => ["consistency", "reporting", "format", "hygiene"].includes(f.cat)), "every finding has a category");
assert(r.findings.filter((f) => f.line).every((f) => f.loc === "L" + f.line), "LaTeX locations are line numbers");
const cap = r.findings.find((f) => f.title === "Figure or table without a caption");
assert.equal(cap.line, 12, "the caption finding points at the figure");

// Reproducible: same input, same output
assert.deepEqual(analyze(SAMPLE, { venue: "ieee" }), analyze(SAMPLE, { venue: "ieee" }));

// Abstract numbers
let n = compareAbstractNumbers("We get 91.4% and 3.2 and 88.1.", "Accuracy 91.38. Baseline 88.1 in text.", "Ours 91.38");
assert.deepEqual(n.rounded, [["91.4%", "91.38"]]);
assert.deepEqual(n.missing, ["3.2"]);
assert.deepEqual(n.notInTables, ["88.1"]);

// Venue rules
r = analyze(SAMPLE, { venue: "lncs" });
assert(has(r, "Document class does not match", "llncs"));
r = analyze(SAMPLE, { venue: "acl-long" });
assert(has(r, "Venue style package not loaded"));
assert(has(r, "Required section missing: Limitations"));
assert.equal(r.findings.find((f) => f.title.includes("Required section")).sev, "error");
r = analyze(SAMPLE.replace("\\end{thebibliography}", "\\end{thebibliography}\n\\bibliographystyle{plainnat}"), { venue: "ieee" });
assert(has(r, "Bibliography style does not match"));
r = analyze(SAMPLE.replace("reaches", "reaches \\citet{li2020}"), { venue: "ieee" });
assert(has(r, "Citation style does not match", "numbered"));

// Section order
r = analyze(SAMPLE.replace("\\section{Introduction}", "\\section{Background}").replace("\\section{Conclusion}", "\\section{Conclusion}\n\\section{Introduction}"));
assert(has(r, "Sections out of order"));

// .bib content
r = analyze(SAMPLE.replace(/\\begin\{thebibliography\}[\s\S]*\\end\{thebibliography\}/, "\\bibliography{refs}"), { bib: "@article{li2020, title={A}}\n@inproceedings{zhou2021, title={B}}" });
assert(!has(r, "Citation key not in bibliography", "li2020"));
assert(has(r, "Bibliography entry never cited", "zhou2021"));

// Plain text: citation style mismatch and mixed styles
r = analyze("Abstract\nShort abstract here with enough words to count as one.\nIntroduction\nAs shown by Smith et al. (2020), and (Lee, 2019), and (Kim, 2021), it works [1], [2], [3].\nReferences\n[1] A\n[2] B\n[3] C", { venue: "ieee" });
assert(has(r, "Mixed citation styles"));

// Abstract limit off
r = analyze(SAMPLE, { abstractLimit: 0 });
assert(!has(r, "over the word limit"));
r = analyze(SAMPLE, { abstractLimit: 10 });
assert(has(r, "over the word limit"));
console.log("engine ok", analyze(SAMPLE).score);
