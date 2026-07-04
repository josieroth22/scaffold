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

  // Admin: list signups (needed to email the list at Stripe launch)
  if (req.method === "GET") {
    const ADMIN_CODE = process.env.ADMIN_CODE || "SCAFFOLD1216";
    if (req.query.code !== ADMIN_CODE) return res.status(401).json({ error: "Unauthorized" });
    const emails = await redis.smembers("notify_emails");
    return res.status(200).json({ count: emails.length, emails });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = (req.body && req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  try {
    // Set semantics: signing up twice is harmless
    await redis.sadd("notify_emails", email);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("notify-signup failed:", err);
    return res.status(500).json({ error: "Something went wrong. Try again?" });
  }
};
