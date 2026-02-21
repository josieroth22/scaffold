const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const fs = require("fs");
const path = require("path");
const schoolData = require("./school-data");

const { MODEL, REVIEW_TEMPERATURE } = require("./config");

const client = new Anthropic.default();

// Load financial aid facts once at module level (for no-merit list, etc.)
const financialAidFacts = fs.readFileSync(
  path.join(__dirname, "..", "..", "prompts", "financial-aid-facts.md"),
  "utf8"
);

// Extract just the no-merit school list for the reviewer
const noMeritSection = financialAidFacts.split("## 2.")[0].split("## 1.")[1] || "";
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

  // Check if cancelled before starting
  if (data.status === 'cancelled') {
    return res.status(200).json({ cancelled: true });
  }

  await redis.hset(`submission:${id}`, { status: "reviewing" });

  let formData;
  if (typeof data.form_data === 'string') {
    try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
  } else {
    formData = data.form_data || {};
  }

  // Extract simulation params JSON from the Tier 1 output
  let simParams = null;
  const paramMatch = (data.output || '').match(/```json-simulation-params\s*([\s\S]*?)```/);
  if (paramMatch) {
    try { simParams = JSON.parse(paramMatch[1]); } catch (e) { /* ignore parse errors */ }
  }

  // Load simulation results if available
  let simResults = null;
  if (data.simulation) {
    if (typeof data.simulation === 'string') {
      try { simResults = JSON.parse(data.simulation); } catch (e) { /* ignore */ }
    } else {
      simResults = data.simulation;
    }
  }

  // Build cross-section comparison data for the reviewer
  // Use simulation input data as ground truth (what the sim actually ran with)
  let crossSectionData = '';
  let paramMismatches = '';

  if (simResults) {
    const simSchools = simResults.schools || [];

    // Check if JSON params block matches what the simulation actually used
    // (reconcile-costs can corrupt the JSON params block)
    if (simParams) {
      const mismatches = [];
      for (const simSchool of simSchools) {
        const paramSchool = (simParams.schools || []).find(s => s.name === simSchool.name);
        if (paramSchool && simSchool.sticker_cost != null) {
          if (Math.abs(paramSchool.sticker_cost - simSchool.sticker_cost) > 1000) {
            mismatches.push(`${simSchool.name}: JSON params says sticker=$${paramSchool.sticker_cost} but simulation used sticker=$${simSchool.sticker_cost}`);
          }
        }
      }
      if (mismatches.length > 0) {
        paramMismatches = `\n\n**WARNING - JSON PARAMS BLOCK CORRUPTED:**
The JSON simulation parameters embedded in the document do NOT match what the simulation actually used. This likely happened during cost reconciliation. These mismatches MUST be flagged under simulation_params:
${mismatches.map(m => '- ' + m).join('\n')}
\n`;
      }
    }

    crossSectionData = `\n\n**CROSS-SECTION DATA FOR CONSISTENCY CHECK:**

The plan has three places where school costs and probabilities appear:
1. The narrative (executive summary table, per-school writeups, probability table)
2. The JSON simulation parameters (extracted from the end of Tier 1)
3. The Monte Carlo simulation results (computed from the JSON parameters)

**SIMULATION RESULTS (ground truth from 10,000 Monte Carlo iterations):**

`;
    for (const simSchool of simSchools) {
      const paramSchool = simParams ? (simParams.schools || []).find(s => s.name === simSchool.name) : null;
      crossSectionData += `**${simSchool.name}:**\n`;
      crossSectionData += `- Simulation input: sticker_cost=$${simSchool.sticker_cost}\n`;
      crossSectionData += `- Simulation results: simulated_admit=${(simSchool.simulated_admit_rate * 100).toFixed(1)}%, median_net_cost=$${simSchool.net_cost?.median || 'N/A'}, p25=$${simSchool.net_cost?.p25 || 'N/A'}, p75=$${simSchool.net_cost?.p75 || 'N/A'}\n`;
      if (paramSchool) {
        crossSectionData += `- JSON params in document: admit_pct=${paramSchool.admit_pct}, sticker_cost=$${paramSchool.sticker_cost}, merit_pct=${paramSchool.merit_pct}, merit_range=$${paramSchool.merit_low}-$${paramSchool.merit_high}, need_aid_range=$${paramSchool.need_aid_low}-$${paramSchool.need_aid_high}\n`;
      }
      crossSectionData += '\n';
    }
    crossSectionData += `Family budget from simulation: $${simResults.portfolio?.family_budget || 'N/A'}\n`;
    if (simParams) {
      crossSectionData += `Family budget from JSON params: $${simParams.family_budget}\n`;
    }
    crossSectionData += paramMismatches;
  }

  // Load verified school data for ground truth comparison
  const verifiedSchoolData = schoolData.loadSchoolsForPrompt(formData);

  // Load state aid for verification
  const stateAid = schoolData.loadStateAid(formData.state || schoolData.parseState(formData.city));

  // Detect whether Tier 2 is present (for conditional checks)
  const hasTier2 = (data.output || '').includes('REFERENCE SECTIONS');

  const prompt = `You are a quality reviewer for a college planning product called Scaffold. A family paid $50 for a personalized college strategy document. Your job is to review the generated plan for errors, inconsistencies, and hallucinations.

**FAMILY DETAILS (everything the family submitted):**
- Student: ${formData.student_name}, ${formData.student_age_grade}
- School: ${formData.school_name}, ${formData.school_type}
- City: ${formData.city}${formData.state ? ', ' + formData.state : ''}
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
- Additional context: ${formData.additional_context || "None"}

**THE GENERATED PLAN:**

${data.output}
${crossSectionData}

**VERIFIED SCHOOL DATA (ground truth):**

The following data comes from CDS 2024-25 reports and the College Scorecard. Use it to verify the plan's numbers.

${verifiedSchoolData}

---

**SCHOOLS THAT DO NOT OFFER MERIT AID (need-based only):**

${noMeritSection}

Use this list to verify check #4. If the plan assigns merit aid to any school on this list, FAIL.

---

**STATE AID PROGRAMS (for this family's state):**

${stateAid}

---

**Review this plan for the following issues. For each category, respond with PASS or FAIL and a brief explanation. If FAIL, quote the specific problematic text.**

1. **Residency accuracy:** Are in-state/out-of-state tuition classifications correct for the student's home state? DC students should NOT be listed as in-state for Maryland or Virginia. Students are only in-state for schools in their own state.
   **CRITICAL: Also verify the sticker_cost in the JSON params matches the correct residency rate.** If a student is out-of-state at a public university, the sticker cost must reflect out-of-state tuition (typically $45K-$60K), NOT in-state tuition (typically $15K-$35K). For example, a DC student at UMD should have a sticker cost around $55K, not $30K. If the sticker cost uses the wrong residency rate, FAIL this check and flag the dollar amount mismatch.

2. **Cost consistency across sections:** Do the cost estimates match across ALL sections of the plan? Check three things:
   - Do the executive summary table costs match the per-school writeups and the probability table?
   - Do the narrative cost estimates match the JSON simulation parameters (sticker_cost minus aid ranges should roughly equal the narrative's estimated net cost)?
   - Do the simulation results (median net cost) roughly align with the narrative estimates (within ~$3K)?
   If any school's numbers differ by more than $3,000 between ANY two sections, FAIL and list every mismatch with the specific numbers from each section.

3. **Admission rate consistency:** Are admission probability estimates consistent across ALL places they appear? Check:
   - Does the narrative prose for each school state the same admission probability as the probability table?
   - Does the probability table match the admit_pct in the JSON params?
   - Does the simulation's simulated_admit_rate roughly match the input admit_pct (within a few percentage points, since simulation is stochastic)?
   - Are the estimates realistic? A strong applicant should not exceed the school's overall admit rate by more than ~5 percentage points.
   If the prose says one number (e.g., "9% acceptance rate") but the table or JSON says a different number (e.g., 12%), FAIL this check. Check EVERY school for prose vs. table consistency.

4. **No-merit school check:** Are merit scholarships incorrectly assigned to schools that only offer need-based aid? Check EVERY school on the list against the NO-MERIT LIST provided above. If a school appears on that list and the plan shows merit_pct > 0 in the JSON, or describes merit scholarship opportunities in the narrative, FAIL. Also check: if the narrative says "no merit aid" for a school, does the JSON have merit_pct=0?

5. **Fabricated content:** Check for ANY content that could not have been derived from the family's input above OR from the VERIFIED SCHOOL DATA. IMPORTANT: Read the FAMILY DETAILS section carefully first. If the family mentioned something in their input (e.g., awards, programs, competitions, activities), the plan is allowed to reference it. Do NOT flag content that matches the family's own words. Compare scholarship names, program names, and cost figures against the VERIFIED SCHOOL DATA. If the plan attributes a scholarship to a school and the verified data shows different scholarships for that school, FAIL. Specifically flag:
   - Invented teacher names, counselor names, professor names, or faculty references
   - Specific named scholarships — verify they actually belong to the school mentioned by checking the VERIFIED SCHOOL DATA section. Scholarships associated with one university (e.g., "Annenberg" = USC/UPenn, "Karsh" = UVA/Duke, "Jefferson" = UVA) must not be attributed to a different school. FAIL if a real scholarship name is paired with the wrong school, or if a fabricated scholarship name is used when verified data lists the real scholarships.
   - Specific named programs, institutes, honors programs, or research centers — check the VERIFIED SCHOOL DATA for honors programs listed. Do not accept a plausible-sounding name at face value. EXCEPTION: Well-known national programs (e.g., MITES/MOSTEC, SAMS, STEP, Science Olympiad, FIRST Robotics, Silver Knight Awards) are real and should NOT be flagged as fabricated.
   - Specific application deadlines or dates for future cycles that have not yet been announced
   - Accomplishments, awards, or activities attributed to the student that weren't mentioned in the family's input. BUT if the family mentioned the activity or award (even briefly), the plan may elaborate on it.
   - Statistics or rankings presented as facts that could be outdated or wrong
   - Marketing slogans or campaign names attributed to schools that you cannot verify
   Be aggressive on this check. If you are not confident a named scholarship, program, or honors track exists at the specific school mentioned, FAIL. It is better to flag a real program than to let a fabricated one through to a paying customer. But do NOT flag things the family themselves mentioned or well-known national programs/awards.

6. **Activities list accuracy:** ${hasTier2 ? 'In the Tier 2 activities list, are [CURRENT] items based on what the family actually said? Are [TARGET] items clearly framed as goals, not accomplished facts?' : 'SKIP this check (Tier 2 reference sections are not present in this document). Mark as PASS with detail "Tier 2 not yet generated."'}

7. **Date accuracy:** Are there references to dates that have already passed (e.g., "summer 2025" when it's 2026)?

8. **Voice consistency:** Does the plan address the parent directly ("your family", "your son/daughter") rather than third person ("the family", "the student's parents")?

9. **School count and balance:** Are there 8-12 schools? Is there at least one safety, one target, and one reach? Is there a financial safety?

10. **Budget alignment:** If the family specified a budget:
    - Does the family_budget in the JSON params match what the family stated?
    - Is the budget figure referenced prominently (not buried in one sentence)?
    - For EVERY school, compare the plan's estimated net cost to the budget. List which schools are over budget and by how much.
    - Are over-budget schools clearly flagged in the executive summary or financial risk column?
    - If more than half the schools exceed the budget, FAIL — the list needs more affordable options or clearer warnings.
    - Is there at least one true financial safety (a school confidently under budget even in the worst case)?

11. **Simulation parameter sanity:** Check the JSON simulation parameters for obvious errors (see sub-checks below).

12. **Verified data usage:** For each school on the list that has verified data in the VERIFIED SCHOOL DATA section, compare the plan's admit rate, sticker cost, and net price against the verified numbers. If any differ by more than 2 percentage points (admit rate) or $3,000 (costs), FAIL and list every discrepancy. The verified data is ground truth from CDS 2024-25 reports and the College Scorecard.

13. **REA/SCEA constraint:** If the plan recommends Restrictive Early Action or Single-Choice Early Action at any school (Harvard SCEA, Yale SCEA, Princeton SCEA, Stanford REA, Notre Dame REA, Georgetown REA), verify that NO other private school on the list is marked EA or ED. Only public/state universities may be EA alongside an REA/SCEA school. Other private schools must be RD or ED2. If the plan has Stanford REA and also MIT EA, that is a FAIL. Check every school's recommended round.

14. **State aid programs:** If the STATE AID PROGRAMS section above lists programs for this family's state, does the plan mention them? For example, if the family is in Florida and the state aid section mentions Bright Futures, does the plan discuss Bright Futures and whether this student is on track? If significant state programs exist and are completely absent from the plan, FAIL.

**Details for check 11 (simulation parameter sanity):**
    - sticker_cost should be reasonable ($15K-$85K range)
    - need_aid values shouldn't exceed sticker_cost
    - merit_low should be less than merit_high
    - admit_pct should be between 0 and 1
    - For no-merit schools, merit_pct, merit_low, and merit_high should all be 0
    - **CRITICAL:** If the CROSS-SECTION DATA above includes a "WARNING - JSON PARAMS BLOCK CORRUPTED" section, this check MUST FAIL. The JSON params block was altered during cost reconciliation and no longer matches the simulation inputs. List every mismatch from the warning.

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
    "budget_alignment": { "status": "PASS" or "FAIL", "detail": "..." },
    "simulation_params": { "status": "PASS" or "FAIL", "detail": "..." },
    "verified_data_usage": { "status": "PASS" or "FAIL", "detail": "..." },
    "rea_scea_constraint": { "status": "PASS" or "FAIL", "detail": "..." },
    "state_aid_programs": { "status": "PASS" or "FAIL", "detail": "..." }
  },
  "summary": "One paragraph summary of overall quality and any critical issues."
}
\`\`\`

Only output the JSON block. No other text.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 5000,
      temperature: REVIEW_TEMPERATURE,
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

    // Track review count and history
    const prevCount = parseInt(data.review_count) || 0;
    const newCount = prevCount + 1;
    let history = [];
    if (data.review_history) {
      try {
        history = typeof data.review_history === 'string' ? JSON.parse(data.review_history) : data.review_history;
        if (!Array.isArray(history)) history = [];
      } catch (e) { history = []; }
    }
    history.push({
      attempt: newCount,
      overall: review.overall || 'unknown',
      reviewed_at: new Date().toISOString(),
      checks: review.checks || [],
    });

    // Store review in Redis
    await redis.hset(`submission:${id}`, {
      review: JSON.stringify(review),
      review_count: newCount,
      review_history: JSON.stringify(history),
      reviewed_at: new Date().toISOString(),
    });

    return res.status(200).json(review);
  } catch (err) {
    console.error("Review error:", err);
    return res.status(500).json({ error: "Review failed: " + err.message });
  }
};
