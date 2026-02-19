const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const data = await redis.hgetall(`submission:${id}`);
    if (!data) {
      return res.status(404).json({ error: "Plan not found" });
    }

    // Parse form data
    let formData = {};
    if (typeof data.form_data === 'string') {
      try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
    } else if (typeof data.form_data === 'object' && data.form_data !== null) {
      formData = data.form_data;
    }

    // Parse simulation data if present
    let simulation = null;
    if (data.simulation) {
      if (typeof data.simulation === 'string') {
        try { simulation = JSON.parse(data.simulation); } catch (e) { simulation = null; }
      } else if (typeof data.simulation === 'object') {
        simulation = data.simulation;
      }
    }

    return res.status(200).json({
      id: data.id,
      student_name: data.student_name,
      student_last_name: data.student_last_name || "",
      city: data.city,
      status: data.status,
      output: data.output || null,
      completed_at: data.completed_at,
      form_data: formData,
      simulation: simulation,
    });
  } catch (err) {
    console.error("Error fetching plan:", err);
    return res.status(500).json({ error: err.message });
  }
};
