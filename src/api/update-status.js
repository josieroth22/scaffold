const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: "Missing id or status" });

  const allowed = ["review_failed", "generation_failed", "completed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status not allowed" });
  }

  try {
    await redis.hset(`submission:${id}`, { status });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status: " + err.message });
  }
};
