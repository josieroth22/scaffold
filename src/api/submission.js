const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_CODE = process.env.ADMIN_CODE || "SCAFFOLD1216";

module.exports = async function handler(req, res) {
  const code = req.query.code;
  if (code !== ADMIN_CODE) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  if (req.method === "GET") {
    try {
      const data = await redis.hgetall(`submission:${id}`);
      if (!data) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Upstash may auto-parse JSON strings, so handle both cases
      let formData = {};
      if (typeof data.form_data === 'string') {
        try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
      } else if (typeof data.form_data === 'object' && data.form_data !== null) {
        formData = data.form_data;
      }

      // Parse review data
      let review = null;
      if (data.review) {
        if (typeof data.review === 'string') {
          try { review = JSON.parse(data.review); } catch (e) { review = { raw: data.review }; }
        } else if (typeof data.review === 'object') {
          review = data.review;
        }
      }

      // Parse review history
      let reviewHistory = [];
      if (data.review_history) {
        if (typeof data.review_history === 'string') {
          try { reviewHistory = JSON.parse(data.review_history); } catch (e) { reviewHistory = []; }
        } else if (Array.isArray(data.review_history)) {
          reviewHistory = data.review_history;
        }
      }

      return res.status(200).json({
        id: data.id,
        student_name: data.student_name,
        email: data.email,
        city: data.city,
        income: data.income,
        status: data.status,
        submitted_at: data.submitted_at,
        completed_at: data.completed_at,
        form_data: formData,
        output: data.output || null,
        review: review,
        review_history: reviewHistory,
        reviewed_at: data.reviewed_at || null,
        review_count: parseInt(data.review_count) || 0,
      });
    } catch (err) {
      console.error("Error fetching submission:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await redis.del(`submission:${id}`);
      await redis.lrem("submissions", 0, id);
      return res.status(200).json({ deleted: true });
    } catch (err) {
      console.error("Error deleting submission:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
