const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const fs = require("fs");
const path = require("path");
const schoolData = require("../lib/school-data");
const { MODEL } = require("../lib/config");

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

  const today = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentDate = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  let prompt = `**TODAY'S DATE IS ${currentDate}. THE CURRENT SCHOOL YEAR IS ${today.getFullYear() - 1}-${today.getFullYear().toString().slice(2)}.** Every date, timeline, and deadline in this document must be consistent with this. "This summer" = summer ${today.getFullYear()}. "Next school year" = ${today.getFullYear()}-${(today.getFullYear() + 1).toString().slice(2)}. FAFSA references = the ${today.getFullYear()}-${(today.getFullYear() + 1).toString().slice(2)} cycle. Tax year references = ${today.getFullYear() - 1} taxes. Never reference a date before ${currentDate} as upcoming or current.

I'd like you to build a comprehensive college application and scholarship strategy document for my family. This is the Strategy Brief (Tier 1). A detailed Developmental Roadmap with grade-by-grade course tables, activities plans, and milestones will be generated separately as Tier 2. Focus this document on two parts:

**Part One: College Application Strategy** including an applicant profile (projected), a school list of 8-12 schools with rationale, financial analysis per school, a summer plan for each remaining summer, and application timeline recommendations. Every school on the list should be one you'd genuinely recommend for this specific family. If a school doesn't fit, leave it off. Don't pad the list. **Do NOT include a school if it is financially unreachable for this family** unless (a) the family explicitly named it, or (b) the family values prestige and the school is prestigious and the student has a realistic shot at admission. If sticker price is $85K and the family qualifies for minimal need-based aid and the school offers no merit, don't add it as filler. A school the family can't afford is not a recommendation, it's a tease. If this means listing 7 schools instead of 10, that's fine. Quality over quantity.

**Part Two: Probability and Cost Estimates** with admission probability, scholarship likelihood, and estimated net costs for each school on the list, producing a decision framework for April of senior year. Be honest that these are informed estimates based on the student's profile, not outputs of a statistical simulation.

**RADAR SCHOOLS ARE MANDATORY.** If the family listed specific schools in "Schools on your radar," you MUST include every single one on your school list and provide full analysis. These are schools the family is actively interested in. Even if a school is a long shot or expensive, include it with honest analysis of the odds and costs. The family asked about it, so address it. Never silently drop a radar school.

Use the family details and priorities below to personalize everything. Be specific to our geography, schools, and community. Where you make assumptions, state them. Where something is uncertain, flag it as a decision point. Include "What Not to Do" guidance at each stage.

**Application Strategy Principles:**
- **Application round strategy:** For EACH school on the list, recommend a specific application round (EA, ED, ED2, REA, RD) and explain why. **Default to Early Action whenever it's available.** EA is non-binding, gets decisions back sooner, and often has a slight admissions advantage. Especially for safeties and targets, EA puts acceptances in hand early, which reduces stress and gives the family leverage when comparing offers. Only recommend Regular Decision if there's a specific reason (e.g., the student needs more time to improve their profile, or the school doesn't offer EA). Only recommend Early Decision if it is genuinely the best strategic move for this family's financial situation. ED is binding and eliminates the ability to compare financial aid packages. For families where cost is a top priority or where the budget is tight, ED is usually the wrong call unless the school meets full demonstrated need and the family's EFC is clear. If ED doesn't make strategic sense, say so directly and explain why.
- **REA/SCEA constraint:** If you recommend Restrictive Early Action or Single-Choice Early Action at any school (Harvard, Yale, Princeton, Stanford, Notre Dame, Georgetown), the student cannot also apply EA or ED to any other PRIVATE school. They can only apply early to PUBLIC universities alongside the REA/SCEA school. Every other private school on the list must be RD (or ED2 in January). Common private schools this forces to RD: MIT, Case Western, USC, NYU, Boston University, Northeastern, Tulane, Rice, Duke, Emory, WashU, Northwestern, Carnegie Mellon, Johns Hopkins, Vanderbilt, Wake Forest, Lehigh, Villanova. Build the application calendar around this constraint and explain it clearly to the family.
- **Build a coherent application narrative ("spike"):** Modern admissions favors applicants with a clear, distinctive theme over generic well-roundedness. Identify the student's "spike" from their interests and activities, and build the entire strategy around deepening it. Every activity, essay, and recommender should reinforce the same story. Don't recommend starting random new activities just to fill boxes.
- **Depth over breadth:** 3-4 activities pursued deeply with leadership and impact will always beat 10 activities at surface level. If the student already has a strong core, say "don't add anything new" rather than suggesting they join more clubs.
- **Course rigor in context:** Admissions officers evaluate course load relative to what's available at the student's school. If the school offers 20 APs but the student takes 4, that's different from a school that offers 4 total. Recommend a course load that's rigorous FOR THIS SCHOOL, and note how it will look to admissions readers.
- **Summer strategy is critical:** For each remaining summer before application, provide a specific plan. Summers between 10th-11th and 11th-12th are high-impact. Options: pre-college programs, internships, research, meaningful work, community service projects. A summer job is fine and shows maturity. Don't recommend expensive "resume padding" programs unless they're genuinely selective and valuable.

**Financial Aid Knowledge You Must Apply:**

The VERIFIED SCHOOL DATA section below contains real admission rates, costs, and aid statistics from CDS 2024-25 reports and the College Scorecard. Use these numbers instead of estimating. When your own knowledge of a school's costs or admit rates disagrees with the VERIFIED SCHOOL DATA, the verified data wins: use the printed number in both the narrative and the JSON, even if you believe the real-world figure is different. The product's promise to families is consistency with its published data sources. The FINANCIAL AID REFERENCE FACTS section provides comprehensive context on no-merit schools, full-need schools, CSS Profile vs FAFSA, QuestBridge, gapping, demonstrated interest, and test-optional policies.

**Source citations:** Do NOT put inline citations in the body of the plan. No *(CDS 2024-25)* scattered through the text. Instead, at the very end of your output (after the JSON simulation params block), include a short **## Data Sources** section like this:

## Data Sources
The admission rates, costs, financial aid statistics, and scholarship details in this plan come from verified institutional data, not AI estimates.
- **Common Data Set 2024-25 reports:** [list the schools on your school list that had CDS data in the VERIFIED SCHOOL DATA section]
- **College Scorecard** (U.S. Department of Education): [list any schools on your list that only had Scorecard data]
- **State aid programs:** [name the state and the specific programs referenced, e.g., "Florida Bright Futures, Benacquisto Scholarship"]

Run each school's Net Price Calculator for your most accurate personal estimate.

Keep this section short and factual. It goes at the very end.

Key directives (the reference sections below have the full details):
- **Never suggest merit scholarships at need-only schools.** If a school's verified data shows 0% merit aid, do not project merit for that school.
- **Always recommend NPCs.** Families must run Net Price Calculators at every school on the list.
- **Financial safeties and budget alignment:** Every school list must include at least 2-3 financial safeties: schools where admission is near-certain AND the net cost is at or below the family's stated budget without relying on merit aid. These are usually in-state publics or schools with automatic merit for the student's stats. Name them explicitly and give the estimated cost. Compare every school's estimated net cost to the budget, and rate over-budget schools "High" or "Very High" financial risk in the executive summary table. If a strong financial safety exists (well under budget, near-certain admission), over-budget reaches are acceptable, even for over half the list, as long as the financial floor is clearly identified. Without a strong financial safety, at least 60% of schools must be at or under budget. If the family explicitly asked for expensive reach schools (Ivies, Stanford, etc.), lean toward giving them what they asked for rather than padding the list with affordable schools they did not request.
- **Use verified sticker costs and net prices from the school data section as your baseline.** Do not estimate sticker costs when verified data is available.
- **Anchor net cost estimates to verified net prices.** The Scorecard net price for this family's income bracket is the best available estimate of what they will actually pay. If a school's verified net price for this bracket is $49,000, do not estimate $16,000 just because you think merit aid is likely. Your net cost estimate should start from the verified net price and only adjust downward if the verified data shows high merit rates AND the student's stats are well above the school's median. When the verified data shows a school meets a low percentage of need (e.g., 21%), expect the net cost to be high.
- **Name verified scholarships and programs.** When the VERIFIED SCHOOL DATA lists specific scholarship names, honors programs, or National Merit awards for a school, cite them by name in the per-school writeup. Do not say "strong merit scholarships" when the data tells you the exact name.
- **Cite verified admit rates as the baseline.** When writing admission probability, always state the verified overall admit rate first (e.g., "Emory's overall admit rate is 10.3%"), then give your adjusted estimate for this student. Do not skip the baseline number. Do not include inline source citations like "per CDS 2024-25" in the body text. Sources go in the Data Sources appendix at the end. In the rendered plan (narrative text and tables), always express admit rates as percentages (e.g., "10.3%", "43.9%"), never as decimals. In the JSON simulation params block, use decimals (e.g., 0.103, 0.439).
- **State-specific opportunities:** The STATE AID PROGRAMS section below contains the family's state-specific programs. Name these programs, state requirements, and tell the family whether their kid is on track to qualify.

${financialAidFacts}



**Residency and State School Rules:**
- ALWAYS check the student's home state for state university residency. A student living in Oregon is IN-STATE for University of Oregon, Oregon State, Portland State, etc. A student in Georgia is in-state for UGA, Georgia Tech, Georgia State, etc. In-state tuition is typically $10-15K/year, NOT $35K+. Getting this wrong destroys credibility. Check the verified school data for correct in-state vs out-of-state costs.
- For UC schools (Berkeley, UCLA, etc.), only California residents get in-state tuition. Out-of-state UC students pay ~$45K+/year and face much lower admission rates (often half the overall rate or less). If the student is not a California resident, label UC schools as "Reach" for both admission and cost.
- WUE (Western Undergraduate Exchange) lets students from western states pay 150% of in-state tuition at participating out-of-state schools. WUE does NOT apply to a student attending their own state's public university (they already get in-state rates). Only mention WUE for out-of-state western schools.
- When estimating admit probability for public universities, always distinguish in-state vs out-of-state rates. Out-of-state admission at competitive publics (UVA, Michigan, Berkeley, UCLA, UNC) is significantly harder.

**Probability and Financial Estimates:**
- Calibrate admit probability estimates to selectivity. For selective schools (overall admit rate under ~40%), be conservative: a 3.85 GPA and 1320 SAT/PSAT does not get an 18% chance at a 15% acceptance rate school with no hooks. An unhooked applicant should stay within ~5 percentage points of the overall rate, and single-digit schools stay single-digit. Hooks (recruited athlete, legacy, URM at specific schools, first-gen) can meaningfully shift odds. For LESS selective schools where the student's stats are at or above the school's 75th-percentile test scores, high estimates (85-95%) are appropriate and expected: the overall rate averages over the whole applicant pool, and a financial safety should be near-certain by definition. Schools with published automatic-admission or automatic-merit thresholds the student clearly meets (e.g., Alabama's GPA/test criteria) can be estimated at 95%+. IN-STATE EXCEPTION: at public universities, an in-state applicant whose stats are at or above the school's mid-50% may be estimated up to roughly 1.5-2x the overall rate (never above 60%, and this exception never applies to single-digit-rate schools). State flagships admit in-state applicants at meaningfully higher rates than their overall number suggests; state the reasoning in the narrative (e.g., "UF admits 24% overall, but as an in-state applicant with your stats, your odds are closer to 40%").
- Keep financial estimates internally consistent. If you say a school costs "$45-55K" in one section, do not say "$55-65K" in another. Pick a range and use it throughout.
- The Monte Carlo Parameter Table contains ESTIMATES, not simulations. Present them honestly as probability estimates based on the student's profile, not as outputs of an actual Monte Carlo simulation. Do not claim to have "run 10,000 simulations."

**Critical: Do Not Hallucinate or Fabricate.**
- **When verified data exists for a school in the VERIFIED SCHOOL DATA section, use it.** The verified data section covers ~140 schools with CDS data plus all schools in the student's home state. For schools NOT in that section, be especially careful about specific names and numbers.
- When verified data lists specific scholarship names, honors programs, or National Merit awards for a school, you may cite those by name. When it doesn't, describe the TYPE of opportunity rather than inventing names.
- **Never invent details about the family that were not provided in their intake form.** Do not fabricate heritage, nationality, extended family situations, medical conditions, or any biographical detail. If the family did not mention it, do not include it. This is a trust-destroying error.
- Never invent teacher names, counselor names, coach names, or any specific person's name that the family did not provide. For recommendation letters, describe the TYPE of recommender needed (e.g., "a STEM teacher who has seen her problem-solving") rather than inventing names.
- Never invent specific club names, program names, or organizations at the student's school unless you are confident they exist (e.g., well-known national programs like DECA, Science Olympiad, Key Club are fine; made-up school-specific clubs are not).
- **SCHOLARSHIP AND PROGRAM NAMES: Use ONLY names that appear VERBATIM in the VERIFIED SCHOOL DATA section for that specific school.** Do not add, modify, or embellish names. If the verified data for Case Western lists "Andrew and Eleanor Squire Scholarship," you may cite that exact name. You may NOT add a second scholarship name that isn't in the data. If you want to mention additional merit opportunities beyond what's in the verified data, say "additional merit scholarship opportunities" or "check [school]'s website for other merit awards." The same rule applies to honors programs, research programs, and initiative names. Well-known national programs (Stamps Scholars, QuestBridge, National Merit) are fine. School-specific names must come from the verified data or be omitted.
- **Projected vs. current:** When writing a projected activities list or honors list, clearly label items as "Current" vs. "Projected" vs. "Aspirational." Never write projected future accomplishments as though they already happened. Don't invent specific outcomes (e.g., "Elected president," "Won regional award," "Increased membership 40%") for things that haven't occurred. Instead, describe the ROLE and TRAJECTORY (e.g., "Aim for captain by senior year," "Deepen involvement to 5+ hrs/week with a specific project").
- **External scholarships:** Do NOT invent local scholarship names. Instead, recommend the family search their state's scholarship database, their school counselor's list, and sites like Scholarships360 or Going Merry. You may mention well-known national scholarships (Coca-Cola Scholars, QuestBridge, National Merit) and TYPES of local scholarships to search for (e.g., "bar association scholarships," "community foundation awards"), but do not fabricate specific names and deadlines.
- Never fabricate specific scholarship dollar amounts. Use ranges or say "check the school's scholarship page for current amounts."

**Include a "What If the Profile Lands Lower" section.** For every plan, address what happens if test scores don't improve, if GPA drops, or if activities don't develop as projected. Give a concrete backup plan: which schools from the list are still solid options, what the financial picture looks like, and what changes in strategy. This section should feel reassuring, not scary. The point is: there's a good plan even in the downside scenario.

The tone should be direct and honest, not salesy. Acknowledge uncertainty. Call out where the plan is optimistic and what happens if the kid's profile lands lower than projected.

**Language standards:** This is a professional document a family is paying $50 for. Never use crude, vulgar, or potentially offensive phrasing. Avoid the term "poverty porn" and similar colloquial expressions. When advising on essay topics to avoid, use professional language like "avoid deficit narratives" or "don't frame your story around hardship for its own sake." Keep all language appropriate for a family audience.

---

${schoolData.loadSchoolsForPrompt(data)}

---

${schoolData.loadStateAid(data.state || schoolData.parseState(data.city))}

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
- Extracurricular activities: ${data.extracurriculars || "Not specified"}
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
- City and state: ${data.city}${data.state ? ', ' + data.state : ''}
- Urban / suburban / rural: ${data.area_type}
${data.area_context ? "- Area context: " + data.area_context : ""}
- Willing to relocate for a school? ${data.relocation}

**Finances:**
- Approximate household income: ${data.income}
- Any significant assets: ${data.assets}
- What can you realistically afford per year for college: ${data.college_budget || "Not specified (estimate a reasonable budget based on their income, assets, and family size, and explain your reasoning)"}
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

Generate the Strategy Brief (~5,000 words). This is the core document the parent reads the day they get it. Write it like you're talking directly to them. Reference Sections will follow separately. Your output must end with, in this order: the Probability and Cost Estimates Table, then the json-simulation-params block (specified below — never omit it; the simulation engine cannot run without it), then the short Data Sources section. After Data Sources, stop.

**Start with a title:** \`# [Student First Name]'s College Strategy\` followed by \`*[City], [State] | [Current Grade] | Scaffold [Month Year]*\` on the next line.

**FORMATTING: Use ## markdown headers for every major section** (e.g., \`## Executive Summary\`, \`## The Four Threads\`, \`## School List\`, \`## Financial Aid Strategy\`, \`## Summer Plan\`, \`## Probability and Cost Estimates\`, \`## What If the Profile Lands Lower\`, \`## What to Do Now\`). Use ### for subsections (e.g., each school in the school list). Do NOT use **bold text** as section headers. This is critical for the web rendering. Capitalize month names and abbreviations everywhere, including inside table cells and parentheticals: "Nov 1" not "nov 1", "Aug-Sept" not "aug-sept", "early January" not "early january". When stating the student's age, write it out ("16 years old"), never a bare number ("16," reads as ambiguous).

---

**## Executive Summary (one page max):** This is the first thing the parent reads and the page they come back to. Include:
   - A brief projected applicant profile (3-4 sentences: GPA range, test score range, key strengths, key gaps)
   - The school list as a simple table: school name, tier (reach/target/safety), recommended application round (EA/ED/REA/RD), estimated net annual cost, and financial risk rating. **Use ONLY these exact labels for financial risk:** Very Low, Low, Moderate, High, Very High. Do NOT use "Over Budget" or any other custom label. Schools that exceed the family's budget should be rated "High" or "Very High" depending on how far over budget they are. **ASTERISKS ON RADAR SCHOOLS:** Append an asterisk (*) directly after each radar school's name in this table. For example, if Stanford is on their radar, write "10. Stanford*" not "10. Stanford". The family's radar is: "${data.schools_on_radar || 'None'}". If the family used group references like "Ivies," "UCs," "Big Ten schools," or "major public schools," asterisk EVERY school on your list that belongs to that group. For example, if they said "Ivies," then Harvard*, Yale*, Columbia*, etc. all get asterisks. Do this for EVERY school that matches their radar, whether named specifically or by group. Then include the note below the table: "*Schools marked with asterisk were on your radar." If you recommended REA/SCEA for one school, mark the affected schools' application round with a dagger symbol (e.g., "RD†") and include a footnote below the table starting with "†" explaining which specific schools (by name, not by number) must switch to RD due to the REA restriction. Use † not superscript numbers — it's more visible.
   - The top 3 things to do in the next 6 months (specific, actionable, no jargon)
   - The financial floor: the cheapest guaranteed-admission option with its estimated annual cost. Name the school, name the cost, and say clearly that this is the worst-case scenario and it's a good one.

**Then continue with the full Strategy Brief, which should include:**
- Executive Summary (already specified above)
- The Four Threads (what the application narrative is built around)
- School List with full financial analysis and honest commentary for each school. Number each school sequentially (1. School Name, 2. School Name, etc.). For each school include: recommended application round (EA/ED/REA/RD) with reasoning, whether CSS Profile is required, whether the school tracks demonstrated interest, and what specific actions to take for that school. If you recommend REA/SCEA for one school, clearly note which other schools are forced to RD as a result. This is the core value, don't compress it.
- QuestBridge explanation (if applicable to this family's income)
- Financial Aid Strategy (FAFSA/CSS, non-custodial parent issues, state scholarships). **IMPORTANT: If the family owns a home, explicitly explain how the CSS Profile counts home equity as an asset and what that means for their aid at CSS Profile schools vs. FAFSA-only schools.** This is one of the biggest surprises for homeowner families and must be addressed directly. **STATE AID: If the VERIFIED SCHOOL DATA section includes state aid programs for this family's state, you MUST mention them by name in the Financial Aid Strategy and explain whether this student likely qualifies.** Do not skip state grants — for low and middle-income families, these can be worth thousands per year.
- Summer Plan: Specific recommendations for each remaining summer before application season
- Probability and Cost Estimates summary (headline stats, the 3-5 decision scenarios, financial floor)
- What If the Profile Lands Lower: Concrete backup plan if test scores, GPA, or activities don't develop as projected
- What to Do Now (the 3-5 most important actions for the current stage)

Write this as a continuous, readable document with the same direct tone. This is the thing a parent reads on their phone at midnight.

For each school on your list, include its verified sticker cost and the net price for this family's income bracket from the VERIFIED SCHOOL DATA section.

End with a clearly formatted **Probability and Cost Estimates Table**. For each school on the list, provide:
   - Admit probability (use the verified admit rate from the school data section as your baseline, then adjust for this student's profile)
   - Merit scholarship probability and estimated amount range
   - Honors program probability (if applicable)
   - Estimated net annual cost at this family's income level
   - Recommended application round (EA/ED/RD)
   - Any special program probabilities (QuestBridge, recruited athlete, etc.)

Do not begin the Reference Sections (they come next in a separate pass). After the Probability and Cost Estimates Table, you still owe two things before stopping: the json-simulation-params block and the Data Sources section, both specified below.

---

${schoolData.buildCheatSheet(data)}

---

**BEFORE YOU OUTPUT YOUR FINAL RESPONSE**, do a silent self-check against the rules above. Do NOT print this checklist. Verify each point internally, fix what you find, then output:

1. **Residency:** In-state tuition and admit rates only for the family's home state. DC residents are NOT in-state for Maryland or Virginia (mention DC TAG, $10K/year toward out-of-state public tuition, but keep out-of-state rates). Students from US territories are out-of-state everywhere.
2. **Consistency:** Every school keeps the same tier label (Reach, Target, or Safety), the same cost range, and the same application round in every section where it appears: executive summary table, per-school writeups, probability table, and What If section.
3. **Admit probabilities:** Realistic per the calibration rules above: within ~5 points of the overall rate at selective schools (under ~40% admit rate, single-digit stays single-digit), but appropriately high (85-95%+) at safeties where the student's stats clear the school's 75th percentile or published auto-admit thresholds.
4. **No-merit schools:** No merit probability or merit language for need-only schools (Ivies, MIT, Stanford, Caltech, Georgetown, the elite LACs in the reference facts). Their JSON merit fields are all 0.
5. **School list and budget:** 8-12 schools with at least one safety, one target, and one reach. The financial floor is named with its cost (a safety-tier school with near-certain admission). The budget alignment rules above are satisfied.
6. **JSON consistency:** Every admit_pct has exactly 3 decimal places matching its narrative percentage, and each school's sticker_cost minus need-aid midpoint minus (merit_pct x merit midpoint) lands within $3K of your narrative net cost.
7. **Dates:** "${today.getFullYear() - 1}" appears only in past-tense contexts (e.g., "based on ${today.getFullYear() - 1} data"), never as upcoming. The current year is ${today.getFullYear()}.
8. **Fabrication:** Scholarship names and amounts appear verbatim in the VERIFIED SCHOOL DATA (strict rule); academic programs and institutes may come from well-established knowledge (relaxed rule); no invented people, clubs, family details, or projected accomplishments written as fact.
9. **Verified data:** Every school with verified data uses the verified admit rate, sticker cost, and net price. Cross-check the QUICK REFERENCE table above.
10. **REA/SCEA:** If any school is REA or SCEA, no other private school on the list is EA or ED (see the constraint and school list in the Application Strategy Principles).
11. **State aid:** The family's state programs are mentioned by name.
12. **Radar schools:** Every radar school is on the list with full analysis and asterisked in the executive summary table.

Fix any issues you find, then output your final response.

---

**After the Probability and Cost Estimates Table**, output a JSON block with simulation parameters that will be used by our Monte Carlo simulation engine. This block will be hidden from the rendered plan. Use this exact format:

\`\`\`json-simulation-params
{
  "schools": [
    {
      "name": "School Name",
      "tier": "reach|target|safety",
      "admit_pct": 0.15,
      "merit_pct": 0.0,
      "merit_low": 0,
      "merit_high": 0,
      "need_aid_low": 20000,
      "need_aid_high": 35000,
      "sticker_cost": 55000,
      "round": "EA"
    }
  ],
  "family_budget": 15000
}
\`\`\`

Rules for the JSON block:
- Include every school from the school list
- \`admit_pct\`: your admission probability estimate for this student as a decimal (0 to 1), same as in the table, written with **exactly 3 decimal places**. Take the percentage from your narrative and divide by 100, keeping all three digits even when the last is zero: 45.1% = 0.451, 7.7% = 0.077, 86.0% = 0.860.
- \`merit_pct\`: probability of receiving a merit scholarship (0 for no-merit schools like Ivies, MIT, Stanford). For merit schools, estimate based on the student's profile
- \`merit_low\` / \`merit_high\`: annual merit scholarship range if awarded (0/0 for no-merit schools)
- \`need_aid_low\` / \`need_aid_high\`: estimated annual need-based aid range at this family's income level
- \`sticker_cost\`: total annual cost of attendance before any aid. Use the verified sticker_cost from the VERIFIED SCHOOL DATA section. Do not estimate sticker costs when verified data is available.
- \`family_budget\`: the family's stated annual budget (use the midpoint if they gave a range, or the upper end if ambiguous)
- All dollar amounts are integers, no dollar signs or commas

**The JSON parameters must produce net costs that match your narrative.** The simulation engine calculates: net_cost = sticker_cost - merit_award - need_aid. The median result must land within $3,000 of the "estimated net cost" you wrote in the executive summary table and per-school writeups. Before writing the JSON block, verify each school: sticker_cost minus the midpoint of need_aid_low/need_aid_high minus (merit_pct * midpoint of merit_low/merit_high) should fall inside your narrative range. If the math doesn't work, adjust either the narrative estimate or the JSON parameters so they agree.

---

**TONE:** Warm, encouraging, and realistic. Be the smart friend who genuinely cares about this kid's future. Celebrate what makes this student interesting. Be honest about challenges without being discouraging. When a school is a reach, say so clearly, but also explain what would make the application competitive. Acknowledge uncertainty and flag where the plan is optimistic. Use the family's own language and values. Reference specific details they provided naturally throughout. The plan should feel like it was written by someone who actually read everything the family wrote and cares about getting it right. Use humor sparingly but don't be afraid of it. Call out the parents directly when needed. No em dashes. Use commas, periods, or restructure the sentence.

**PARENT DETAILS:** If both parents are listed with education backgrounds, reference BOTH when relevant (legacy considerations, first-gen status, etc.). Do not mention one parent's alma mater and ignore the other's.

**VOICE:** Always address the parent directly. Use "your family", "your budget", "your son/daughter" throughout. Never use third person like "their family", "the family", "the student's parents". You are talking TO this parent, not writing a report ABOUT them.`;

  // If this is a retry after a failed review, append the feedback
  if (data.review_feedback) {
    prompt += `\n\n---\n\n**A previous attempt at this document failed quality review. Fix these specific issues in this attempt:**\n\n${data.review_feedback}\n\nAddress each issue listed above and check your output against these failure points before responding.`;
  }

  return prompt;
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
      state: data.state || "",
      income: data.income || "",
      payment_type: data.payment_type || "free",
      submitted_at: new Date().toISOString(),
      status: "generating",
      form_data: JSON.stringify(data),
    });
    // Add to the submissions list
    await redis.lpush("submissions", id);

    // Send notification email (fire and forget)
    if (process.env.RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Scaffold <notifications@scaffoldcollegestrategy.com>',
          to: 'josieroth22@gmail.com',
          subject: `New Scaffold submission: ${data.student_name} ${data.student_last_name || ''}`,
          html: `<p>New submission received!</p>
            <ul>
              <li><strong>Student:</strong> ${data.student_name} ${data.student_last_name || ''}</li>
              <li><strong>Location:</strong> ${data.city || ''}${data.state ? ', ' + data.state : ''}</li>
              <li><strong>Income:</strong> ${data.income || 'Not specified'}</li>
              <li><strong>Email:</strong> ${data.email || 'Not provided'}</li>
              <li><strong>Payment:</strong> ${data.payment_type || 'free'}</li>
            </ul>
            <p><a href="https://scaffold-hazel.vercel.app/admin.html">View in Admin</a></p>`,
        }),
      }).catch(err => console.error('Notification email failed:', err));
    }
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
      model: MODEL,
      // Thinking tokens count toward max_tokens. Fable 5 spends ~25K tokens
      // thinking on this prompt, so the cap needs to be far above the ~8K
      // document output (32K truncated mid-document in testing)
      max_tokens: 64000,
      thinking: { type: "adaptive" },
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
          // Check if cancelled
          const currentStatus = await redis.hget(`submission:${id}`, 'status');
          if (currentStatus === 'cancelled') {
            redis.hset(`submission:${id}`, { output: fullOutput }).catch(err => console.error("Partial save on cancel failed for", id, err));
            res.write(`data: ${JSON.stringify({ error: "Generation cancelled" })}\n\n`);
            res.end();
            return;
          }
          redis.hset(`submission:${id}`, { output: fullOutput }).catch(err => console.error("Partial save failed for", id, err));
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

// Export buildPrompt so regenerate.js can reuse the same prompt
module.exports.buildPrompt = buildPrompt;
