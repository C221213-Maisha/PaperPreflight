# PaperPreflight

A private, rule-based pre-submission checker for research manuscripts in LaTeX, Word (.docx) and PDF. All checks run in the browser. A Netlify Function stores shared reports in Netlify Blobs, Every finding comes with a prewritten "why it matters and how to fix it" note, so no API key is needed.

## 1. What it checks

Findings are grouped into four categories, plus a fifth when notebooks are attached. Each one has a severity (error, warning, note) and, where possible, a location you can click to jump to in the manuscript.

| Category | Checks |
|---|---|
| Consistency | Decimals and percentages in the abstract that never appear in the paper, that only match after rounding (98.6 against 98.55), or that appear in the text but in no table. Figures and tables mentioned but never captioned, or captioned but never mentioned. Undefined LaTeX labels. Citation keys missing from the bibliography (including an uploaded .bib) and entries nobody cites. Numbered citations such as [5] with no entry. |
| Reporting | ML checklist: dataset, split, seeds or repeated runs, baselines, hyperparameters, significance tests, ablation, limitations, leakage safeguards, code and data availability. |
| Format | Abstract word limit, page limit, expected sections and their order, venue-required sections, citation style (numbered or author-year, and mixed styles), LaTeX document class, venue style package and bibliography style, keywords, layout overrides, fonts in Word files, and an optional comparison with a .docx or .tex template. |
| Clean-up | TODO and placeholder markers, highlighted text, unresolved tracked changes and comments in Word files. |
| Experiments (beta) | Results reported in the paper compared with the saved outputs of attached Jupyter notebooks, result CSV files or a zip of results, plus notebook hygiene. See below. |

Score = 100 minus 12 per error, 4 per warning, 1 per note.

### Experiment check (beta, for AI and ML papers)

The "Experiment results" upload takes up to five items per check, in any mix:

- Jupyter notebooks (`.ipynb`, 30 MB each) saved with outputs.
- Result files (`.csv`, `.tsv`, `.txt`, `.json`, 20 MB each).
- A `.zip` of results (150 MB), such as the output zip of a Kaggle saved version or any zipped results folder. `public/results.js` reads notebooks and CSV or text files inside it. Images and plots are listed in one note, since fixed rules cannot compare them. Model weights and other binaries are skipped without being decompressed. Safety limits: at most 200 files read, 20 MB inflated per file and 60 MB per zip, counted while inflating; `__MACOSX` and checkpoint folders are ignored.

`public/notebook.js` and `public/results.js` read everything in the browser. Nothing is executed and nothing is uploaded. Each CSV row or text line is treated like a notebook cell, so a mismatch says where the closest value is, for example "row 2 of metrics.csv".

1. **Notebook outputs.** Every code cell's saved output is read: stdout and stderr streams, `text/plain` results, and HTML tables (tags stripped) when there is no plain text version. Every number in those outputs is collected with its notebook and cell.
2. **Reported results.** Decimals and percentages are taken from table rows, the abstract, and sentences that name a metric or result (accuracy, F1, BLEU, loss, AUC, gain, throughput and similar). Integers, years and version numbers are left out, since they are rarely results. Word marks table cells; in PDF and plain text a short row with three or more numbers counts as a table row.
3. **Matching.** A paper value matches when a notebook value equals it, rounds to it at the paper's precision, or does so after converting between a fraction and a percentage (0.98547 matches 98.55%).
4. **Findings.** A value within 3% of an output that does not round to it is a warning, "Result differs from the notebook", flagged on the paper line with the closest output and its cell. A value with no close output is a note, since numbers quoted from other papers are expected. Notebooks with no saved outputs, error outputs, cells run out of order, or code cells that never ran get their own findings.

The report shows a summary ("3 of 5 reported results match your outputs") with match, differ and not-found counts. A shared report keeps only those counts, never notebook names or values. The check is deterministic, so the same paper and notebooks always give the same result. Run notebooks top to bottom and save them with outputs before attaching them.

### Venue presets

`public/presets.js` holds presets for IEEE conferences, ACM (acmart), NeurIPS, ICML, ACL long and short papers, Springer LNCS and Elsevier journals. A preset fills in the abstract and page limits (both editable) and switches on its rules: expected class or style package, bibliography style, citation style and required sections (for example the mandatory Limitations section for ACL, the checklist for NeurIPS, the impact statement for ICML). These are typical values from recent calls for papers. Check them each cycle, since venues change limits from year to year.

### Formats

- **LaTeX** (.tex upload or paste). Locations are source lines, such as L12.
- **Word** (.docx). Read with a built-in zip and XML reader. Locations are paragraph numbers, such as P12. Word-only checks: tracked changes, comments, highlights, fonts, images against captions, and template layout comparison.
- **PDF**. Read with pdf.js, loaded only when a PDF is chosen. Text is rebuilt into paragraphs with page and line numbers, such as p3 l12. The page limit uses the real page count. For venues where references do not count, the main text is taken to end on the page where the References heading appears. Scanned PDFs without a text layer cannot be checked.
- **Plain text** pasted from anywhere, with the same checks as Word minus the Word-only ones.

## 2. Architecture

```
Browser (public/)
  index.html, styles.css, theme.js, app.js
  engine.js, presets.js            rule engine, deterministic, no network
  guidance.js                      prewritten "why it matters and how to fix it" notes
  notebook.js, results.js          experiment check (beta): notebooks, CSV and results zips, result matching
  docx.js, zip.js                  Word reader
  pdfread.js + vendor/pdfjs/       PDF reader, lazy loaded
        |
        |  "Share": score, findings, checklist only (never manuscript text)
        v
Netlify Function  /api/reports   (netlify/functions/reports.mjs)  -> Blobs store "reports"
Netlify Function  /api/explain   (netlify/functions/explain.mjs)  -> optional, only with an API key; Blobs "explanations" cache
                                   netlify/lib/                    shared validation, unit tested
```

**Storage.** Netlify Blobs, one JSON document per shared report under an 80-bit random id. No connection strings and no SQL surface. If you later add accounts and report history, move to Netlify DB (Postgres) behind the same endpoint shape.

**Explanations.** `public/guidance.js` holds a fixed note for every rule: why the issue matters and how to fix it. It is shown under each finding with the "Why it matters" button, works offline, costs nothing and never changes between runs. A test checks that every rule has a note.

**Optional detailed explanations (off by default).** If `ANTHROPIC_API_KEY` is set, a "More detail" link appears inside the note and calls `/api/explain` for a longer, tailored explanation. The site does not name the provider. Without the key nothing about it is shown. The rule engine still decides every finding and the score; this function only describes why a finding matters and how to fix it. It sends the finding title and detail, the venue and the input format. The flagged line is sent only if the user ticks the option in the report. Explanations without an excerpt are cached for 30 days, so common findings cost one call in total.

## 3. Security model

- **Manuscripts stay in the browser.** Files are parsed client side. The share endpoint accepts only an allow-listed report shape, and findings that quote manuscript text (placeholders, highlights) have their detail replaced on both client and server.
- **Upload handling.** Extension and magic-byte checks (PK for .docx, %PDF- for PDF), size caps (25 MB documents, 5 MB text and .bib, 30 MB notebooks, 20 MB result files and 150 MB results zips with the inflate limits above, at most five per check, never executed), a zip reader that counts bytes while inflating so a zip bomb cannot expand past 40 MB, a 300 page cap for PDFs, and pdf.js with `isEvalSupported: false`.
- **Endpoints.** Same-origin check, `application/json` required, body caps (60 KB reports, 4 KB explain), strict field truncation, ids validated with `^[a-f0-9]{20}$`, Netlify rate limits (20 per minute per IP for reports, 10 for explain), a soft daily cap on explanations (`EXPLAIN_DAILY_LIMIT`), `no-store` and `noindex` on every API response.
- **Expiry.** Shared reports expire after 30 days (checked and deleted on read).
- **Browser hardening** (netlify.toml): CSP with no third-party origins at all (fonts and pdf.js are self-hosted), no inline scripts or styles, `object-src 'none'`, frame-ancestors none, COOP and CORP same-origin, HSTS, nosniff, no referrer, locked-down Permissions-Policy.
- **XSS.** Every user-derived string is rendered with text nodes. `innerHTML` is used only for the static icon set.
- **Secrets.** Only `ANTHROPIC_API_KEY`, set in Netlify environment variables, never in the repo. Blobs access is provided by the Netlify runtime.

## 4. Design

- Product-grade and quiet. Two palettes designed separately rather than inverted.
  - **Daylight** (light): cool paper white #F6F7F9, white surfaces, slate ink #111827, a calm cobalt accent #2F5BEA, soft desaturated severity colours.
  - **Midnight** (dark): deep navy #0A0F1C with lifted surfaces #111A2D and #16213A, periwinkle accent #7C9CFF, mint, amber and coral severities, soft glows on the hero, cards and call to action. Never pure black or pure white.
- Logo: a P monogram whose bowl is a folded paper plane, white and pale blue faces on a cobalt gradient tile (#4C74F5 to #2140C4). The tile is the same in both themes so the mark stays recognisable. It is used in the header, footer and favicon.svg.
- The theme follows the system setting until the user flips the switch in the header, then the choice persists. Switching uses a view transition where the browser supports it.
- Geist for all text, Geist Mono for source and locations. Self-hosted.
- 4px base rhythm, section spacing of 112 to 128px, card padding of 28px, radii of 10, 14 and 20px.
- Layout: centred hero with a live product window, formats and venue strip, a bento grid of the four check types and the experiment check (beta) with small animated illustrations, the checker (settings bar, sticky manuscript pane with flagged rows, report pane), a plain-language "how it works" with the "Why it matters" example, privacy cards and a closing call to action. An "Uploads" section explains in plain words what each upload (manuscript, template, bibliography, notebooks, results zip) does, with a small animation for each.
- Motion: the hero window scans the sample, flags lines, lists findings and settles the score on a loop while visible. Sections fade up on scroll. In the report, the score ring fills and counts up and findings stagger in. Clicking a location highlights the line. Everything is off under prefers-reduced-motion.
- One icon family drawn at 1.6px stroke. No emojis and no em dashes anywhere in copy. Model output is normalised to match.
- Accessibility: visible focus rings, skip link, aria-live report, pressed and selected states on toggles, reduced-motion support, keyboard shortcut Ctrl or Cmd plus Enter to run. A print stylesheet prints the report only.

## 5. Run, test and deploy

```bash
npm install
npm test               # engine, Word, PDF and function tests
npx netlify dev        # local site with functions and Blobs
```

Fixtures are generated by `test/make_fixtures.py` (Word) and `test/make_pdf_fixture.py` (PDF, needs reportlab). After upgrading pdf.js or a font package, run `npm run vendor` to copy the files into `public/`.

**Deploy on Netlify**

1. Push this folder to a GitHub repository.
2. Netlify: Add new site, Import an existing project, pick the repository. Build command empty, publish directory `public`, functions directory `netlify/functions` (already set in `netlify.toml`).
3. Optional, only if you want the "More detail" explanations: Site configuration, Environment variables, add `ANTHROPIC_API_KEY` (mark it secret, scope it to Functions). Optional extras: `CLAUDE_MODEL` (default `claude-opus-5-5`) and `EXPLAIN_DAILY_LIMIT` (default 300).
4. Deploy. Blobs needs no setup.

No key is needed. Without it every check and every "Why it matters" note works, and the "More detail" link stays hidden.

## 6. Known limits

- Word does not store a reliable page count. Use the PDF for the page limit.
- LaTeX source has no page count either. Upload the compiled PDF to check it.
- PDF paragraph rebuilding works well for one and two column layouts. Unusual layouts can merge or split paragraphs. Figure and table detection depends on caption text such as "Figure 3" or "TABLE II".
- Numbered citations are cross-checked with the reference list. Author-year citations are counted for style checks but not matched entry by entry.
- The notebook check compares numbers, not their meaning. Two unrelated values that happen to round the same way count as a match, and results produced outside the attached files show as not found. Large logs with many numbers make chance matches more likely, so attach the final results rather than full training logs.
- PDFs that use CJK fonts without embedded character maps may extract poorly. pdf.js character maps are not bundled, to keep the site light.

## 7. Roadmap

Per-rule "ignore" toggles, a venue preset editor, author-year matching against .bib entries, an optional account with report history on Netlify DB.
