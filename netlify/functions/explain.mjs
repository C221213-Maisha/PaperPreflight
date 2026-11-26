// Optional: explains one finding with Claude. The rule engine never depends on this.
// Enabled only when ANTHROPIC_API_KEY is set in the Netlify environment.
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import { json, readJson } from "../lib/report.mjs";
import { cleanRequest, SYSTEM, userPrompt, tidy, cacheKey } from "../lib/explain.mjs";

const MAX_BYTES = 4000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const DAILY_LIMIT = Number(process.env.EXPLAIN_DAILY_LIMIT || 300);

let client = null;

export default async (req) => {
  const enabled = !!process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return json({ enabled });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!enabled) return json({ error: "disabled" }, 503);

  const { body, error, status } = await readJson(req, MAX_BYTES);
  if (error) return json({ error }, status);
  const r = cleanRequest(body);
  if (!r) return json({ error: "invalid" }, 400);

  // Explanations without an excerpt contain no manuscript text, so they can be shared across users.
  const cache = getStore("explanations");
  const key = r.excerpt ? null : await cacheKey(r);
  if (key) {
    const hit = await cache.get(key, { type: "json" }).catch(() => null);
    if (hit && hit.expiresAt > Date.now()) return json({ text: hit.text, cached: true });
  }

  // A soft daily budget. Blobs has no atomic increment, so this is approximate under heavy load.
  const usage = getStore("usage");
  const day = new Date().toISOString().slice(0, 10);
  const used = Number((await usage.get(day).catch(() => null)) || 0);
  if (used >= DAILY_LIMIT) return json({ error: "daily_limit" }, 429);
  await usage.set(day, String(used + 1)).catch(() => {});

  client = client || new Anthropic();
  try {
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(r) }],
    });
    if (msg.stop_reason === "refusal") return json({ error: "unavailable" }, 502);
    const text = tidy(msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"));
    if (!text) return json({ error: "unavailable" }, 502);
    if (key) await cache.setJSON(key, { text, expiresAt: Date.now() + CACHE_TTL_MS }).catch(() => {});
    return json({ text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    console.error("explain failed", err instanceof Anthropic.APIError ? err.status : err?.name);
    return json({ error: "unavailable" }, 502);
  }
};

export const config = {
  path: "/api/explain",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
