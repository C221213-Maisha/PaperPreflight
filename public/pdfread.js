// Reads a PDF in the browser with pdf.js and rebuilds paragraphs with page and line numbers.
// Nothing is uploaded. pdf.js is loaded only when a PDF is chosen.

const MAX_PAGES = 300;
const HEAD = /^\s*(?:\d+\.?|[IVX]+\.)?\s*(abstract|introduction|related work|background|methods?|methodology|approach|experiments?|experimental setup|results?|evaluation|discussion|conclusions?|limitations?|impact statement|broader impacts?|references|bibliography|acknowledge?ments?|appendix)\s*$/i;
const CAPTION = /^(fig(?:ure)?|table)\.?\s*(\d+|[IVXLC]+)\b/i;
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

// pages: [{ items: [{ str, x, y, h }] }] in content order, y measured upward as in PDF space.
// Returns paragraphs: { text, page, line, loc } where line is the line number on that page.
export function linesToParas(pages) {
  const paras = [];
  pages.forEach((pg, pi) => {
    // 1. Group items into lines by baseline.
    const lines = [];
    let cur = null;
    for (const it of pg.items) {
      if (!it.str || !it.str.trim()) { if (cur && it.str) cur.text += " "; continue; }
      if (cur && Math.abs(it.y - cur.y) <= Math.max(1.5, 0.45 * (it.h || cur.h))) {
        cur.text += (/\s$/.test(cur.text) || it.x - cur.end < 0.15 * it.h ? "" : " ") + it.str;
        cur.end = it.x + (it.w || 0);
      } else {
        cur = { text: it.str, y: it.y, x: it.x, h: it.h || 10, end: it.x + (it.w || 0) };
        lines.push(cur);
      }
    }
    lines.forEach((l) => { l.text = l.text.replace(/\s+/g, " ").trim(); });
    const kept = lines.filter((l) => l.text && !/^\d{1,4}$/.test(l.text)); // drop bare page numbers
    const gaps = [];
    for (let i = 1; i < kept.length; i++) { const g = kept[i - 1].y - kept[i].y; if (g > 0) gaps.push(g); }
    const lead = median(gaps) || 12;

    // 2. Join lines into paragraphs.
    let para = null;
    kept.forEach((l, li) => {
      const prev = kept[li - 1];
      const gap = prev ? prev.y - l.y : 0;
      const start = !para || !prev
        || gap > lead * 1.45 || gap < -2                 // larger gap, or a jump up to the next column
        || Math.abs(l.h - prev.h) > 0.18 * prev.h        // size change, such as a heading
        || HEAD.test(prev.text) || HEAD.test(l.text)
        || CAPTION.test(l.text) || /^\[\d+\]/.test(l.text)
        || /^(keywords?|index terms)\b/i.test(l.text);
      if (start) {
        para = { text: l.text, page: pi + 1, line: li + 1 };
        paras.push(para);
      } else if (/[A-Za-z]-$/.test(para.text) && /^[a-z]/.test(l.text)) {
        para.text = para.text.slice(0, -1) + l.text;     // join a word split by hyphenation
      } else {
        para.text += " " + l.text;
      }
    });
  });
  return paras.map((p) => ({ text: p.text, page: p.page, loc: `p${p.page} l${p.line}`, style: "", highlight: false }));
}

let lib = null;
async function loadPdfJs() {
  if (!lib) {
    lib = await import("./vendor/pdfjs/pdf.min.mjs");
    lib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
  }
  return lib;
}

// pdfjs and the font data location can be passed in by tests running under Node.
export async function parsePdf(buf, pdfjs, fontsUrl = new URL("./vendor/pdfjs/standard_fonts/", import.meta.url).href) {
  pdfjs = pdfjs || (await loadPdfJs());
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, standardFontDataUrl: fontsUrl, verbosity: 0 });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    if (e && e.name === "PasswordException") throw new Error("That PDF is password protected");
    throw new Error("Could not read that PDF");
  }
  try {
    if (doc.numPages > MAX_PAGES) throw new Error(`PDFs over ${MAX_PAGES} pages are not supported`);
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push({ items: tc.items.filter((it) => "str" in it).map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height, w: it.width })) });
      page.cleanup();
    }
    const paras = linesToParas(pages);
    if (paras.length < 5) throw new Error("This PDF has almost no text. Scanned pages cannot be checked");
    return { kind: "pdf", paras, pages: doc.numPages };
  } finally {
    await task.destroy();
  }
}
