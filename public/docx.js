import { readZip } from "./zip.js";

const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
const attr = (s, n) => { const m = s.match(new RegExp(n + '="([^"]*)"')); return m ? m[1] : null; };
const bump = (map, k, n) => map.set(k, (map.get(k) || 0) + n);

// Reads a .docx entirely in the browser and returns a plain model the rule engine can check.
export async function parseDocx(buf) {
  const zip = await readZip(buf);
  const doc = await zip.read("word/document.xml");
  if (!doc) throw new Error("That file does not look like a Word document");
  const styles = (await zip.read("word/styles.xml")) || "";
  const comments = (await zip.read("word/comments.xml")) || "";
  const app = (await zip.read("docProps/app.xml")) || "";

  const paras = [], fonts = new Map(), sizes = new Map(), used = new Set();
  // Character ranges covered by tables, so paragraphs inside tables can be marked.
  const tblRanges = [];
  { const re = /<w:tbl>|<\/w:tbl>/g; let depth = 0, start = 0, m;
    while ((m = re.exec(doc))) { if (m[0] === "<w:tbl>") { if (depth++ === 0) start = m.index; } else if (depth > 0 && --depth === 0) tblRanges.push([start, m.index]); } }
  const inTable = (i) => tblRanges.some(([a, b]) => i > a && i < b);
  for (const pm of doc.matchAll(/<w:p(?:\s[^>]*[^/])?>([\s\S]*?)<\/w:p>/g)) {
    const x = pm[1];
    const style = (x.match(/<w:pStyle\s+w:val="([^"]*)"/) || [])[1] || "";
    let text = "";
    for (const rm of x.matchAll(/<w:r(?:\s[^>]*[^/])?>([\s\S]*?)<\/w:r>/g)) {
      const r = rm[1];
      let t = "";
      for (const tm of r.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g)) t += tm[1] !== undefined ? unesc(tm[1]) : " ";
      if (!t) continue;
      text += t;
      const f = (r.match(/<w:rFonts[^>]*w:ascii="([^"]*)"/) || [])[1];
      const s = (r.match(/<w:sz\s+w:val="(\d+)"/) || [])[1];
      if (f) bump(fonts, f, t.length);
      if (s) bump(sizes, +s / 2, t.length);
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (style) used.add(style);
    paras.push({ text, style, highlight: /<w:highlight\s/.test(x), inTable: inTable(pm.index) });
  }

  const sect = ([...doc.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)].pop() || [""])[0];
  const pg = (n, s) => { const v = attr(s, n); return v === null ? null : +v; };
  const sz = sect.match(/<w:pgSz[^>]*>/)?.[0] || "", mar = sect.match(/<w:pgMar[^>]*>/)?.[0] || "", cols = sect.match(/<w:cols[^>]*>/)?.[0] || "";
  const dd = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] || "";

  return {
    kind: "docx", paras, fonts, sizes, used,
    images: (doc.match(/<w:drawing[\s>]|<w:pict[\s>]/g) || []).length,
    tables: (doc.match(/<w:tbl>/g) || []).length,
    ins: (doc.match(/<w:ins\s/g) || []).length,
    del: (doc.match(/<w:del\s/g) || []).length,
    comments: (comments.match(/<w:comment\s/g) || []).length,
    pages: +((app.match(/<Pages>(\d+)<\/Pages>/) || [])[1] || 0) || null,
    page: { w: pg("w:w", sz), h: pg("w:h", sz), top: pg("w:top", mar), right: pg("w:right", mar), bottom: pg("w:bottom", mar), left: pg("w:left", mar), cols: pg("w:num", cols) || 1 },
    defaults: { font: (dd.match(/w:ascii="([^"]*)"/) || [])[1] || null, size: dd.match(/<w:sz\s+w:val="(\d+)"/) ? +dd.match(/<w:sz\s+w:val="(\d+)"/)[1] / 2 : null },
    styleIds: new Set([...styles.matchAll(/<w:style\s[^>]*w:styleId="([^"]*)"/g)].map((m) => m[1])),
  };
}
