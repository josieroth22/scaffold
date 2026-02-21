const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const { MODEL, GENERATION_TEMPERATURE } = require("../lib/config");
const { buildPrompt } = require("./generate");

const client = new Anthropic.default();
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

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing submission id" });

  // Load existing submission
  let data;
  try {
    data = await redis.hgetall(`submission:${id}`);
    if (!data || !data.form_data) {
      return res.status(404).json({ error: "Submission not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to load submission: " + err.message });
  }

  // Check if cancelled
  if (data.status === "cancelled") {
    return res.status(200).json({ cancelled: true });
  }

  // Parse form data
  let formData;
  if (typeof data.form_data === "string") {
    try { formData = JSON.parse(data.form_data); } catch (e) {
      return res.status(500).json({ error: "Failed to parse form data" });
    }
  } else {
    formData = data.form_data;
  }

  // Parse review results to build feedback
  let review;
  if (data.review) {
    if (typeof data.review === "string") {
      try { review = JSON.parse(data.review); } catch (e) { review = null; }
    } else {
      review = data.review;
    }
  }

  if (!review || !review.checks) {
    return res.status(400).json({ error: "No review data found. Run review first." });
  }

  // Build feedback from failed checks
  const failedChecks = [];
  for (const [name, check] of Object.entries(review.checks)) {
    if (check.status === "FAIL") {
      failedChecks.push(`**${name}:** ${check.detail}`);
    }
  }

  if (failedChecks.length === 0) {
    return res.status(200).json({ skipped: true, reason: "No failed checks -- no regeneration needed" });
  }

  const reviewFeedback = failedChecks.join("\n\n");

  // Inject review_feedback into formData so buildPrompt appends it
  formData.review_feedback = reviewFeedback;

  // Mark as regenerating
  await redis.hset(`submission:${id}`, { status: "regenerating" });

  // Build the FULL prompt using the same logic as generate.js
  // This ensures regen gets all the same rules, verified data, self-checks, etc.
  const prompt = buildPrompt(formData);

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullOutput = "";
    let lastSave = Date.now();

    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 20000,
      temperature: GENERATION_TEMPERATURE,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullOutput += event.delta.text;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);

        // Check for cancellation and save partial output every 30 seconds
        if (Date.now() - lastSave > 30000) {
          lastSave = Date.now();
          const currentStatus = await redis.hget(`submission:${id}`, "status");
          if (currentStatus === "cancelled") {
            redis.hset(`submission:${id}`, { output: fullOutput }).catch(err =>
              console.error("Partial save on cancel failed for", id, err)
            );
            res.write(`data: ${JSON.stringify({ error: "Generation cancelled" })}\n\n`);
            res.end();
            return;
          }
          redis
            .hset(`submission:${id}`, { output: fullOutput })
            .catch(err => console.error("Partial save failed for", id, err));
        }
      }
    }

    // Save regenerated output
    try {
      await redis.hset(`submission:${id}`, {
        output: fullOutput,
        status: "regenerated",
        regenerated_at: new Date().toISOString(),
      });
    } catch (storeErr) {
      console.error("Failed to store regenerated output:", storeErr);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Regeneration error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Regeneration failed: " + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Regeneration failed: " + err.message })}\n\n`);
      res.end();
    }
  }
};
