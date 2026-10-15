// Pipeline conductor endpoint (see src/lib/pipeline.js).
//   POST { id }  run the next step for one submission. Answers 202 at once and
//                does the work in waitUntil, so the caller (the previous step,
//                or the sweep) never holds a connection open for minutes.
//   GET          cron sweep (vercel.json, every minute): re-kicks stalled chains.
// When CRON_SECRET is set, both require "Authorization: Bearer <CRON_SECRET>"
// (Vercel cron sends it automatically).

const { waitUntil } = require("@vercel/functions");
const pipeline = require("../lib/pipeline");

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const base = pipeline.baseUrl(req);

  if (req.method === "GET") {
    try {
      const result = await pipeline.sweep(base);
      return res.status(200).json(result);
    } catch (err) {
      console.error("Pipeline sweep failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing submission id" });

  waitUntil(
    pipeline
      .advance(id, base)
      .then((r) => console.log(`pipeline ${id}:`, JSON.stringify(r)))
      .catch((err) => console.error(`pipeline ${id} advance failed:`, err))
  );
  return res.status(202).json({ accepted: true });
};
