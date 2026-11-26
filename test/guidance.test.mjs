import assert from "node:assert/strict";
import { guidanceFor } from "../public/guidance.js";
import { analyze, SAMPLE } from "../public/engine.js";
import { parseNotebook, SAMPLE_NOTEBOOK } from "../public/notebook.js";

// Every title the rules can produce has a prewritten note.
const titles = ["Abstract is over the word limit", "Abstract number matches only after rounding", "Abstract number not found in the paper", "Abstract number not in any table",
  "Author-year citations not cross-checked", "Bibliography entry never cited", "Bibliography file not included", "Bibliography style does not match the venue",
  "Caption is never referenced in the text", "Citation inside the abstract", "Citation key not in bibliography", "Citation style does not match the venue",
  "Citation without a reference entry", "Comments left in the document", "Document class does not match the venue", "Figure or table without a caption",
  "Highlighted text left in document", "Images in your results are not checked", "Label is never referenced", "Layout override", "Mixed citation styles",
  "More images than figure captions", "More tables than table captions", "No abstract found", "No bibliography found", "No keywords found", "No reference list found",
  "Notebook cells ran out of order", "Notebook has cells that never ran", "Notebook has error outputs", "Notebook has no saved outputs", "Over the page limit",
  "Page count not available", "Placeholder left in document", "Placeholder left in source", "Reference entry never cited", "Reference to a missing figure or table",
  "Reference to an undefined label", "Result differs from your outputs", "Result not found in your outputs", "Results file has no numbers", "Sections out of order",
  "Several fonts in the body", "Unresolved tracked changes", "Venue style package not loaded", "Missing section: Conclusion", "Required section missing: Limitations",
  "3 more: Placeholder left in source",
  ...["body font differs", "body size differs", "class options differ", "column count differs", "comparison skipped", "document class differs", "margins differ",
    "packages not loaded", "page size differs", "section order differs", "sections not found", "styles not in the template"].map((t) => "Template: " + t),
  ...["Dataset description", "Train, validation and test split", "Random seeds or repeated runs", "Baselines", "Hyperparameters", "Significance testing",
    "Ablation study", "Limitations", "Leakage safeguards", "Code and data availability"].map((t) => "Reporting gap: " + t)];
for (const t of titles) {
  const g = guidanceFor(t);
  assert(g && g.why && g.fix, "no guidance for " + t);
  assert(!/—/.test(g.why + g.fix), "em dash in guidance for " + t);
}
// And every finding on the sample paper is covered.
const r = analyze(SAMPLE, { venue: "ieee", notebooks: [parseNotebook(SAMPLE_NOTEBOOK, "s.ipynb")] });
for (const f of r.findings) assert(guidanceFor(f.title), "no guidance for " + f.title);
assert.equal(guidanceFor("Something new"), null);
console.log("guidance tests passed");
