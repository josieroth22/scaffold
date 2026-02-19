const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");

const client = new Anthropic.default();
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing submission id" });
  }

  // Load the submission from Redis
  let data;
  try {
    data = await redis.hgetall(`submission:${id}`);
    if (!data || !data.output) {
      return res.status(404).json({ error: "Submission not found or Tier 1 not complete" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to load submission: " + err.message });
  }

  // Parse the original form data (Upstash may auto-deserialize)
  let formData;
  if (typeof data.form_data === 'string') {
    try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
  } else {
    formData = data.form_data || {};
  }

  const tier1Output = data.output;

  const prompt = `You wrote the Strategy Brief below for this family. Now write the Reference Sections. These are the detailed planning tools the parent comes back to over the years. Keep the same voice, the same schools, the same financial assumptions. Write like you're still talking to the same parent. Use their kid's name. Be specific.

---

**FAMILY DETAILS:**
- Student: ${formData.student_name}, ${formData.student_age_grade}
- School: ${formData.school_name}, ${formData.school_type}
- City: ${formData.city}
- Income: ${formData.income}
- College budget: ${formData.college_budget}
- Interests: ${formData.interests}
- Academic profile: ${formData.academic_profile}

---

**TIER 1 OUTPUT (already delivered to the family):**

${tier1Output}

---

**NOW GENERATE TIER 2: The Reference Sections**

Start with this divider:

---
# REFERENCE SECTIONS
*The sections below are detailed planning tools. Come back to them when you need them.*
---

Then generate each of these sections. Each should stand alone so a parent can jump to "Essay Strategy" in year 3 without reading anything else:

- Developmental Roadmap (grade-by-grade course tables, extracurricular plans, milestones, What Not to Do)
- Activities List (10 items, Common App format)
- Honors and Awards (projected, with aspirational vs likely flags)
- Essay Strategy (Common App angle, supplemental essay table by school, what the essay should NOT be)
- Recommendation Letter Strategy (who, when, what each letter should convey)
- Writing Portfolio or Maker Portfolio Guidance (if applicable: arts supplement, engineering/maker portfolio with project documentation and photos, research abstract, athletic recruitment materials, or other supplemental materials)
- Financial Aid Negotiation Guide (how to compare offers side by side, when and how to ask schools to match competing packages, which schools have flexibility)
- Senior Year Application Timeline (month-by-month from August through May)
- External Scholarships table

**TONE:** Direct, honest, specific. Not consultant-speak. Acknowledge uncertainty. Use the family's own language and values. Reference specific details they provided naturally throughout. The plan should feel like it was written by a smart friend who knows college admissions, not by a brochure. Use humor sparingly but don't be afraid of it. Call out the parents directly when needed. No em dashes. Use commas, periods, or restructure the sentence.`;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let tier2Output = "";
    let lastSave = Date.now();

    const stream = await client.messages.stream({
      model: "claude-opus-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        tier2Output += event.delta.text;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);

        // Save partial output every 30 seconds
        if (Date.now() - lastSave > 30000) {
          lastSave = Date.now();
          redis
            .hset(`submission:${id}`, {
              output: tier1Output + "\n\n" + tier2Output,
            })
            .catch(() => {});
        }
      }
    }

    // Store the combined completed output
    try {
      await redis.hset(`submission:${id}`, {
        status: "completed",
        output: tier1Output + "\n\n" + tier2Output,
        completed_at: new Date().toISOString(),
      });
    } catch (storeErr) {
      console.error("Failed to store Tier 2 output:", storeErr);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Tier 2 generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Tier 2 generation failed: " + err.message });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Tier 2 generation failed: " + err.message })}\n\n`,
      );
      res.end();
    }
  }
};
