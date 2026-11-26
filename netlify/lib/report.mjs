// Shared report shape. Kept outside the functions folder so it can be unit tested and imported.
const SEV = new Set(["error", "warn", "info"]);
const CAT = new Set(["consistency", "reporting", "format", "hygiene", "notebook"]);
const cut = (s, n) => String(s ?? "").slice(0, n);
// Findings whose detail quotes the manuscript. Their detail is replaced before storage.
export const QUOTES_TEXT = /^(Placeholder left|Highlighted text left)/;
export const REDACTED = "Text at this location is flagged. Open your manuscript to see it.";

// Rebuild the report from a strict allow-list. Raw manuscript text is never accepted.
export function sanitize(b) {
  if (!b || typeof b !== "object" || Array.isArray(b) || !Array.isArray(b.findings) || !Array.isArray(b.checklist)) return null;
  const score = Number(b.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const findings = b.findings.slice(0, 200).map((f) => {
    const title = cut(f?.title, 140);
    return {
      sev: SEV.has(f?.sev) ? f.sev : "info",
      title,
      detail: QUOTES_TEXT.test(title) ? REDACTED : cut(f?.detail, 300),
      line: Number.isInteger(f?.line) && f.line > 0 ? f.line : null,
      loc: typeof f?.loc === "string" && /^[A-Za-z0-9: ]{1,16}$/.test(f.loc) ? f.loc : null,
      cat: CAT.has(f?.cat) ? f.cat : "format",
    };
  });
  const counts = { error: 0, warn: 0, info: 0 };
  // Notebook check summary: counts only, never file names or values.
  const int = (v) => (Number.isInteger(v) && v >= 0 && v <= 1e5 ? v : 0);
  const nb = b.notebook && typeof b.notebook === "object" ? b.notebook : null;
  const notebook = nb ? { files: int(nb.files), checked: int(nb.checked), matched: int(nb.matched), differ: int(nb.differ), missing: int(nb.missing) } : null;
  findings.forEach((f) => counts[f.sev]++);
  return {
    score: Math.round(score),
    grade: cut(b.grade, 40),
    template: cut(b.template, 160),
    unit: b.unit === "P" ? "P" : "L",
    counts,
    findings,
    notebook,
    checklist: b.checklist.slice(0, 20).map((c) => ({ name: cut(c?.name, 60), pass: c?.pass === true })),
  };
}

export const sameOrigin = (req) => {
  try { return new URL(req.headers.get("origin") || "").host === new URL(req.url).host; } catch { return false; }
};

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });

// Reads a JSON body with a hard size cap. Returns { body } or { error, status }.
export async function readJson(req, max) {
  if (!sameOrigin(req)) return { error: "forbidden", status: 403 };
  if (!(req.headers.get("content-type") || "").startsWith("application/json")) return { error: "unsupported_type", status: 415 };
  if (Number(req.headers.get("content-length") || 0) > max) return { error: "too_large", status: 413 };
  const text = await req.text();
  if (text.length > max) return { error: "too_large", status: 413 };
  try { return { body: JSON.parse(text) }; } catch { return { error: "bad_json", status: 400 }; }
}
