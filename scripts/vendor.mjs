// Copies the PDF reader and the fonts from node_modules into public/, so the site loads nothing from third parties.
// Run after upgrading pdfjs-dist or a font package: npm run vendor
import fs from "node:fs";
const nm = new URL("../node_modules/", import.meta.url), pub = new URL("../public/", import.meta.url);
const copy = (from, to) => { fs.mkdirSync(new URL(".", new URL(to, pub)), { recursive: true }); fs.copyFileSync(new URL(from, nm), new URL(to, pub)); };
for (const f of ["pdf.min.mjs", "pdf.worker.min.mjs"]) copy(`pdfjs-dist/build/${f}`, `vendor/pdfjs/${f}`);
copy("pdfjs-dist/LICENSE", "vendor/pdfjs/LICENSE");
for (const f of fs.readdirSync(new URL("pdfjs-dist/standard_fonts/", nm))) copy(`pdfjs-dist/standard_fonts/${f}`, `vendor/pdfjs/standard_fonts/${f}`);
copy("@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", "fonts/geist-latin-wght-normal.woff2");
copy("@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2", "fonts/geist-mono-latin-wght-normal.woff2");
console.log("vendored pdf.js and fonts into public/");
