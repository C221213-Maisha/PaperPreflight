import { analyze, SAMPLE, detectKind, profileOf, CATEGORY_NAMES } from "./engine.js";
import { PRESETS, presetById } from "./presets.js";
import { parseDocx } from "./docx.js";
import { parseNotebook, SAMPLE_NOTEBOOK } from "./notebook.js";
import { guidanceFor } from "./guidance.js";

const ICON = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="M4.5 6.5l1 1 2-2M4.5 12l1 1 2-2M4.5 17.5l1 1 2-2"/></svg>',
  target: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l4.5 4.5L19.5 6.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M12 3v1.6M12 19.4V21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M3 12h1.6M19.4 12H21M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5M9 13h6M9 16.5h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M4.5 11V9.5a3 3 0 0 1 3-3h11M15.5 3.5l3 3-3 3"/><path d="M19.5 13v1.5a3 3 0 0 1-3 3h-11M8.5 20.5l-3-3 3-3"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/></svg>',
  open: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke-dasharray="2.2 2.6"/></svg>',
  error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.8v5M12 16.2v.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M10.3 4.6 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.8v.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.01"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13.5a3.6 3.6 0 0 0 5.1.4l2.7-2.7a3.6 3.6 0 0 0-5.1-5.1l-1 1"/><path d="M14 10.5a3.6 3.6 0 0 0-5.1-.4l-2.7 2.7a3.6 3.6 0 0 0 5.1 5.1l1-1"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
  notebook: '<svg viewBox="0 0 24 24"><rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M3.5 8h3M3.5 12h3M3.5 16h3M10 8.5l-1.5 1.5 1.5 1.5M14 8.5l1.5 1.5-1.5 1.5M9.5 15.5h5"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><path d="M5 8.5h14v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5z"/><path d="M3.5 4.5h17v4h-17zM10 12.5h4"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.3M12 16.6v.01"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M7 9V4.5h10V9M7 17H5.5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v5.5H7z"/></svg>',
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const icon = (n) => { const s = document.createElement("span"); s.className = "ico"; s.setAttribute("aria-hidden", "true"); s.innerHTML = ICON[n]; return s; };
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("on"), 2600);
}
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const kb = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");

$$("[data-i]").forEach((el) => { el.innerHTML = ICON[el.dataset.i] || ""; el.setAttribute("aria-hidden", "true"); });

/* ---------- Theme ---------- */
const root = document.documentElement;
const themeBtn = $("#theme");
const paintTheme = () => themeBtn.setAttribute("aria-checked", String(root.dataset.theme === "dark"));
paintTheme();
const calm = matchMedia("(prefers-reduced-motion: reduce)");
themeBtn.addEventListener("click", () => {
  const flip = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("pp-theme", root.dataset.theme); } catch {}
    paintTheme();
  };
  if (calm.matches) return flip();
  if (document.startViewTransition) return document.startViewTransition(flip);
  root.classList.add("theming"); flip();
  setTimeout(() => root.classList.remove("theming"), 400);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  let saved = null; try { saved = localStorage.getItem("pp-theme"); } catch {}
  if (!saved) { root.dataset.theme = e.matches ? "dark" : "light"; paintTheme(); }
});
const top = $(".top");
addEventListener("scroll", () => top.classList.toggle("scrolled", scrollY > 8), { passive: true });

/* ---------- Settings ---------- */
const venueSel = $("#venue"), limitIn = $("#limit"), pagesIn = $("#pages");
PRESETS.forEach((p) => venueSel.append(h("option", { value: p.id }, p.name)));
function applyPreset(id, keepValues) {
  const p = presetById(id);
  venueSel.value = p.id;
  if (!keepValues) { limitIn.value = p.abstract || ""; pagesIn.value = p.pages || ""; }
  $("#venue-note").textContent = p.id === "none" ? "" : p.note + " Typical values, so confirm them against the current call for papers.";
}
let saved = {};
try { saved = JSON.parse(localStorage.getItem("pp-settings") || "{}"); } catch {}
applyPreset(saved.venue || "none", false);
if (saved.limit !== undefined) limitIn.value = saved.limit;
if (saved.pages !== undefined) pagesIn.value = saved.pages;
const saveSettings = () => { try { localStorage.setItem("pp-settings", JSON.stringify({ venue: venueSel.value, limit: limitIn.value, pages: pagesIn.value })); } catch {} };
venueSel.addEventListener("change", () => { applyPreset(venueSel.value, false); saveSettings(); if (current) run(); });
[limitIn, pagesIn].forEach((el) => el.addEventListener("change", () => { saveSettings(); if (current) run(); }));
$("#settings").addEventListener("submit", (e) => e.preventDefault());

let tpl = null, bib = null; // { name, profile } and { name, text }
function attachChip(slot, label, name, onRemove) {
  const box = $(slot), lab = box.querySelector("label");
  box.querySelector(".chip")?.remove();
  lab.hidden = !!name;
  if (name) box.append(h("span", { class: "chip" }, icon("check"), h("span", { class: "name", title: name }, name),
    h("button", { type: "button", "aria-label": `Remove ${label}`, onclick: onRemove }, icon("x"))));
}
$("#tpl-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  try {
    const r = await readFile(f, ["docx", "tex"]);
    if (r.kind === "docx") tpl = { name: f.name, profile: profileOf({ kind: "docx", model: r.model }) };
    else if (/\\documentclass/.test(r.text)) tpl = { name: f.name, profile: profileOf({ kind: "latex", text: r.text }) };
    else return toast("A template must be a .docx file or a .tex file with \\documentclass");
    attachChip("#tpl", "template", tpl.name, () => { tpl = null; attachChip("#tpl", "template", null); if (current) run(); });
    if (current) run();
  } catch (err) { toast(err.message || "Could not read that template"); }
});
$("#bib-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  if (f.size > 5e6) return toast("That .bib file is larger than 5 MB");
  bib = { name: f.name, text: await f.text() };
  attachChip("#bib", "bibliography", bib.name, () => { bib = null; attachChip("#bib", "bibliography", null); if (current) run(); });
  if (current) run();
});

/* ---------- Experiment results (beta) ---------- */
// Notebooks with saved outputs, CSV or text results, or a zip of them (such as a Kaggle output zip).
// Up to five items per check. Read here, never executed and never uploaded.
let experiments = []; // [{ name, sources, images, skipped }]
const EXP_MAX = 5, EXP_SIZE = { ipynb: 30e6, csv: 20e6, tsv: 20e6, txt: 20e6, json: 20e6, zip: 150e6 };
function expSummary(e) {
  if (!e.zip) return e.name;
  const n = e.sources.length;
  return `${e.name}, ${n} file${n === 1 ? "" : "s"}`;
}
function paintExperiments() {
  const box = $("#nbs"), lab = box.querySelector("label");
  box.querySelectorAll(".chip").forEach((c) => c.remove());
  lab.hidden = experiments.length >= EXP_MAX;
  lab.lastChild.textContent = experiments.length ? "Add more" : "Notebook, CSV or zip";
  experiments.forEach((e) => lab.before(h("span", { class: "chip", title: e.zip ? `${e.sources.length} checked, ${e.images.length} images listed, ${e.skipped.length} skipped` : e.name },
    icon(e.zip ? "archive" : "notebook"), h("span", { class: "name" }, expSummary(e)),
    h("button", { type: "button", "aria-label": `Remove ${e.name}`, onclick: () => { experiments = experiments.filter((x) => x !== e); paintExperiments(); if (current) run(); } }, icon("x")))));
}
async function addExperiments(files) {
  for (const f of files) {
    if (experiments.length >= EXP_MAX) { toast(`Up to ${EXP_MAX} result files per check`); break; }
    const ext = (f.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
    if (!EXP_SIZE[ext]) { toast("Use a .ipynb notebook, a .csv results file or a .zip of results"); continue; }
    if (f.size > EXP_SIZE[ext]) { toast(`${f.name} is larger than ${kb(EXP_SIZE[ext])}`); continue; }
    if (experiments.some((n) => n.name === f.name)) continue;
    try {
      if (ext === "zip") {
        const buf = await f.arrayBuffer();
        const head = new Uint8Array(buf.slice(0, 2));
        if (head[0] !== 0x50 || head[1] !== 0x4b) throw new Error("That file is not a valid zip file");
        const { readResultsZip } = await import("./results.js");
        const z = await readResultsZip(buf, f.name);
        if (!z.sources.length) toast(z.images.length ? "That zip only has images. They are listed, but numbers come from notebooks or CSV files." : "No notebooks or CSV files were found in that zip");
        experiments.push({ ...z, zip: true });
      } else if (ext === "ipynb") {
        experiments.push({ name: f.name, sources: [parseNotebook(await f.text(), f.name)], images: [], skipped: [] });
      } else {
        const { parseTextResults } = await import("./results.js");
        experiments.push({ name: f.name, sources: [parseTextResults(await f.text(), f.name)], images: [], skipped: [] });
      }
    } catch (err) { toast(err.message || `Could not read ${f.name}`); }
  }
  paintExperiments();
  if (current) run();
}
$("#nb-file").addEventListener("change", (e) => { const fs = [...e.target.files]; e.target.value = ""; if (fs.length) addExperiments(fs); });

/* ---------- Manuscript input ---------- */
const src = $("#src"), drop = $("#drop"), proof = $("#proof");
let doc = null;         // { kind: "latex"|"text"|"docx"|"pdf", name, size, text?, model? }
let mode = "upload";    // which empty state to show when nothing is loaded
let current = null, catFilter = "all", sevOn = { error: true, warn: true, info: true };
let explainOn = false, explainLine = false;

const KIND_LABEL = { latex: "TeX", text: "Text", docx: "Word", pdf: "PDF" };
const MAX = { pdf: 25e6, docx: 25e6, tex: 5e6, txt: 5e6, bib: 5e6 };

async function readFile(f, allowed) {
  const ext = (f.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  if (!ext || !allowed.includes(ext)) throw new Error(`Use a ${allowed.map((x) => "." + x).join(", ")} file`);
  if (f.size > (MAX[ext] || 5e6)) throw new Error(`That file is larger than ${kb(MAX[ext] || 5e6)}`);
  const buf = await f.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 5));
  if (ext === "docx") {
    if (head[0] !== 0x50 || head[1] !== 0x4b) throw new Error("That file is not a valid Word document");
    return { kind: "docx", model: await parseDocx(buf) };
  }
  if (ext === "pdf") {
    if (String.fromCharCode(...head) !== "%PDF-") throw new Error("That file is not a valid PDF");
    const { parsePdf } = await import("./pdfread.js");
    return { kind: "pdf", model: await parsePdf(buf) };
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (/\u0000/.test(text.slice(0, 2000))) throw new Error("That file does not look like text");
  return { kind: detectKind(text), text };
}

function rowsOf(d) {
  if (!d) return [];
  if (d.kind === "docx") return d.model.paras.map((p, i) => ({ g: "P" + (i + 1), t: p.text }));
  if (d.kind === "pdf") return d.model.paras.map((p) => ({ g: p.loc.replace(" ", ":").replace(/[pl]/g, ""), t: p.text, title: p.loc }));
  return d.text.split("\n").map((t, i) => ({ g: String(i + 1), t }));
}

function paintSource() {
  const has = !!doc;
  $("#filebar").hidden = !has;
  drop.hidden = has || mode !== "upload";
  src.hidden = has ? !doc.editing : mode !== "paste";
  proof.hidden = !has || doc.editing;
  $$("#mode button").forEach((b) => b.setAttribute("aria-selected", String(!has && b.dataset.mode === mode)));
  $("#mode").hidden = has;
  if (has) {
    $("#file-kind").textContent = KIND_LABEL[doc.kind];
    $("#file-name").textContent = doc.name;
    $("#file-meta").textContent = doc.size ? kb(doc.size) : "";
    $("#edit-src").hidden = doc.kind === "docx" || doc.kind === "pdf" || doc.editing;
  }
  paintMeta();
}
function paintMeta() {
  let t = "No manuscript yet";
  if (doc && doc.kind === "docx") t = plural(doc.model.paras.length, "paragraph");
  else if (doc && doc.kind === "pdf") t = `${plural(doc.model.pages, "page")}, ${plural(doc.model.paras.length, "paragraph")}`;
  else if (doc) t = plural(doc.text.split("\n").length, "line");
  else if (mode === "paste" && src.value) t = plural(src.value.split("\n").length, "line");
  $("#meta").textContent = t;
}

const MAX_ROWS = 6000;
function paintProof() {
  if (!doc) return;
  const marks = new Map();
  if (current) for (const f of current.findings) if (f.line && (!marks.has(f.line) || RANKS[f.sev] < RANKS[marks.get(f.line)])) marks.set(f.line, f.sev);
  const rows = rowsOf(doc);
  proof.classList.toggle("prose", doc.kind === "docx" || doc.kind === "pdf");
  const frag = document.createDocumentFragment();
  rows.slice(0, MAX_ROWS).forEach((r, i) => {
    const sev = marks.get(i + 1);
    frag.append(h("div", { class: "row" + (sev ? " f-" + sev : ""), id: "row-" + (i + 1) }, h("span", { class: "g", title: r.title }, r.g), h("span", { class: "t" }, r.t || " ")));
  });
  if (rows.length > MAX_ROWS) frag.append(h("p", { class: "proof-more" }, `Showing the first ${MAX_ROWS} of ${rows.length} rows. Every row is still checked.`));
  proof.replaceChildren(frag);
}
const RANKS = { error: 0, warn: 1, info: 2 };

function setDoc(d) {
  doc = d; current = null;
  paintSource(); paintProof(); resetReport();
}
async function loadFile(f) {
  try {
    const r = await readFile(f, ["tex", "docx", "pdf", "txt"]);
    setDoc({ ...r, name: f.name, size: f.size });
    run();
  } catch (err) { toast(err.message || "Could not read that file"); }
}

$("#file").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) loadFile(f); });
["dragenter", "dragover"].forEach((t) => $("#source").addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => $("#source").addEventListener(t, (e) => { e.preventDefault(); if (t === "drop" || !e.currentTarget.contains(e.relatedTarget)) drop.classList.remove("over"); }));
$("#source").addEventListener("drop", (e) => { const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });
$$("#mode button").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; paintSource(); if (mode === "paste") src.focus(); }));
src.addEventListener("input", paintMeta);
$("#clear-src").addEventListener("click", () => { src.value = ""; setDoc(null); });
$("#edit-src").addEventListener("click", () => { doc.editing = true; src.value = doc.text; paintSource(); src.focus(); });
$$("[data-sample]").forEach((b) => b.addEventListener("click", () => {
  setDoc({ kind: "latex", name: "sample.tex", text: SAMPLE, size: SAMPLE.length });
  if (!experiments.length) { experiments = [{ name: "sample_experiments.ipynb", sources: [parseNotebook(SAMPLE_NOTEBOOK, "sample_experiments.ipynb")], images: [], skipped: [] }]; paintExperiments(); }
  if (venueSel.value === "none") { applyPreset("ieee", false); saveSettings(); }
  run();
  $("#check").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}));
$("#run").addEventListener("click", run);
addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } });

function run() {
  if (doc && doc.editing) { doc.text = src.value; doc.kind = detectKind(src.value); doc.editing = false; }
  if (!doc && mode === "paste" && src.value.trim()) doc = { kind: detectKind(src.value), name: "Pasted text", text: src.value, size: 0 };
  if (!doc) return toast(mode === "paste" ? "Paste some text first" : "Add a manuscript first");
  const opts = {
    venue: venueSel.value, abstractLimit: limitIn.value === "" ? 0 : limitIn.value, pageLimit: Number(pagesIn.value) || null,
    template: tpl && tpl.profile, templateName: tpl && tpl.name, bib: bib && bib.text,
    notebooks: experiments.flatMap((e) => e.sources), resultImages: experiments.flatMap((e) => e.images),
  };
  const input = doc.kind === "docx" || doc.kind === "pdf" ? { kind: doc.kind, model: doc.model } : { kind: doc.kind, text: doc.text };
  render(analyze(input, opts));
  paintSource(); paintProof();
}

function jumpTo(line) {
  const row = document.getElementById("row-" + line);
  if (!row) return;
  if (innerWidth <= 1080) $("#source").scrollIntoView({ block: "start" });
  proof.scrollTop = row.offsetTop - proof.clientHeight / 3;
  row.classList.remove("focus"); void row.offsetWidth; row.classList.add("focus");
}

/* ---------- Report ---------- */
const reportEmpty = $("#report .empty").cloneNode(true);
function resetReport() {
  $("#report").replaceChildren(h("div", { class: "pane-head" }, h("h3", { id: "rep-h" }, "Report")), reportEmpty.cloneNode(true));
}

function render(res, opts = {}) {
  const shared = !!opts.shared;
  res.live = !shared;
  current = res; catFilter = "all"; sevOn = { error: true, warn: true, info: true };
  const panel = $("#report");
  const head = h("div", { class: "pane-head" }, h("h3", { id: "rep-h" }, shared ? "Shared report" : "Report"),
    h("div", { class: "tools no-print" },
      h("button", { class: "btn ghost xs", type: "button", onclick: copySummary }, icon("copy"), "Copy"),
      h("button", { class: "btn ghost xs", type: "button", onclick: () => print() }, icon("print"), "Print"),
      shared ? null : h("button", { class: "btn xs", id: "share", type: "button", onclick: share }, icon("link"), "Share")));

  const c = res.counts;
  const band = res.score >= 85 ? " high" : res.score >= 60 ? " mid" : " low";
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 96 96");
  const circ = (cls) => { const e = document.createElementNS(ns, "circle"); e.setAttribute("cx", 48); e.setAttribute("cy", 48); e.setAttribute("r", 42); e.setAttribute("class", cls); return e; };
  const val = circ("val"); svg.append(circ("trk"), val);
  const num = h("b", {}, calm.matches ? String(res.score) : "0");
  const ring = h("div", { class: "ring" + band, role: "img", "aria-label": `Readiness score ${res.score} out of 100` }, svg, num);
  requestAnimationFrame(() => requestAnimationFrame(() => { val.style.strokeDashoffset = String(263.9 * (1 - res.score / 100)); }));
  if (!calm.matches) countUp(num, res.score, 1100);

  const cats = Object.keys(CATEGORY_NAMES).filter((k) => k !== "notebook" || res.notebook || res.findings.some((f) => f.cat === "notebook"));
  const perCat = Object.fromEntries(cats.map((k) => [k, res.findings.filter((f) => f.cat === k).length]));
  const seg = h("div", { class: "seg", role: "group", "aria-label": "Category" },
    [["all", "All", res.findings.length], ...cats.map((k) => [k, CATEGORY_NAMES[k], perCat[k]])].map(([k, label, n]) =>
      h("button", { type: "button", "aria-pressed": String(k === "all"), "data-cat": k, onclick: (e) => {
        catFilter = k; seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); drawList();
      } }, label, h("small", {}, String(n)))));
  const sev = h("div", { class: "sev-toggle", role: "group", "aria-label": "Severity" },
    [["error", "Errors"], ["warn", "Warnings"], ["info", "Notes"]].map(([k, label]) =>
      h("button", { type: "button", class: k, "aria-pressed": "true", onclick: (e) => {
        sevOn[k] = !sevOn[k]; e.currentTarget.setAttribute("aria-pressed", String(sevOn[k])); drawList();
      } }, label)));

  const passed = res.checklist.filter((i) => i.pass).length;
  panel.replaceChildren(head, h("div", { class: "rbody" },
    h("div", { class: "summary" }, ring,
      h("div", { class: "sum-text" }, h("h4", {}, res.grade), h("p", { class: "ctx" }, res.template || ""),
        h("div", { class: "counts" },
          h("span", { class: "pill error" }, plural(c.error, "error")), h("span", { class: "pill warn" }, plural(c.warn, "warning")), h("span", { class: "pill info" }, plural(c.info, "note"))))),
    res.notebook ? nbCard(res.notebook) : null,
    h("div", { class: "filters no-print" }, seg, sev),
    h("div", { id: "list" }),
    h("div", { class: "cl-wrap" }, h("div", { class: "cl-head" }, h("h4", {}, "Reporting checklist"), h("span", {}, `${passed} of ${res.checklist.length} covered`)),
      h("div", { class: "cl" }, res.checklist.map((i) => h("div", { class: i.pass ? "pass" : "miss", title: i.pass ? "Covered" : "Not found" }, icon(i.pass ? "check" : "open"), h("span", {}, i.name))))),
    !shared && explainOn ? h("label", { class: "opt no-print" }, h("input", { type: "checkbox", id: "explain-line", checked: explainLine || null, onchange: (e) => { explainLine = e.target.checked; } }),
      "Let More detail read the flagged sentence too. Otherwise it only sees the issue.") : null,
    h("div", { id: "share-out" })));
  drawList();
}

function nbCard(n) {
  const files = Array.isArray(n.files) ? n.files.length : n.files;
  const pct = (k) => (n.checked ? (100 * k) / n.checked : 0);
  const bar = h("div", { class: "nb-bar", role: "img", "aria-label": `${n.matched} matched, ${n.differ} differ, ${n.missing} not found` },
    ...[["ok", n.matched], ["warn", n.differ], ["miss", n.missing]].map(([c, k]) => { const s = h("span", { class: c }); s.style.setProperty("--w", pct(k) + "%"); return s; }));
  return h("div", { class: "nb-card" },
    h("div", { class: "nb-head" }, icon("notebook"), h("h4", {}, "Experiment results"), h("span", { class: "beta" }, "Beta"),
      h("span", { class: "nb-files" }, plural(files, "file"))),
    n.checked
      ? h("p", { class: "nb-big" }, h("b", {}, String(n.matched)), ` of ${plural(n.checked, "reported result")} match your outputs`)
      : h("p", { class: "nb-big" }, "No reported results found to compare"),
    n.checked ? bar : null,
    h("div", { class: "nb-legend" },
      h("span", { class: "ok" }, `${n.matched} match`), h("span", { class: "warn" }, `${n.differ} differ`), h("span", { class: "miss" }, `${n.missing} not found`)));
}

function drawList() {
  const list = $("#list"); list.replaceChildren();
  const rows = current.findings.filter((f) => (catFilter === "all" || f.cat === catFilter) && sevOn[f.sev]);
  if (!rows.length) return list.append(h("p", { class: "none" }, current.findings.length ? "Nothing in this view." : "No findings. That is a good sign."));
  const groups = catFilter === "all" ? Object.keys(CATEGORY_NAMES) : [catFilter];
  let i = 0;
  for (const g of groups) {
    const items = rows.filter((f) => f.cat === g);
    if (!items.length) continue;
    list.append(h("section", { class: "group" }, h("h5", {}, CATEGORY_NAMES[g], h("span", {}, String(items.length))),
      h("div", { class: "items" }, items.map((f) => { const el = itemEl(f); el.style.setProperty("--i", Math.min(i++, 14)); return el; }))));
  }
}

function itemEl(f) {
  const canJump = !!(doc && f.line && current.live);
  const loc = f.loc ? (canJump ? h("button", { class: "loc", type: "button", title: "Show in the manuscript", onclick: () => jumpTo(f.line) }, f.loc) : h("span", { class: "loc" }, f.loc)) : h("span");
  const el = h("div", { class: "item " + f.sev }, icon(f.sev), h("div", {}, h("div", { class: "ttl" }, f.title), h("div", { class: "dt" }, f.detail)), loc);
  const g = guidanceFor(f.title);
  if (g) {
    const btn = h("button", { class: "link", type: "button", "aria-expanded": "false", onclick: () => toggleGuide(f, g, el, btn) }, icon("help"), "Why it matters");
    el.append(h("div", { class: "acts no-print" }, btn));
  }
  return el;
}

/* ---------- Guidance: prewritten, works offline ---------- */
function toggleGuide(f, g, el, btn) {
  const open = el.querySelector(".explain");
  if (open) { open.remove(); btn.setAttribute("aria-expanded", "false"); return; }
  btn.setAttribute("aria-expanded", "true");
  const box = h("div", { class: "explain" },
    h("p", {}, h("b", {}, "Why it matters. "), g.why),
    h("p", {}, h("b", {}, "How to fix it. "), g.fix));
  if (explainOn && current.live) {
    const more = h("button", { class: "link more", type: "button", onclick: () => explain(f, box, more) }, icon("sparkle"), "More detail");
    box.append(more);
  }
  el.append(box);
}

/* ---------- Optional detailed explanations (server side, only when configured) ---------- */
const explained = new Map();
async function explain(f, host, btn) {
  host.querySelector(".explain-more")?.remove();
  const box = h("div", { class: "explain-more loading" }, "Writing a more detailed explanation.");
  host.append(box); btn.disabled = true;
  const excerpt = explainLine && f.line && doc ? (rowsOf(doc)[f.line - 1]?.t || "").slice(0, 600) : "";
  const key = JSON.stringify([f.title, f.detail, excerpt, current.venue]);
  try {
    let text = explained.get(key);
    if (!text) {
      const r = await fetch("/api/explain", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: f.title, detail: f.detail, sev: f.sev, cat: f.cat, venue: current.venue, format: current.format, excerpt }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error === "rate_limited" ? "Too many explanations at once. Try again in a minute." : data.error === "daily_limit" ? "The daily explanation budget is used up. Try again tomorrow." : "Explanations are unavailable right now.");
      text = data.text; explained.set(key, text);
    }
    box.classList.remove("loading");
    box.replaceChildren(...text.split(/\n{2,}/).map((p) => h("p", {}, p)), h("span", { class: "by" }, icon("sparkle"), "Generated explanation. The issue itself was found by a fixed rule."));
  } catch (err) { box.classList.remove("loading"); box.textContent = err.message; }
  btn.disabled = false;
}
fetch("/api/explain", { method: "GET" }).then((r) => (r.ok ? r.json() : {})).then((d) => {
  explainOn = !!d.enabled;
  if (explainOn && current && current.live) render(current);
}).catch(() => {});

/* ---------- Share, copy ---------- */
async function share() {
  const btn = $("#share"); btn.disabled = true;
  try {
    const { score, grade, counts, findings, checklist, template, unit } = current;
    const nb = current.notebook && { files: Array.isArray(current.notebook.files) ? current.notebook.files.length : current.notebook.files,
      checked: current.notebook.checked, matched: current.notebook.matched, differ: current.notebook.differ, missing: current.notebook.missing };
    const r = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ score, grade, counts, checklist, template, unit, notebook: nb, findings: findings.map(({ sev, title, detail, line, loc, cat }) => ({ sev, title, line, loc, cat,
        // Never send quoted manuscript text. The server enforces the same rule.
        detail: /^(Placeholder left|Highlighted text left)/.test(title) ? "Text at this location is flagged. Open your manuscript to see it." : detail })) }) });
    if (!r.ok) throw new Error();
    const { id } = await r.json();
    const url = `${location.origin}/#r=${id}`;
    $("#share-out").replaceChildren(h("div", { class: "share" }, icon("link"), h("span", {}, url)),
      h("p", { class: "share-note" }, "Anyone with this link can see the score and the list of issues, not your paper. The saved report is deleted after 30 days, and then the link stops working."));
    await navigator.clipboard?.writeText(url).catch(() => {});
    toast("Link copied. It works for 30 days.");
  } catch { toast("Could not save the report. Try again shortly."); }
  btn.disabled = false;
}

function copySummary() {
  const c = current.counts;
  const lines = [`PaperPreflight: ${current.score}/100, ${current.grade}`, current.template || "", `${plural(c.error, "error")}, ${plural(c.warn, "warning")}, ${plural(c.info, "note")}`, "",
    ...current.findings.filter((f) => f.sev !== "info").map((f) => `- ${f.loc ? f.loc + "  " : ""}${f.title}: ${f.detail}`)];
  navigator.clipboard.writeText(lines.join("\n")).then(() => toast("Summary copied"), () => toast("Copy failed"));
}

function countUp(el, to, ms) {
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = String(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function countFrom(el, a, b, ms) {
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = String(Math.round(a + (b - a) * k)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- Scroll reveals ---------- */
const revealer = "IntersectionObserver" in window && !calm.matches
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })
  : null;
$$(".reveal").forEach((el) => (revealer ? revealer.observe(el) : el.classList.add("in")));

/* ---------- Hero demo: scan, flag lines, list findings, settle the score ---------- */
(function demo() {
  const win = $("#demo");
  if (!win) return;
  const flags = [...win.querySelectorAll("[data-flag]")], items = [...win.querySelectorAll(".mini-list li")];
  const ring = $("#demo-ring"), score = $("#demo-score"), status = $("#demo-status");
  const setRing = (v) => { ring.style.strokeDashoffset = String(119.4 * (1 - v / 100)); };
  const settle = () => { flags.forEach((f) => f.classList.add("on")); items.forEach((i) => i.classList.add("on")); score.textContent = "71"; setRing(71); win.classList.add("done"); status.textContent = "3 issues found"; };
  if (calm.matches) return settle();
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(win);
  const cycle = () => {
    while (timers.length) clearTimeout(timers.pop());
    if (!visible || document.hidden) return at(1500, cycle);
    flags.forEach((f) => f.classList.remove("on"));
    items.forEach((i) => i.classList.remove("on"));
    win.classList.remove("done", "scanning");
    void win.offsetWidth;
    win.classList.add("scanning");
    status.textContent = "Checking"; score.textContent = "100"; setRing(100);
    [[700, 0], [1250, 1], [1700, 2]].forEach(([ms, k]) => at(ms, () => flags[k].classList.add("on")));
    [[1100, 0, 88], [1650, 1, 80], [2100, 2, 71]].forEach(([ms, k, v]) => at(ms, () => { items[k].classList.add("on"); setRing(v); countFrom(score, +score.textContent, v, 400); }));
    at(2500, () => { win.classList.add("done"); status.textContent = "3 issues found"; });
    at(9000, cycle);
  };
  at(900, cycle);
})();

/* ---------- Start ---------- */
paintSource();
const m = location.hash.match(/^#r=([a-f0-9]{20})$/);
if (m) {
  fetch("/api/reports?id=" + m[1]).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
    render(d, { shared: true });
    $("#check").scrollIntoView();
  }).catch(() => toast("That shared report was not found. Links stop working after 30 days."));
}
