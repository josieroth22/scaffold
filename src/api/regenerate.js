const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const fs = require("fs");
const path = require("path");
const schoolData = require("./school-data");

const client = new Anthropic.default();
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Load financial aid facts once at module level
const financialAidFacts = fs.readFileSync(
  path.join(__dirname, "..", "..", "prompts", "financial-aid-facts.md"),
  "utf8"
);

// Import buildPrompt from generate.js
// We need the same prompt builder, so we extract it
// Instead, we'll require generate.js's buildPrompt indirectly
// by duplicating the reference to it. But better: refactor to share.
// For now, we'll load the form data and call generate.js's prompt builder.

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
    return res.status(200).json({ skipped: true, reason: "No failed checks — no regeneration needed" });
  }

  const reviewFeedback = failedChecks.join("\n\n");

  // Inject review_feedback into formData so buildPrompt picks it up
  formData.review_feedback = reviewFeedback;

  // Mark as regenerating
  await redis.hset(`submission:${id}`, { status: "regenerating" });

  // Build the prompt using the same logic as generate.js
  // We need to replicate buildPrompt here since it's not exported
  // Instead, let's call the generate endpoint's prompt builder
  // by requiring and calling it. But generate.js exports the handler, not buildPrompt.
  // So we'll use a lightweight approach: call generate.js with the form data + review_feedback
  // but reuse the same submission ID instead of creating a new one.

  // Actually, the cleanest approach: build the prompt inline using the same template.
  // We'll require generate.js's buildPrompt by extracting it.
  // For now, let's use a simpler approach: the prompt is in buildPrompt which we can
  // access by requiring the module and calling it. But it's not exported.

  // Simplest approach: make an internal call structure.
  // Let's just build a minimal regeneration prompt that includes the original output,
  // the review feedback, and asks for a full rewrite.

  const today = new Date();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentDate = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  const verifiedData = schoolData.loadSchoolsForPrompt(formData);
  const stateAid = schoolData.loadStateAid(formData.state || schoolData.parseState(formData.city));

  // Strip JSON simulation params from previous output
  const prevOutput = (data.output || "").replace(/```json-simulation-params[\s\S]*?```/g, "").trim();

  const prompt = `**TODAY'S DATE IS ${currentDate}.**

You are regenerating a college strategy document that FAILED quality review. The previous version had critical issues that find-and-replace could not fix. You must produce a complete new Strategy Brief that fixes ALL of the issues listed below while maintaining everything that was correct.

**REVIEW FAILURES TO FIX:**

${reviewFeedback}

**FAMILY DETAILS:**
- Student: ${formData.student_name}, ${formData.student_age_grade}
- School: ${formData.school_name}, ${formData.school_type}
- City: ${formData.city}${formData.state ? ", " + formData.state : ""}
- Income: ${formData.income}
- College budget: ${formData.college_budget || "Not specified"}
- Academic profile: ${formData.academic_profile || "Not specified"}
- Academic strengths: ${formData.academic_strengths || "Not specified"}
- Academic weaknesses: ${formData.academic_weaknesses || "Not specified"}
- Extracurriculars: ${formData.extracurriculars || "Not specified"}
- Interests: ${formData.interests || "Not specified"}
- Personality: ${formData.personality || "Not specified"}
- Parent 1: ${formData.parent1_name || "Not specified"}, ${formData.parent1_education || ""}, ${formData.parent1_profession || ""}
- Parent 2: ${formData.parent2_name || "Not specified"}, ${formData.parent2_education || ""}, ${formData.parent2_profession || ""}
- Family structure: ${formData.family_structure || "Not specified"}
- Siblings: ${formData.siblings || "None"}
- Schools on radar: ${formData.schools_on_radar || "None"}
- Teacher quote: ${formData.teacher_quote || "None provided"}
- Geographic preference: ${formData.geographic_preference || "Not specified"}
- Must-haves: ${formData.must_haves || "Not specified"}
- Deal breakers: ${formData.deal_breakers || "Not specified"}
- Additional context: ${formData.additional_context || "None"}

---

${verifiedData}

---

${stateAid}

---

${financialAidFacts}

---

**THE PREVIOUS OUTPUT (for reference — keep what was good, fix what was flagged):**

${prevOutput.substring(0, 30000)}

---

**INSTRUCTIONS:**

Generate a COMPLETE new Strategy Brief. This is a full rewrite, not a patch. Follow the same structure as the previous output:

1. Title with city/state
2. Executive Summary with school list table
3. The Four Threads
4. School List with full analysis per school
5. Financial Aid Strategy (including CSS Profile / home equity impact if they own a home)
6. Summer Plan
7. Probability and Cost Estimates Table
8. What If the Profile Lands Lower
9. What to Do Now
10. Data Sources section

**End with the JSON simulation params block** in the same format as before.

**CRITICAL RULES:**
- Fix EVERY issue from the review failures above. This is why we're regenerating.
- If the review flagged a school as financially unreachable, REPLACE it with a better-fit school (unless the family named it).
- If the review flagged admit rate errors, use the VERIFIED SCHOOL DATA numbers exactly.
- If the review flagged fabricated content, remove it entirely.
- Use verified data for all schools that appear in the VERIFIED SCHOOL DATA section.
- Reference BOTH parents' education backgrounds when relevant.
- Default to Early Action for all schools that offer it.
- If recommending REA/SCEA at one school, all other private schools must be RD or ED2.
- Merit scholarships are never binding.
- Keep the same warm, direct tone. Address the parent directly.
- No em dashes.

**SELF-CHECK before outputting:** Verify every number against the verified data. Verify JSON admit_pct matches narrative percentages to 3 decimal places. Verify budget alignment. Verify no fabricated names.`;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullOutput = "";
    let lastSave = Date.now();

    const stream = await client.messages.stream({
      model: "claude-opus-4-20250514",
      max_tokens: 20000,
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

    // Save regenerated output (replaces old Tier 1, Tier 2 will be re-run by client)
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
