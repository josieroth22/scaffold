const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");

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

  let data;
  try {
    data = await redis.hgetall(`submission:${id}`);
    if (!data || !data.output) {
      return res.status(404).json({ error: "Submission not found or generation not complete" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to load submission: " + err.message });
  }

  let formData;
  if (typeof data.form_data === 'string') {
    try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
  } else {
    formData = data.form_data || {};
  }

  const prompt = `You are a quality reviewer for a college planning product called Scaffold. A family paid $50 for a personalized college strategy document. Your job is to review the generated plan for errors, inconsistencies, and hallucinations.

**FAMILY DETAILS:**
- Student: ${formData.student_name}, ${formData.student_age_grade}
- School: ${formData.school_name}, ${formData.school_type}
- City: ${formData.city}
- Income: ${formData.income}
- College budget: ${formData.college_budget || "Not specified"}
- Extracurriculars: ${formData.extracurriculars || "Not specified"}

**THE GENERATED PLAN:**

${data.output}

---

**Review this plan for the following issues. For each category, respond with PASS or FAIL and a brief explanation. If FAIL, quote the specific problematic text.**

1. **Residency accuracy:** Are in-state/out-of-state tuition classifications correct for the student's home state? DC students should NOT be listed as in-state for Maryland or Virginia. Students are only in-state for schools in their own state.

2. **Cost consistency:** Do the cost estimates in the executive summary table match the per-school writeups and the probability table? Are there contradictory numbers?

3. **Admission rate sanity:** Are admission probability estimates realistic? A strong applicant should not exceed the school's overall admit rate by more than ~5 percentage points. Single-digit admit rate schools should stay single-digit.

4. **No-merit school check:** Are merit scholarships incorrectly assigned to schools that only offer need-based aid (Ivies, MIT, Stanford, Caltech, Amherst, Williams, Bowdoin, etc.)?

5. **Fabricated content:** Are there any invented teacher names, counselor names, specific local scholarship names, fabricated statistics, or accomplishments attributed to the student that weren't in the family's input?

6. **Activities list accuracy:** In the Tier 2 activities list, are [CURRENT] items based on what the family actually said? Are [TARGET] items clearly framed as goals, not accomplished facts?

7. **Date accuracy:** Are there references to dates that have already passed (e.g., "summer 2025" when it's 2026)?

8. **Voice consistency:** Does the plan address the parent directly ("your family", "your son/daughter") rather than third person ("the family", "the student's parents")?

9. **School count and balance:** Are there 8-12 schools? Is there at least one safety, one target, and one reach? Is there a financial safety?

10. **Budget alignment:** If the family specified a budget, is it referenced in the financial analysis? Are schools that exceed it flagged?

**Output your review as a JSON object:**
\`\`\`json
{
  "overall": "PASS" or "FAIL",
  "issues_found": 0,
  "checks": {
    "residency": { "status": "PASS" or "FAIL", "detail": "..." },
    "cost_consistency": { "status": "PASS" or "FAIL", "detail": "..." },
    "admit_rates": { "status": "PASS" or "FAIL", "detail": "..." },
    "no_merit_schools": { "status": "PASS" or "FAIL", "detail": "..." },
    "fabricated_content": { "status": "PASS" or "FAIL", "detail": "..." },
    "activities_accuracy": { "status": "PASS" or "FAIL", "detail": "..." },
    "date_accuracy": { "status": "PASS" or "FAIL", "detail": "..." },
    "voice_consistency": { "status": "PASS" or "FAIL", "detail": "..." },
    "school_count": { "status": "PASS" or "FAIL", "detail": "..." },
    "budget_alignment": { "status": "PASS" or "FAIL", "detail": "..." }
  },
  "summary": "One paragraph summary of overall quality and any critical issues."
}
\`\`\`

Only output the JSON block. No other text.`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text;

    // Extract JSON from response
    let review;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      try {
        review = JSON.parse(jsonStr);
      } catch (e) {
        review = { raw: text, parse_error: e.message };
      }
    } else {
      review = { raw: text };
    }

    // Store review in Redis
    await redis.hset(`submission:${id}`, {
      review: JSON.stringify(review),
      reviewed_at: new Date().toISOString(),
    });

    return res.status(200).json(review);
  } catch (err) {
    console.error("Review error:", err);
    return res.status(500).json({ error: "Review failed: " + err.message });
  }
};
