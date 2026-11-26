// PaperPreflight rule engine. Every check here is a deterministic rule: the same input and options
// always give the same findings, in the same order. No network, no randomness, no model calls.
import { presetById } from "./presets.js";
import { notebookFindings } from "./notebook.js";

const strip = (l) => l.replace(/(^|[^\\])%.*$/, "$1");
const RANK = { error: 0, warn: 1, info: 2 };

const CHECKLIST = [
  { name: "Dataset description", re: /dataset|corpus|benchmark/, sev: "info", why: "Describe the data: source, size and class balance." },
  { name: "Train, validation and test split", re: /train(ing)?[\s\/,-]+(and\s+)?(val(idation)?[\s\/,-]+(and\s+)?)?test|data split|\bsplit/, sev: "warn", why: "State how the data was split and whether the split is fixed." },
  { name: "Random seeds or repeated runs", re: /\bseed|random state|repeated runs|independent runs|runs with different/, sev: "warn", why: "Report seeds or repeated runs so results can be reproduced." },
  { name: "Baselines", re: /baseline|compared (with|to|against)|state-of-the-art/, sev: "warn", why: "Compare against at least one clear baseline." },
  { name: "Hyperparameters", re: /learning rate|batch size|epochs|optimi[sz]er/, sev: "info", why: "List learning rate, batch size, epochs and optimizer." },
  { name: "Significance testing", re: /p\s*[<=]|t-test|mcnemar|wilcoxon|bootstrap|confidence interval|standard deviation|\\pm|\u00b1/, sev: "warn", why: "Back claimed gains with a test, intervals or variance." },
  { name: "Ablation study", re: /ablation/, sev: "info", why: "Show which component of the method earns its place." },
  { name: "Limitations", re: /limitation|threats to validity/, sev: "warn", why: "Add a short limitations paragraph." },
  { name: "Leakage safeguards", re: /leak|contaminat|duplicate|near-duplicate/, sev: "info", why: "Say how train and test overlap was ruled out." },
  { name: "Code and data availability", re: /github\.com|code (is )?available|zenodo|huggingface|data availability|supplementary/, sev: "info", why: "Point readers to code, data or a statement on why not." },
];
const GROUPS = [["Introduction", /intro/], ["Method", /method|approach|model|framework|proposed/], ["Experiments or results", /experiment|result|evaluation/], ["Conclusion", /conclusion|discussion/]];
const SECTION_LINE = /^\s*(?:\d+\.?|[IVX]+\.)?\s*(abstract|introduction|related work|background|methods?|methodology|materials and methods|proposed method|approach|model|experiments?|experimental setup|results?(?: and discussion)?|evaluation|discussion|conclusions?|limitations?|impact statement|broader impacts?|references|bibliography|acknowledge?ments?|appendix)\s*$/i;
const NUM_RE = /\d+(?:\.\d+)?\\?%?/g;
const KEYWORDS = /^\s*(keywords?|index terms)\b/i;
const AUTHOR_YEAR = /\(([A-Z][A-Za-z'-]+(?: (?:et al\.|and|&) ?[A-Z]?[A-Za-z'-]*)?,? (?:19|20)\d{2}[a-z]?)(?:; ?[^)]*)?\)|\b[A-Z][A-Za-z'-]+ (?:et al\. )?\((?:19|20)\d{2}[a-z]?\)/g;
const NUMERIC_CITE = /\[(\d+(?:\s*[,\u2013-]\s*\d+)*)\]/g;

// Category of each finding, used to group the report the same way the product brief does.
const CATS = [
  ["consistency", /^(Abstract number|Reference to|Label is never|Figure or table without|Caption is never|More (images|tables)|Citation key|Citation without|Bibliography entry|Reference entry|No bibliography|No reference list|Bibliography file|Author-year citations)/],
  ["reporting", /^Reporting gap/],
  ["hygiene", /^(Placeholder|Highlighted|Unresolved tracked|Comments left)/],
  ["notebook", /^(Notebook|Results file|Result differs from your outputs|Result not found in your outputs|Images in your results)/],
];
const catOf = (title) => (CATS.find(([, re]) => re.test(title)) || ["format"])[0];
export const CATEGORY_NAMES = { consistency: "Consistency", reporting: "Reporting", format: "Format", hygiene: "Clean-up", notebook: "Experiments" };

const topKey = (m) => { let b = null, v = -1; for (const [k, c] of m || []) if (c > v) { b = k; v = c; } return b; };

// Adds findings, keeping at most 6 per title so one repeated issue cannot bury the rest.
function mkAdder(out) {
  const n = {}, over = {};
  const add = (sev, title, detail, line = null) => {
    n[title] = (n[title] || 0) + 1;
    if (n[title] > 6) { over[title] = (over[title] || 0) + 1; return; }
    out.push({ sev, title, detail, line });
  };
  add.flush = () => { for (const t in over) out.push({ sev: "info", title: `${over[t]} more: ${t}`, detail: "Fix the ones above first, then run the check again.", line: null, cat: catOf(t) }); };
  return add;
}
const limitOf = (o) => (o.abstractLimit === undefined || o.abstractLimit === "" || o.abstractLimit === null ? 250 : Number(o.abstractLimit) || 0);

/* ---------- Abstract numbers against the body and tables ---------- */
const decimals = (s) => (s.split(".")[1] || "").replace("%", "").length;
const numRe = (n) => new RegExp("(^|[^\\d.])" + n.replace("%", "").replace(".", "\\.") + "(?!\\d)");
const numbersIn = (s) => (s.match(/\d+(?:\.\d+)?/g) || []);

// Sorts decimals and percentages quoted in the abstract into: not found anywhere, found only after
// rounding a more precise value, and found in the text but in no table.
export function compareAbstractNumbers(abs, rest, tables = "") {
  const nums = [...new Set((abs.match(NUM_RE) || []).map((s) => s.replace("\\", "")).filter((s) => /[.%]/.test(s)))];
  const hay = rest.replace(/\s+\\?%/g, "%");
  const body = numbersIn(hay);
  const res = { missing: [], rounded: [], notInTables: [] };
  for (const n of nums) {
    if (numRe(n).test(hay)) {
      if (tables && !numRe(n).test(tables)) res.notInTables.push(n);
      continue;
    }
    const v = parseFloat(n), d = decimals(n), half = 0.5 * 10 ** -d;
    const near = body.find((b) => decimals(b) > d && Math.abs(parseFloat(b) - v) <= half + 1e-9);
    if (near !== undefined) res.rounded.push([n, near]);
    else res.missing.push(n);
  }
  return res;
}
function reportNumbers(add, abs, rest, tables, line) {
  const r = compareAbstractNumbers(abs, rest, tables);
  for (const n of r.missing) add("warn", "Abstract number not found in the paper", `${n} appears in the abstract but nowhere else. Check it against your tables.`, line);
  for (const [n, b] of r.rounded) add("info", "Abstract number matches only after rounding", `${n} in the abstract matches ${b} in the paper once rounded. Make sure the rounding is intended.`, line);
  for (const n of r.notInTables.slice(0, 3)) add("info", "Abstract number not in any table", `${n} appears in the text but in no table. Fine for counts and setup values, worth a look for results.`, line);
}

function runChecklist(lower, add) {
  return CHECKLIST.map((c) => {
    const pass = c.re.test(lower);
    if (!pass) add(c.sev, `Reporting gap: ${c.name}`, c.why);
    return { name: c.name, pass };
  });
}

/* ---------- Shared structure rules ---------- */
// heads: [{ t: lowercased heading text, n: line }] in document order
function sectionRules(heads, add, preset) {
  const pos = GROUPS.map(([name, re]) => ({ name, h: heads.find((s) => re.test(s.t)) }));
  pos.forEach(({ name, h }) => { if (!h) add("warn", `Missing section: ${name}`, "Most venues expect this section."); });
  const found = pos.filter((p) => p.h);
  for (let i = 1; i < found.length; i++) {
    if (heads.indexOf(found[i].h) < heads.indexOf(found[i - 1].h)) {
      add("warn", "Sections out of order", `${found[i].name} comes before ${found[i - 1].name}. The usual order is Introduction, Method, Experiments, Conclusion.`, found[i].h.n);
      break;
    }
  }
  const refs = heads.find((s) => /^\W*(\d+\.?|[ivx]+\.)?\s*(references|bibliography)\b/.test(s.t));
  const concl = pos[3].h;
  if (refs && concl && heads.indexOf(refs) < heads.indexOf(concl)) add("warn", "Sections out of order", "References come before the conclusion.", refs.n);
  for (const [label, re, sev] of preset.required) {
    if (!heads.some((s) => re.test(s.t))) add(sev, `Required section missing: ${label}`, `${preset.name} asks for a ${label} section.`);
  }
}

function citeStyleRules(text, add, preset) {
  const num = [...text.matchAll(NUMERIC_CITE)].length;
  const ay = [...text.matchAll(AUTHOR_YEAR)].length;
  if (num >= 3 && ay >= 3) add("warn", "Mixed citation styles", `${num} numbered citations and ${ay} author-year citations found. Use one style throughout.`);
  const style = num + ay < 3 ? null : num >= ay ? "numeric" : "author-year";
  if (style && preset.cite !== "any" && style !== preset.cite)
    add("warn", "Citation style does not match the venue", `Citations look ${style}, but ${preset.name} uses ${preset.cite} citations.`);
}

export function detectKind(text) {
  return /\\begin\{document\}|\\documentclass|\\section\*?\{/.test(text) ? "latex" : "text";
}

/* ---------- LaTeX ---------- */
function analyzeLatex(src, opts, preset) {
  const limit = limitOf(opts), out = [], add = mkAdder(out);
  const raw = src.split("\n"), lines = raw.map(strip), text = lines.join("\n"), lower = text.toLowerCase();
  const each = (re, fn) => lines.forEach((l, i) => { for (const m of l.matchAll(re)) fn(m, i + 1); });
  const lineOf = (idx) => text.slice(0, idx).split("\n").length;

  const labels = new Map(), refs = new Map();
  each(/\\label\{([^}]+)\}/g, (m, n) => labels.set(m[1].trim(), n));
  each(/\\(?:[cC]|auto|eq|page|name|v)?ref\*?\{([^}]+)\}/g, (m, n) =>
    m[1].split(",").forEach((k) => { k = k.trim(); if (k && !refs.has(k)) refs.set(k, n); }));
  for (const [k, n] of refs) if (!labels.has(k)) add("error", "Reference to an undefined label", `\\ref{${k}} has no matching \\label.`, n);
  for (const [k, n] of labels)
    if (/^(fig|tab|eq|alg)[:_-]/i.test(k) && !refs.has(k)) add("warn", "Label is never referenced", `${k} is defined but not cited in the text.`, n);

  // Floats without captions, located at the float itself.
  for (const fm of text.matchAll(/\\begin\{(figure|table)(\*?)\}([\s\S]*?)\\end\{\1\2\}/g))
    if (!/\\caption(\[[^\]]*\])?\{/.test(fm[3])) add("warn", "Figure or table without a caption", `This ${fm[1]} has no \\caption, so readers cannot refer to it.`, lineOf(fm.index));

  const cited = new Map(), bib = new Map();
  each(/\\(?:no)?cite[a-z]*\*?(?:\[[^\]]*\])*\{([^}]+)\}/g, (m, n) =>
    m[1].split(",").forEach((k) => { k = k.trim(); if (k && k !== "*" && !cited.has(k)) cited.set(k, n); }));
  each(/\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g, (m, n) => bib.set(m[1].trim(), n));
  if (opts.bib) for (const m of opts.bib.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)) if (!/^(string|preamble|comment)$/i.test(m[1])) bib.set(m[2].trim(), null);
  if (bib.size) {
    for (const [k, n] of cited) if (!bib.has(k)) add("error", "Citation key not in bibliography", `\\cite{${k}} has no entry in the bibliography.`, n);
    if (!/\\nocite\{\*\}/.test(text)) for (const [k, n] of bib) if (!cited.has(k)) add(n ? "warn" : "info", "Bibliography entry never cited", `${k} appears in the reference list only.`, n);
  } else if (/\\(bibliography|addbibresource)\{/.test(text)) {
    add("info", "Bibliography file not included", "Add your .bib file to verify citation keys. It stays in your browser.");
  } else if (cited.size) {
    add("warn", "No bibliography found", "Citations are used but no reference list was detected.");
  }

  // Text inside tabular environments, used to check abstract numbers against tables.
  const tables = [...text.matchAll(/\\begin\{(tabular\*?|tabularx|longtable)\}([\s\S]*?)\\end\{\1\}/g)].map((m) => m[2]).join("\n");

  const am = text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (!am) {
    add("error", "No abstract found", "Add an abstract environment near the top of the paper.");
  } else {
    const aLine = lineOf(am.index), abs = am[1];
    const words = abs.replace(/\\(?:no)?cite[a-z]*\*?(\[[^\]]*\])*\{[^}]*\}/g, " ").replace(/\\[a-zA-Z]+\*?/g, " ").replace(/[{}$~\\]/g, " ").split(/\s+/).filter(Boolean).length;
    if (limit && words > limit) add("warn", "Abstract is over the word limit", `${words} words found, limit is ${limit}.`, aLine);
    if (/\\(?:no)?cite/.test(abs)) add("warn", "Citation inside the abstract", "Most venues discourage references in the abstract.", aLine);
    reportNumbers(add, abs, text.replace(am[0], ""), tables, aLine);
  }

  raw.forEach((l, i) => { if (/\b(TODO|FIXME|XXX)\b|\?\?/.test(l)) add("warn", "Placeholder left in source", l.trim().slice(0, 90), i + 1); });
  const heads = [];
  each(/\\section\*?\{([^}]+)\}|\\begin\{thebibliography\}|\\bibliography\{|\\printbibliography/g, (m, n) => heads.push({ t: m[1] ? m[1].toLowerCase() : "references", n }));
  sectionRules(heads, add, preset);
  if (!/IEEEkeywords|\\keywords|\\begin\{keywords?\}|\\ccsdesc/.test(text)) add("info", "No keywords found", "Add keywords if the template asks for them.");

  each(/\\usepackage(?:\[[^\]]*\])?\{(?:geometry|fullpage|savetrees)\}|\\geometry\{|\\vspace\*?\{-|\\linespread|\\baselinestretch|\\setlength\{\\(?:textwidth|textheight|columnsep|oddsidemargin|evensidemargin)\}|\\addtolength\{\\(?:textwidth|textheight)\}/g,
    (m, n) => add("warn", "Layout override", `This line changes the template's spacing or margins, which many venues reject: ${m[0].slice(0, 60)}`, n));

  // Venue rules: class, style package and bibliography style.
  const cm = text.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/);
  const cls = cm ? cm[1].trim() : null;
  if (preset.cls && cls && !preset.pkg && cls !== preset.cls)
    add("error", "Document class does not match the venue", `This paper uses ${cls}, ${preset.name} uses ${preset.cls}.`, lineOf(cm.index));
  if (preset.pkg) {
    const pk = [...text.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()));
    if (!pk.some((p) => preset.pkg.test(p))) add("error", "Venue style package not loaded", `${preset.name} papers load the venue's own style package, which was not found.`);
  }
  const bs = text.match(/\\bibliographystyle\{([^}]+)\}/);
  if (preset.bibstyle && bs && !preset.bibstyle.test(bs[1].trim()))
    add("warn", "Bibliography style does not match the venue", `\\bibliographystyle{${bs[1]}} is not the style ${preset.name} provides.`, lineOf(bs.index));
  if (preset.cite === "numeric" && /\\cite[tp]\*?\{|\\citeauthor\{/.test(text))
    add("warn", "Citation style does not match the venue", `\\citet and \\citep produce author-year citations, but ${preset.name} uses numbered citations.`);

  if (opts.pageLimit) add("info", "Page count not available", "LaTeX source has no page count. Upload the compiled PDF to check the page limit.");
  let notebook = null;
  if ((opts.notebooks && opts.notebooks.length) || (opts.resultImages && opts.resultImages.length)) {
    // Rows for the notebook check: each source line, marked when it sits in a table or the abstract.
    const inRange = (re) => { const set = new Set(); for (const m of text.matchAll(re)) { const a = lineOf(m.index), b = lineOf(m.index + m[0].length); for (let k = a; k <= b; k++) set.add(k); } return set; };
    const tab = inRange(/\\begin\{(tabular\*?|tabularx|longtable)\}[\s\S]*?\\end\{\1\}/g), ab = inRange(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g);
    const rows = lines.map((t, i) => ({ text: t, line: i + 1, table: tab.has(i + 1), abstract: ab.has(i + 1) }));
    notebook = notebookFindings(rows, opts.notebooks || [], add, opts.resultImages || []);
  }
  const checklist = runChecklist(lower, add);
  add.flush();
  return { out, checklist, format: "LaTeX source", unit: "L", notebook };
}

/* ---------- Word, PDF and plain text ---------- */
export function modelFromText(text) {
  const paras = [];
  text.split("\n").forEach((l, i) => { const t = l.trim(); if (t) paras.push({ text: t, style: "", highlight: false, line: i + 1 }); });
  return { kind: "text", paras };
}

const CAP_SEP = /^(fig(?:ure)?|table)\.?\s*(\d+|[IVXLC]+)\s*[:.\u2013\u2014|-]/i;
const CAP_ONLY = /^(fig(?:ure)?|table)\.?\s*(\d+|[IVXLC]+)\s*$/i;
const MENTION = /\b(Fig(?:ure)?s?|Tables?)\.?\s+(\d+|[IVXLC]+)\b/g;
const kindOf = (w) => (/^fig/i.test(w) ? "Figure" : "Table");
const expand = (s) => {
  const r = [];
  for (const part of s.split(",")) {
    const m = part.match(/^\s*(\d+)\s*[\u2013-]\s*(\d+)\s*$/);
    if (m) { const a = +m[1], b = +m[2]; if (b >= a && b - a < 200) for (let k = a; k <= b; k++) r.push(k); else r.push(a, b); }
    else { const n = parseInt(part, 10); if (!isNaN(n)) r.push(n); }
  }
  return r;
};

function analyzeDoc(m, opts, kind, preset) {
  const limit = limitOf(opts), out = [], add = mkAdder(out), P = m.paras;
  const L = (i) => P[i].line || i + 1;
  const isHead = (p) => /^(heading|title)/i.test(p.style) || (p.text.length < 80 && SECTION_LINE.test(p.text));
  const text = P.map((p) => p.text).join("\n"), lower = text.toLowerCase();

  // Abstract
  const ai = P.findIndex((p) => /^\s*abstract\b/i.test(p.text));
  const absIdx = new Set();
  let abs = "";
  if (ai >= 0) {
    absIdx.add(ai);
    const first = P[ai].text.replace(/^\s*abstract\s*[:.\u2013\u2014-]*\s*/i, "");
    if (first.split(/\s+/).filter(Boolean).length >= 8) abs = first;
    else {
      const parts = [];
      for (let j = ai + 1; j < P.length && parts.length < 4 && !isHead(P[j]) && !KEYWORDS.test(P[j].text); j++) { parts.push(P[j].text); absIdx.add(j); }
      abs = parts.join(" ");
    }
    const words = abs.split(/\s+/).filter(Boolean).length;
    if (limit && words > limit) add("warn", "Abstract is over the word limit", `${words} words found, limit is ${limit}.`, L(ai));
    if (/\[\d+(?:\s*[,\u2013-]\s*\d+)*\]|\([A-Z][A-Za-z-]+(?: et al\.)?,? \d{4}[a-z]?\)/.test(abs)) add("warn", "Citation inside the abstract", "Most venues discourage references in the abstract.", L(ai));
    const rest = P.filter((_, i) => !absIdx.has(i)).map((p) => p.text).join("\n");
    const tables = P.filter((p) => p.inTable).map((p) => p.text).join("\n");
    reportNumbers(add, abs, rest, tables, L(ai));
  } else add("error", "No abstract found", "Start a paragraph with the word Abstract so it can be checked.");

  // Figures and tables: captions against mentions
  const caps = new Map(), mentions = new Map();
  P.forEach((p, i) => {
    const cm = p.text.match(CAP_SEP) || p.text.match(CAP_ONLY);
    if (cm) { const k = `${kindOf(cm[1])} ${cm[2].toUpperCase()}`; if (!caps.has(k)) caps.set(k, i); return; }
    for (const mm of p.text.matchAll(MENTION)) { const k = `${kindOf(mm[1])} ${mm[2].toUpperCase()}`; if (!mentions.has(k)) mentions.set(k, i); }
  });
  for (const [k, i] of mentions) if (!caps.has(k)) add("error", "Reference to a missing figure or table", `${k} is mentioned but no caption for it was found.`, L(i));
  for (const [k, i] of caps) if (!mentions.has(k)) add("warn", "Caption is never referenced in the text", `${k} has a caption but the text never refers to it.`, L(i));
  const figCaps = [...caps.keys()].filter((k) => k.startsWith("Figure")).length, tblCaps = caps.size - figCaps;
  if (m.images > figCaps) add("warn", "More images than figure captions", `${m.images} images found but ${figCaps} figure captions.`);
  if (m.tables > tblCaps) add("info", "More tables than table captions", `${m.tables} tables found but ${tblCaps} table captions. Layout tables may be counted.`);

  // Numeric citations against the reference list
  let refIdx = -1;
  P.forEach((p, i) => { if (/^\s*(?:[IVX]+\.?|\d+\.?)?\s*(references|bibliography)\s*$/i.test(p.text)) refIdx = i; });
  const cited = new Map();
  P.forEach((p, i) => {
    if (refIdx >= 0 && i >= refIdx) return;
    const t = p.text.replace(/\[(\d+)\]\s*[\u2013-]\s*\[(\d+)\]/g, "[$1-$2]");
    for (const cm of t.matchAll(NUMERIC_CITE)) expand(cm[1]).forEach((n) => { if (!cited.has(n)) cited.set(n, i); });
  });
  const entries = new Map();
  if (refIdx >= 0) {
    let k = 0;
    for (let i = refIdx + 1; i < P.length; i++) { if (/^\s*appendix/i.test(P[i].text)) break; const mm = P[i].text.match(/^\[(\d+)\]/); entries.set(mm ? +mm[1] : ++k, i); }
  }
  if (refIdx >= 0 && entries.size && cited.size) {
    for (const [n, i] of cited) if (!entries.has(n)) add("error", "Citation without a reference entry", `[${n}] is cited but the reference list has no entry ${n}.`, L(i));
    for (const [n, i] of entries) if (!cited.has(n)) add("warn", "Reference entry never cited", `[${n}] is in the reference list but never cited in the text.`, L(i));
  } else if (cited.size && refIdx < 0) add("warn", "No reference list found", "Numbered citations are used but no References heading was detected.");
  else if (!cited.size && /\([A-Z][A-Za-z-]+(?: et al\.)?,? \d{4}[a-z]?\)/.test(text)) add("info", "Author-year citations not cross-checked", "Only numbered citations such as [3] are matched against the reference list.");
  citeStyleRules(P.slice(0, refIdx >= 0 ? refIdx : P.length).map((p) => p.text).join("\n"), add, preset);

  // Leftovers
  P.forEach((p, i) => {
    if (/\b(TODO|FIXME|XXX|TBD)\b|\?\?|\[citation needed\]|lorem ipsum/i.test(p.text)) add("warn", "Placeholder left in document", p.text.slice(0, 90), L(i));
    else if (p.highlight) add("warn", "Highlighted text left in document", p.text.slice(0, 90), L(i));
  });
  if (m.ins + m.del > 0) add("warn", "Unresolved tracked changes", `${m.ins} insertions and ${m.del} deletions are still tracked. Accept or reject them before submitting.`);
  if (m.comments > 0) add("warn", "Comments left in the document", `${m.comments} comment${m.comments === 1 ? "" : "s"} found. Remove them before submitting.`);

  // Structure
  const heads = [];
  P.forEach((p, i) => { if (isHead(p)) heads.push({ t: p.text.toLowerCase(), n: L(i) }); });
  sectionRules(heads, add, preset);
  if (!P.some((p) => KEYWORDS.test(p.text))) add("info", "No keywords found", "Add keywords if the template asks for them.");
  if (m.fonts && m.fonts.size) {
    const tot = [...m.fonts.values()].reduce((a, b) => a + b, 0);
    const big = [...m.fonts].filter(([f, c]) => c / tot >= 0.08 && !/symbol|math|wingdings/i.test(f)).map(([f]) => f);
    if (big.length > 2) add("warn", "Several fonts in the body", `${big.join(", ")}. Most templates use one or two.`);
  }

  // Page limit. A PDF has a true page count; for venues that exclude references, the main text ends where they start.
  if (opts.pageLimit) {
    if (kind === "pdf" && m.pages) {
      const refPage = refIdx >= 0 ? P[refIdx].page : null;
      const useRefs = preset.refsOut && refPage;
      const counted = useRefs ? refPage : m.pages;
      const how = useRefs ? `The main text runs to page ${counted}, where the references start` : `The PDF has ${m.pages} pages`;
      if (counted > opts.pageLimit) add("error", "Over the page limit", `${how}. The limit is ${opts.pageLimit}.`, useRefs ? L(refIdx) : null);
    } else if (m.pages && m.pages > opts.pageLimit) add("error", "Over the page limit", `${m.pages} pages in the document properties against a limit of ${opts.pageLimit}. Word can store a stale count, so confirm in the PDF.`);
    else if (!m.pages) add("info", "Page count not available", "Upload the PDF or confirm the page count in Word.");
  }

  let notebook = null;
  if ((opts.notebooks && opts.notebooks.length) || (opts.resultImages && opts.resultImages.length)) {
    // Word marks table cells. PDF and plain text do not, so a row holding three or more numbers counts as a table row.
    const tableLike = (t) => (t.match(/\d+(?:\.\d+)?/g) || []).length >= 3 && t.length < 160;
    const rows = P.map((p, i) => ({ text: p.text, line: L(i), table: kind === "docx" ? !!p.inTable : tableLike(p.text), abstract: absIdx.has(i) }));
    notebook = notebookFindings(rows, opts.notebooks || [], add, opts.resultImages || []);
  }
  const checklist = runChecklist(lower, add);
  add.flush();
  const format = kind === "docx" ? "Word document" : kind === "pdf" ? "PDF" : "Plain text";
  return { out, checklist, format, unit: kind === "docx" ? "P" : "L", notebook };
}

/* ---------- Optional template comparison ---------- */
export function profileOf(inp) {
  if (inp.kind === "latex") {
    const t = inp.text.split("\n").map(strip).join("\n");
    const cm = t.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/), pkgs = new Set();
    for (const m of t.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)) m[1].split(",").forEach((p) => pkgs.add(p.trim()));
    return { kind: "latex", cls: cm ? cm[2].trim() : null, opts: cm && cm[1] ? cm[1].split(",").map((s) => s.trim()).filter(Boolean) : [],
      pkgs, secs: [...t.matchAll(/\\section\*?\{([^}]+)\}/g)].map((m) => m[1].trim().toLowerCase()) };
  }
  const m = inp.model;
  return { kind: "docx", page: m.page, font: topKey(m.fonts) || m.defaults.font, size: topKey(m.sizes) || m.defaults.size, styles: m.styleIds, used: m.used };
}

const mm = (tw) => Math.round(tw * 0.0176389 * 10) / 10;
export function compareTemplate(pp, tp) {
  const f = [], add = (sev, title, detail) => f.push({ sev, title: "Template: " + title, detail, line: null });
  if (!pp || !tp) return f;
  const name = (k) => (k === "docx" ? "Word" : "LaTeX");
  if (pp.kind !== tp.kind) { add("info", "comparison skipped", `The template is a ${name(tp.kind)} file and your paper is ${name(pp.kind)}, so layout rules cannot be compared.`); return f; }
  if (pp.kind === "latex") {
    if (pp.cls && tp.cls && pp.cls !== tp.cls) add("error", "document class differs", `Your paper uses ${pp.cls}, the template uses ${tp.cls}.`);
    const miss = tp.opts.filter((o) => !pp.opts.includes(o));
    if (miss.length) add("warn", "class options differ", `The template sets [${tp.opts.join(", ")}]. Missing in your paper: ${miss.join(", ")}.`);
    const pk = [...tp.pkgs].filter((x) => !pp.pkgs.has(x));
    if (pk.length) add("info", "packages not loaded", `The template loads ${pk.slice(0, 8).join(", ")}${pk.length > 8 ? " and more" : ""}, which your paper does not.`);
    const sc = tp.secs.filter((s) => !pp.secs.includes(s));
    if (sc.length) add("warn", "sections not found", `The template has sections your paper lacks: ${sc.slice(0, 6).join(", ")}.`);
    const mine = pp.secs.filter((s) => tp.secs.includes(s)), theirs = tp.secs.filter((s) => mine.includes(s));
    if (mine.join("|") !== theirs.join("|")) add("warn", "section order differs", `The template orders these sections as ${theirs.slice(0, 6).join(", ")}.`);
    return f;
  }
  const a = pp.page, b = tp.page, d = (x, y) => Math.abs(x - y);
  if (a.w && b.w && (d(a.w, b.w) > 40 || d(a.h, b.h) > 40)) add("error", "page size differs", `Your paper is ${mm(a.w)} x ${mm(a.h)} mm, the template is ${mm(b.w)} x ${mm(b.h)} mm.`);
  const sides = ["top", "right", "bottom", "left"].filter((s) => a[s] !== null && b[s] !== null && d(a[s], b[s]) > 60);
  if (sides.length) add("warn", "margins differ", sides.map((s) => `${s} ${mm(a[s])} mm vs ${mm(b[s])} mm`).join(", ") + ".");
  if (a.cols !== b.cols) add("warn", "column count differs", `Your paper has ${a.cols} column${a.cols === 1 ? "" : "s"}, the template has ${b.cols}.`);
  if (pp.font && tp.font && pp.font !== tp.font) add("warn", "body font differs", `Your paper mostly uses ${pp.font}, the template uses ${tp.font}.`);
  if (pp.size && tp.size && d(pp.size, tp.size) > 0.6) add("warn", "body size differs", `Your paper mostly uses ${pp.size} pt, the template uses ${tp.size} pt.`);
  if (tp.styles.size) {
    const ignore = /^(Normal|ListParagraph|TableGrid|Hyperlink|Header|Footer|DefaultParagraphFont)$/;
    const bad = [...pp.used].filter((s) => !tp.styles.has(s) && !ignore.test(s));
    if (bad.length) add(bad.some((s) => /^(Heading|Title|Caption)/i.test(s)) ? "warn" : "info", "styles not in the template", `Your paper uses styles the template does not define: ${bad.slice(0, 6).join(", ")}.`);
  }
  return f;
}

/* ---------- Entry point ---------- */
// input: a string, or { kind: "latex" | "text", text } or { kind: "docx" | "pdf", model }
// opts:  { venue, abstractLimit, pageLimit, template, templateName, bib, notebooks }
export function analyze(input, opts = {}) {
  const inp = typeof input === "string" ? { kind: detectKind(input), text: input } : input;
  const preset = presetById(opts.venue);
  const model = inp.kind === "docx" || inp.kind === "pdf" ? inp.model : inp.kind === "latex" ? null : modelFromText(inp.text);
  const r = inp.kind === "latex" ? analyzeLatex(inp.text, opts, preset) : analyzeDoc(model, opts, inp.kind, preset);
  const pp = inp.kind === "latex" || inp.kind === "docx" ? profileOf(inp) : null;
  if (opts.template && pp) r.out.push(...compareTemplate(pp, opts.template));
  else if (opts.template && !pp) r.out.push({ sev: "info", title: "Template: comparison skipped", detail: "Template comparison works for LaTeX source and Word files. PDF and plain text are checked against the venue rules only.", line: null });

  const out = r.out;
  for (const f of out) {
    f.cat = f.cat || (f.title.startsWith("Template:") ? "format" : catOf(f.title));
    // Label for the location chip. PDF rows carry a page and line, the others a line or paragraph number.
    const row = f.line != null && model ? model.paras[f.line - 1] : null;
    f.loc = f.line == null ? null : inp.kind === "pdf" ? (row && row.loc) || `P${f.line}` : `${r.unit}${f.line}`;
  }
  out.sort((x, y) => RANK[x.sev] - RANK[y.sev] || (x.line ?? 1e9) - (y.line ?? 1e9) || (x.title < y.title ? -1 : x.title > y.title ? 1 : 0));
  const counts = { error: 0, warn: 0, info: 0 };
  out.forEach((f) => counts[f.sev]++);
  const score = Math.max(0, Math.min(100, 100 - counts.error * 12 - counts.warn * 4 - counts.info));
  const grade = score >= 85 ? "Ready to submit" : score >= 60 ? "Needs polish" : "Not ready yet";
  const lim = limitOf(opts);
  const parts = [r.format];
  if (preset.id !== "none") parts.push(preset.name);
  parts.push(`abstract limit ${lim || "none"}`);
  if (opts.pageLimit) parts.push(`page limit ${opts.pageLimit}`);
  if (opts.template && pp) parts.push("compared with " + (opts.templateName || "template"));
  if (r.notebook) parts.push(`${r.notebook.files.length} experiment file${r.notebook.files.length === 1 ? "" : "s"}`);
  return { score, grade, counts, findings: out, checklist: r.checklist, unit: r.unit, format: r.format, template: parts.join(", "), venue: preset.id, notebook: r.notebook };
}

export const SAMPLE = String.raw`\documentclass[conference]{IEEEtran}
\begin{document}
\title{Fast Fake News Detection}
\begin{abstract}
We propose a model that reaches 98.55\% F1 with 15 ms inference \cite{li2020}. It beats baselines by 7.6 points
and processes 41.3 documents per second.
\end{abstract}
\section{Introduction}
Fake news spreads quickly. See Fig.~\ref{fig:arch} and Table~\ref{tab:main}.
\section{Method}
We use a dual encoder. \label{sec:method}
\begin{figure}
\includegraphics{arch.png}
\label{fig:arch}
\end{figure}
\section{Experiments}
We train on the dataset with an 80/10/10 split and compare against baselines. Learning rate 2e-5, batch size 16, 5 epochs.
Throughput is 41.27 documents per second on one GPU.
\begin{table}
\caption{Results}
\label{tab:main}
\begin{tabular}{lc} Ours & 98.1 \end{tabular}
\end{table}
% TODO add significance tests
\section{Conclusion}
We presented a model. See Table~\ref{tab:ablation}.
\begin{thebibliography}{9}
\bibitem{li2020} Li et al.
\bibitem{wang2019} Wang et al.
\end{thebibliography}
\end{document}`;
