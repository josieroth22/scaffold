const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const schoolData = require("./school-data");

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

  // Check if cancelled before starting
  if (data.status === 'cancelled') {
    return res.status(200).json({ cancelled: true });
  }

  await redis.hset(`submission:${id}`, { status: "generating_tier2" });

  // Parse the original form data (Upstash may auto-deserialize)
  let formData;
  if (typeof data.form_data === 'string') {
    try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
  } else {
    formData = data.form_data || {};
  }

  const tier1Output = data.output;

  const today = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentDate = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  const prompt = `**Today's date is ${currentDate}.** All timelines, deadlines, summer plans, and recommendations must reflect this. Do not reference dates that have already passed. "This summer" means the upcoming summer, not a past one.

You wrote the Strategy Brief below for this family. Now write the Reference Sections. These are the detailed planning tools the parent comes back to over the years. Keep the same voice, the same schools, the same financial assumptions. Write like you're still talking to the same parent. Use their kid's name. Be specific.

---

**FAMILY DETAILS:**
- Student: ${formData.student_name}, ${formData.student_age_grade}
- School: ${formData.school_name}, ${formData.school_type}
- City: ${formData.city}${formData.state ? ', ' + formData.state : ''}
- Income: ${formData.income}
- College budget: ${formData.college_budget || "Not specified (use budget estimated in Tier 1)"}
- Interests: ${formData.interests}
- Extracurricular activities: ${formData.extracurriculars || "Not specified"}
- Academic profile: ${formData.academic_profile}

---

**TIER 1 OUTPUT (already delivered to the family):**

${tier1Output}

---

### SCHOOL DATA REFERENCE

The following verified school data includes scholarship names, honors programs, aid statistics, and National Merit awards. Use this data when writing the Essay Strategy (school-specific supplemental strategies), Financial Aid Negotiation Guide (real aid numbers to reference), and External Scholarships sections. Do NOT include inline source citations in the body text. The Tier 1 plan already has a Data Sources section at the end.

${schoolData.loadSchoolsForPrompt(formData)}

---

**NOW GENERATE TIER 2: The Reference Sections**

Start with this divider:

---
# REFERENCE SECTIONS
*The sections below are detailed planning tools. Come back to them when you need them.*
---

Then generate each of these sections. Each should stand alone so a parent can jump to "Essay Strategy" in year 3 without reading anything else:

- Developmental Roadmap (grade-by-grade course tables, extracurricular plans, summer plans for each remaining summer, milestones, What Not to Do). Note course rigor relative to what this student's school likely offers.
- Activities List (10 items, Common App format). CRITICAL: This student has NOT applied to college yet. The activities list is a PLANNING TOOL, not a finished application. For each activity:
  - Mark it [CURRENT] if the student is already doing it, and describe ONLY what is actually true based on the family's input.
  - Mark it [TARGET] if it's something you're recommending they pursue. Describe the GOAL, not a fabricated outcome.
  - WRONG: "Completed 5 sections of Appalachian Trail. Lead monthly group hikes." (fabricated accomplishment)
  - RIGHT: "[TARGET] Goal: Organize monthly group hikes with friends. Connect to interests in nature/reflection. Could become a small leadership role if formalized."
  - WRONG: "Increased submissions 40% through Instagram campaign." (fabricated metric)
  - RIGHT: "[CURRENT] Currently submitting short fiction to teen literary magazines. Goal by senior year: 3-5 published pieces."
  - Do NOT write in past tense about things that haven't happened. Do NOT invent statistics, awards, or specific outcomes.
- Honors and Awards (projected, with "Likely" vs "Aspirational" flags)
- Essay Strategy (Common App angle, supplemental essay table by school, what the essay should NOT be)
- Recommendation Letter Strategy (describe the TYPE of teacher needed, not specific names. When to ask, what each letter should convey, how to make the ask)
- Writing Portfolio or Maker Portfolio Guidance (if applicable: arts supplement, engineering/maker portfolio with project documentation and photos, research abstract, athletic recruitment materials, or other supplemental materials)
- Financial Aid Negotiation Guide (how to compare offers side by side, when and how to ask schools to match competing packages, which schools have flexibility)
- Senior Year Application Timeline (month-by-month from August through May, including specific application rounds for each school)
- External Scholarships: Do NOT invent specific local scholarship names or deadlines. Instead, recommend TYPES of scholarships to search for (e.g., "local bar association scholarships," "community foundation awards"), name well-known national scholarships that apply, and tell the family exactly where to search (school counselor's list, state scholarship database URL, Scholarships360, Going Merry, FastWeb). Include a realistic time-investment analysis.

**CRITICAL RULES:**
- Never invent teacher names, counselor names, coach names, or any person's name the family didn't provide.
- The Activities List and Honors/Awards sections are PLANNING TOOLS for a student who hasn't applied yet. Write them as forward-looking goals, not as accomplished facts. This is the most common mistake. Double-check every activity description: if it describes something that hasn't happened yet, it MUST use future tense or goal-oriented language. If a hobby was mentioned casually (e.g., "likes hiking"), do NOT inflate it into a formal club with fabricated leadership roles and accomplishments.
- Never fabricate local scholarship names or deadlines. Recommend search strategies instead.
- Never fabricate specific dollar amounts for scholarships. Use ranges or say "check the school's website."

**TONE:** Warm, encouraging, and realistic. Be the smart friend who genuinely cares about this kid's future. Celebrate what makes this student interesting. Be honest about challenges without being discouraging. Acknowledge uncertainty. Use the family's own language and values. Reference specific details they provided naturally throughout. The plan should feel like it was written by someone who actually read everything the family wrote and cares about getting it right. Use humor sparingly but don't be afraid of it. Call out the parents directly when needed. No em dashes. Use commas, periods, or restructure the sentence.

**VOICE:** Always address the parent directly. Use "your family", "your budget", "your son/daughter" throughout. Never use third person like "their family", "the family", "the student's parents". You are talking TO this parent, not writing a report ABOUT them.

**Language standards:** This is a professional document. Never use crude or potentially offensive phrasing like "poverty porn." When advising on essay topics to avoid, use professional language like "avoid deficit narratives" or "don't frame your story around hardship for its own sake."`;

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

        // Check for cancellation and save partial output every 30 seconds
        if (Date.now() - lastSave > 30000) {
          lastSave = Date.now();
          // Check if cancelled
          const currentStatus = await redis.hget(`submission:${id}`, 'status');
          if (currentStatus === 'cancelled') {
            redis.hset(`submission:${id}`, { output: tier1Output + "\n\n" + tier2Output }).catch(err => console.error("Tier 2 partial save on cancel failed for", id, err));
            res.write(`data: ${JSON.stringify({ error: "Generation cancelled" })}\n\n`);
            res.end();
            return;
          }
          redis
            .hset(`submission:${id}`, {
              output: tier1Output + "\n\n" + tier2Output,
            })
            .catch(err => console.error("Tier 2 partial save failed for", id, err));
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
