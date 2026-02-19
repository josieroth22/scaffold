const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_CODE = "SCAFFOLD1216";

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

      // Parse form_data back to object
      let formData = {};
      try {
        formData = JSON.parse(data.form_data || "{}");
      } catch (e) {
        formData = {};
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
      });
    } catch (err) {
      console.error("Error fetching submission:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
