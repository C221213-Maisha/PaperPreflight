import { getStore } from "@netlify/blobs";
import { sanitize, json, readJson } from "../lib/report.mjs";

const MAX_BYTES = 60000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export default async (req) => {
  const store = getStore({ name: "reports", consistency: "strong" });

  if (req.method === "POST") {
    const { body, error, status } = await readJson(req, MAX_BYTES);
    if (error) return json({ error }, status);
    const report = sanitize(body);
    if (!report) return json({ error: "invalid" }, 400);

    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (x) => x.toString(16).padStart(2, "0")).join("");
    await store.setJSON(id, { ...report, expiresAt: Date.now() + TTL_MS });
    return json({ id }, 201);
  }

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[a-f0-9]{20}$/.test(id)) return json({ error: "not_found" }, 404);
    const data = await store.get(id, { type: "json" });
    if (!data) return json({ error: "not_found" }, 404);
    if (data.expiresAt < Date.now()) {
      await store.delete(id);
      return json({ error: "not_found" }, 404);
    }
    const { expiresAt, ...report } = data;
    return json(report);
  }

  return json({ error: "method_not_allowed" }, 405);
};

export const config = {
  path: "/api/reports",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
