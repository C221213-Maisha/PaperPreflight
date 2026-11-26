// Results files for the experiment check (beta). Reads CSV and other text outputs, alone or inside a zip
// (for example a Kaggle "Save Version" output zip). Images are listed, never analysed.
// Everything stays in the browser. Nothing is executed.
import { readZip } from "./zip.js";
import { parseNotebook } from "./notebook.js";

const TEXT_EXT = /\.(csv|tsv|txt|log|json|jsonl|md)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|bmp|tiff?|pdf|eps)$/i;
const PER_FILE = 20e6;      // inflated bytes read from any one file
const PER_ZIP = 60e6;       // inflated bytes read from one zip in total
const MAX_FILES = 200;      // checkable files read from one zip
const MAX_ROWS = 200000;

const base = (n) => n.split("/").pop();
const skipEntry = (n) => n.endsWith("/") || /(^|\/)(__MACOSX|\.ipynb_checkpoints|\.git)\//.test(n) || base(n).startsWith(".");

// A text file becomes a "source" with one entry per row, in the same shape as a parsed notebook.
export function parseTextResults(text, name) {
  const csv = /\.(csv|tsv)$/i.test(name);
  const cells = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length && i < MAX_ROWS; i++) if (/\d/.test(lines[i])) cells.push({ n: i + 1, exec: null, text: lines[i].slice(0, 20000) });
  return { name, kind: csv ? "csv" : "text", unit: csv ? "row" : "line", cells, errors: [], unrun: [], outOfOrder: false, outputs: cells.length, codeCells: 0 };
}

// Reads a results zip. Returns { name, sources, images, skipped }.
export async function readResultsZip(buf, name) {
  const zip = await readZip(buf, "zip file");
  const sources = [], images = [], skipped = [];
  let budget = PER_ZIP;
  for (const e of zip.entries()) {
    if (skipEntry(e.name)) continue;
    const label = e.name.replace(/^\/+/, "");
    if (IMAGE_EXT.test(label)) { images.push(label); continue; }
    const nb = /\.ipynb$/i.test(label);
    if (!nb && !TEXT_EXT.test(label)) { skipped.push(label); continue; }
    if (sources.length >= MAX_FILES || e.size > PER_FILE || e.size > budget) { skipped.push(label); continue; }
    try {
      const text = await zip.read(e.name, Math.min(PER_FILE, budget));
      budget -= text.length;
      sources.push(nb ? { ...parseNotebook(text, label), kind: "notebook", unit: "cell" } : parseTextResults(text, label));
    } catch { skipped.push(label); }
  }
  return { name, sources, images, skipped };
}
