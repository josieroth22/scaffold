const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_CODE = process.env.ADMIN_CODE || "SCAFFOLD1216";

module.exports = async function handler(req, res) {
  // Check admin code
  const code = req.query.code;
  if (code !== ADMIN_CODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      // Get all submission IDs
      const ids = await redis.lrange("submissions", 0, -1);

      if (!ids || ids.length === 0) {
        return res.status(200).json({ submissions: [] });
      }

      // Fetch each submission's summary (not the full output)
      const submissions = [];
      for (const id of ids) {
        const data = await redis.hgetall(`submission:${id}`);
        if (data) {
          submissions.push({
            id: data.id,
            student_name: data.student_name,
            email: data.email,
            city: data.city,
            income: data.income,
            payment_type: data.payment_type || "free",
            status: data.status,
            submitted_at: data.submitted_at,
            completed_at: data.completed_at,
            has_output: !!data.output,
            has_simulation: !!data.simulation,
            simulation_error: data.simulation_error || "",
            has_review: !!data.review,
            review_status: data.review ? (JSON.parse(typeof data.review === 'string' ? data.review : JSON.stringify(data.review)).overall || 'unknown') : null,
          });
        }
      }

      return res.status(200).json({ submissions });
    } catch (err) {
      console.error("Error fetching submissions:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
