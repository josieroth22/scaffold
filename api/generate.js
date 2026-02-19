const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default();

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

**Part Two: College Application Strategy** including an applicant profile (projected, based on the developmental roadmap), a school list of 8-12 schools with rationale, an activities list, honors and awards, essay strategy by school, recommendation letter strategy, and application timeline for senior year.

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

Generate the output as a single comprehensive strategy document (Phase 1 only, no Python code).

---

**PHASE 1: Strategy Document**

1. **Executive Summary (one page max):** This is the first thing the parent reads and the page they come back to. Include:
   - A brief projected applicant profile (3-4 sentences: GPA range, test score range, key strengths, key gaps)
   - The school list as a simple table: school name, tier (reach/target/safety), estimated net annual cost, and financial risk rating (very low / moderate / high)
   - The top 3 things to do in the next 6 months (specific, actionable, no jargon)
   - The financial floor: the cheapest guaranteed-admission option with its estimated annual cost. Name the school, name the cost, and say clearly that this is the worst-case scenario and it's a good one.

Generate the strategy document in two tiers:

**Tier 1: The Strategy Brief (~5,000 words)**

This is what the parent reads the day they get it. It should include:
- Executive Summary (already specified above)
- The Four Threads (what the application narrative is built around)
- School List with full financial analysis and honest commentary for each school (this is the core value, don't compress it)
- QuestBridge explanation (if applicable to this family's income)
- Financial Aid Strategy (FAFSA/CSS, non-custodial parent issues, state scholarships)
- Monte Carlo results summary (headline stats, the 3-5 decision scenarios, financial floor)
- What to Do Now (the 3-5 most important actions for the current stage)

Write Tier 1 as a continuous, readable document with the same direct tone. This is the thing a parent reads on their phone at midnight.

**Tier 2: The Reference Sections**

These are detailed sections the parent comes back to over the years. Each should stand alone and be clearly labeled so a parent can jump to "Essay Strategy" in year 3 without reading anything else. Include:
- Developmental Roadmap (grade-by-grade course tables, extracurricular plans, milestones, What Not to Do)
- Activities List (10 items, Common App format)
- Honors and Awards (projected, with aspirational vs likely flags)
- Essay Strategy (Common App angle, supplemental essay table by school, what the essay should NOT be)
- Recommendation Letter Strategy (who, when, what each letter should convey)
- Writing Portfolio or Maker Portfolio Guidance (if applicable: arts supplement, engineering/maker portfolio with project documentation and photos, research abstract, athletic recruitment materials, or other supplemental materials)
- Financial Aid Negotiation Guide (how to compare offers side by side, when and how to ask schools to match competing packages, which schools have flexibility)
- Senior Year Application Timeline (month-by-month from August through May)
- External Scholarships table

Mark the transition between Tier 1 and Tier 2 with a clear divider like:

---
# REFERENCE SECTIONS
*The sections below are detailed planning tools. Come back to them when you need them.*
---

The total document will still be comprehensive, but the first ~5,000 words should give a parent everything they need to understand the strategy and take action today.

End Phase 1 with a clearly formatted **Monte Carlo Parameter Table**. For each school on the list, provide:
   - Admit probability (cite the CDS or published rate you're adjusting from)
   - Merit scholarship probability and estimated amount
   - Honors program probability (if applicable)
   - Estimated net annual cost at this family's income level
   - Any special program probabilities (QuestBridge, recruited athlete, etc.)

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

  try {
    // Stream the response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
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
