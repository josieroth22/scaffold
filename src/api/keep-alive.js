const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  try {
    // A real SET, not PING: zero-cost health commands don't register as
    // "traffic" in marketplace activity metering (learned Aug 2026 — an
    // inactivity-archival notice fired despite 5-minute pings). A write is
    // a metered command AND a truer round-trip health check.
    const ts = new Date().toISOString();
    await redis.set("keepalive:last", ts);
    return res.status(200).json({ status: "ok", timestamp: ts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
