const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");

const client = new Anthropic.default();
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Build the filled prompt from form data
function buildPrompt(data) {
  // Priority ranking (1 = most important)
  const priorities = [
    { key: "cost", label: "Minimize total cost of attendance" },
    { key: "prestige", label: "Prestige / brand name" },
    { key: "academic_fit", label: "Academic fit (specific programs, research, major strength)" },
    { key: "location", label: "Geographic location" },
    { key: "culture", label: "Campus culture / social fit" },
    { key: "merit", label: "Merit scholarship likelihood" },
    { key: "outcomes", label: "Post-graduation outcomes (career placement, earnings, grad school)" },
  ];

  const priorityLines = priorities
    .map((p) => {
      const rank = data["priority_" + p.key] || "?";
      return `- [${rank}] ${p.label}`;
    })
    .sort((a, b) => {
      const rankA = parseInt(a.match(/\[(\d+)\]/)?.[1]) || 99;
      const rankB = parseInt(b.match(/\[(\d+)\]/)?.[1]) || 99;
      return rankA - rankB;
    })
    .join("\n");

  // Divorce details (only if applicable)
  let divorceSection = "";
  if (data.family_structure === "divorced") {
    divorceSection = `- If divorced: ${data.custody || "Not specified"}
- Which parent files FAFSA: ${data.fafsa_parent || "Not specified"}
- Co-parent relationship: ${data.coparent_relationship || "Not specified"}`;
  }

  // Parent 2 section
  let parent2 = "N/A";
  if (data.parent2_name) {
    parent2 = `${data.parent2_name}, ${data.parent2_education || "education not specified"}, ${data.parent2_profession || "profession not specified"}`;
  }

  return `I'd like you to build a comprehensive college application and scholarship strategy document for my family. This should include three parts:

**Part One: Developmental Roadmap** from the kid's current age (or from preschool if we're planning ahead) through 12th grade, covering academics, extracurriculars, community involvement, and key milestones by age/grade. This should be specific to our local schools and programs, not generic advice.

**Part Two: College Application Strategy** including an applicant profile (projected, based on the developmental roadmap), a school list of 8-12 schools with rationale, an activities list, honors and awards, essay strategy by school, recommendation letter strategy, and application timeline for senior year. Every school on the list should be one you'd genuinely recommend for this specific family. If a school doesn't fit, leave it off. Don't pad the list.

**Part Three: Monte Carlo Financial Simulation** modeling 10,000 simulations of admission, scholarship, and honors outcomes across the school list, producing probability distributions for tier outcomes, cost outcomes, and a decision framework for April of senior year.

Use the family details and priorities below to personalize everything. Be specific to our geography, schools, and community. Where you make assumptions, state them. Where something is uncertain, flag it as a decision point. Include "What Not to Do" guidance at each stage.

The tone should be direct and honest, not salesy. Acknowledge uncertainty. Call out where the plan is optimistic and what happens if the kid's profile lands lower than projected.

---

### SECTION 1: YOUR FAMILY'S DETAILS

**The Kid:**
- Name: ${data.student_name}
- Age / Current grade: ${data.student_age_grade}
- School (name and type): ${data.school_name}, ${data.school_type}
- School district: ${data.school_district || "Not specified"}
- Academic profile: ${data.academic_profile}
- Academic strengths: ${data.academic_strengths}
- Academic weaknesses or gaps: ${data.academic_weaknesses}
- Interests, hobbies, obsessions: ${data.interests}
- Personality / temperament: ${data.personality}
- Anything a teacher has said about them that stuck with you: ${data.teacher_quote || "Nothing specific shared"}

**The Parents:**
- Parent 1: ${data.parent1_name}, ${data.parent1_education}, ${data.parent1_profession}
- Parent 2: ${parent2}
- Family structure: ${data.family_structure}
${divorceSection}

**Siblings (if any):**
${data.siblings || "None / not specified"}

**Geography:**
- City and state: ${data.city}
- Urban / suburban / rural: ${data.area_type}
${data.area_context ? "- Area context: " + data.area_context : ""}
- Willing to relocate for a school? ${data.relocation}

**Finances:**
- Approximate household income: ${data.income}
- Any significant assets: ${data.assets}
- What can you realistically afford per year for college: ${data.college_budget}
- Any special financial circumstances: ${data.financial_special || "None specified"}

**School Preferences:**
- Size preference: ${data.size_preference}
- Geographic preference: ${data.geographic_preference}
- Any must-haves: ${data.must_haves || "None specified"}
- Any deal-breakers: ${data.deal_breakers || "None specified"}
- Schools already on your radar: ${data.schools_on_radar || "None specified"}

---

### SECTION 2: WHAT YOU CARE ABOUT

Rank these 1-7 (1 = most important):

${priorityLines}

Anything else that matters to you that isn't on this list: ${data.priority_other || "Nothing additional"}

---

### SECTION 3: ADDITIONAL CONTEXT

${data.additional_context}

---

### SECTION 4: OUTPUT INSTRUCTIONS

Generate the Strategy Brief (~5,000 words). This is the core document the parent reads the day they get it. Write it like you're talking directly to them. Reference Sections will follow separately, so stop after the Monte Carlo Parameter Table.

---

**Executive Summary (one page max):** This is the first thing the parent reads and the page they come back to. Include:
   - A brief projected applicant profile (3-4 sentences: GPA range, test score range, key strengths, key gaps)
   - The school list as a simple table: school name, tier (reach/target/safety), estimated net annual cost, and financial risk rating (very low / moderate / high)
   - The top 3 things to do in the next 6 months (specific, actionable, no jargon)
   - The financial floor: the cheapest guaranteed-admission option with its estimated annual cost. Name the school, name the cost, and say clearly that this is the worst-case scenario and it's a good one.

**Then continue with the full Strategy Brief, which should include:**
- Executive Summary (already specified above)
- The Four Threads (what the application narrative is built around)
- School List with full financial analysis and honest commentary for each school (this is the core value, don't compress it)
- QuestBridge explanation (if applicable to this family's income)
- Financial Aid Strategy (FAFSA/CSS, non-custodial parent issues, state scholarships)
- Monte Carlo results summary (headline stats, the 3-5 decision scenarios, financial floor)
- What to Do Now (the 3-5 most important actions for the current stage)

Write this as a continuous, readable document with the same direct tone. This is the thing a parent reads on their phone at midnight.

End with a clearly formatted **Monte Carlo Parameter Table**. For each school on the list, provide:
   - Admit probability (cite the CDS or published rate you're adjusting from)
   - Merit scholarship probability and estimated amount
   - Honors program probability (if applicable)
   - Estimated net annual cost at this family's income level
   - Any special program probabilities (QuestBridge, recruited athlete, etc.)

Stop after the Monte Carlo Parameter Table. The Reference Sections come next in a separate pass.

---

**TONE:** Direct, honest, specific. Not consultant-speak. Acknowledge uncertainty and flag where the plan is optimistic. Use the family's own language and values. Reference specific details they provided naturally throughout. The plan should feel like it was written by a smart friend who knows college admissions, not by a brochure. Use humor sparingly but don't be afraid of it. Call out the parents directly when needed. No em dashes. Use commas, periods, or restructure the sentence.`;
}

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

  const data = req.body;

  if (!data || !data.student_name) {
    return res.status(400).json({ error: "Missing form data" });
  }

  const prompt = buildPrompt(data);

  // Generate a unique ID for this submission
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Store the submission immediately
  try {
    await redis.hset(`submission:${id}`, {
      id,
      student_name: data.student_name,
      student_last_name: data.student_last_name || "",
      email: data.email || "",
      city: data.city || "",
      income: data.income || "",
      submitted_at: new Date().toISOString(),
      status: "generating",
      form_data: JSON.stringify(data),
    });
    // Add to the submissions list
    await redis.lpush("submissions", id);
  } catch (storeErr) {
    console.error("Failed to store submission:", storeErr);
    // Don't block generation if storage fails
  }

  try {
    // Stream the response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send the ID to the client
    res.write(`data: ${JSON.stringify({ id })}\n\n`);

    let fullOutput = "";
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
        fullOutput += event.delta.text;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);

        // Save partial output every 30 seconds so we don't lose progress on timeout
        if (Date.now() - lastSave > 30000) {
          lastSave = Date.now();
          redis.hset(`submission:${id}`, { output: fullOutput }).catch(() => {});
        }
      }
    }

    // Store the Tier 1 output
    try {
      await redis.hset(`submission:${id}`, {
        status: "tier1_complete",
        output: fullOutput,
      });
    } catch (storeErr) {
      console.error("Failed to store output:", storeErr);
    }

    res.write(`data: ${JSON.stringify({ tier1_done: true, id })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Generation failed: " + err.message });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Generation failed: " + err.message })}\n\n`,
      );
      res.end();
    }
  }
};
