# Scaffold -- Prompt Template v3

## What This Is

This is a fill-in-the-blank prompt template. You fill in your family's details in Section 1, then paste the entire thing into Claude (or another AI assistant) to generate a personalized college strategy document, including a developmental roadmap from preschool through 12th grade, a college list, a real Monte Carlo simulation with actual code-generated probability distributions, and a financial decision framework.

The output will be a plan tailored to your kid, your location, your schools, and your family's values. It won't be a generic guide. It will be specific enough to act on.

## How to Use It

1. Fill in every field in **Section 1: Your Family's Details**. The more specific you are, the better the output. If you don't know something yet, write "unsure" and the plan will flag it as a decision point.
2. In **Section 2: What You Care About**, rank your priorities honestly.
3. In **Section 3: Additional Context**, add anything else that matters.
4. Paste the entire thing into a new Claude conversation.
5. Claude will generate Phase 1 (strategy document), then Phase 2 (Monte Carlo simulation with real code).

---

## PROMPT START

I'd like you to build a comprehensive college application and scholarship strategy document for my family. This should include three parts:

**Part One: Developmental Roadmap** from the kid's current age (or from preschool if we're planning ahead) through 12th grade, covering academics, extracurriculars, community involvement, and key milestones by age/grade. This should be specific to our local schools and programs, not generic advice.

**Part Two: College Application Strategy** including an applicant profile (projected, based on the developmental roadmap), a school list of 8-12 schools with rationale, an activities list, honors and awards, essay strategy by school, recommendation letter strategy, and application timeline for senior year.

**Part Three: Monte Carlo Financial Simulation** modeling 10,000 simulations of admission, scholarship, and honors outcomes across the school list, producing probability distributions for tier outcomes, cost outcomes, and a decision framework for April of senior year.

Use the family details and priorities below to personalize everything. Be specific to our geography, schools, and community. Where you make assumptions, state them. Where something is uncertain, flag it as a decision point. Include "What Not to Do" guidance at each stage.

The tone should be direct and honest, not salesy. Acknowledge uncertainty. Call out where the plan is optimistic and what happens if the kid's profile lands lower than projected.

---

### SECTION 1: YOUR FAMILY'S DETAILS

**The Kid:**
- Name:
- Age / Current grade:
- School (name and type -- public, private, charter, magnet, homeschool):
- School district:
- Academic profile (current grades, any test scores, gifted identification, etc.):
- Academic strengths:
- Academic weaknesses or gaps:
- Interests, hobbies, obsessions:
- Personality / temperament:
- Anything a teacher has said about them that stuck with you:

**The Parents:**
- Parent 1: Name, education, profession
- Parent 2 (if applicable): Name, education, profession
- Family structure (married, divorced, single parent, etc.):
- If divorced: custody arrangement, which parent files FAFSA, relationship quality

**Siblings (if any):**
- Names, ages, and where they are in the education pipeline:
- Any already in college or planning to be?

**Geography:**
- City and state:
- Urban / suburban / rural:
- Willing to relocate for a school? How far?

**Finances:**
- Approximate household income (be honest, this matters for financial modeling):
- Any significant assets (home equity, 529 plans, etc.)?
- What can you realistically afford per year for college (before aid/scholarships)?
- Any special financial circumstances (business owner, rental income, recent income change)?

**School Preferences:**
- Size preference (large research university, mid-size, small liberal arts)?
- Geographic preference (stay in state, specific regions, anywhere)?
- Any must-haves (specific major, D1 sports, religious affiliation, co-op programs)?
- Any deal-breakers?
- Schools already on your radar (even if vague):

---

### SECTION 2: WHAT YOU CARE ABOUT

Rank these 1-7 (1 = most important):

- [ ] Minimize total cost of attendance
- [ ] Prestige / brand name
- [ ] Academic fit (specific programs, research, major strength)
- [ ] Geographic location
- [ ] Campus culture / social fit
- [ ] Merit scholarship likelihood
- [ ] Post-graduation outcomes (career placement, earnings, grad school)

Anything else that matters to you that isn't on this list:

---

### SECTION 3: ADDITIONAL CONTEXT

Tell us anything else. Family traditions, cultural considerations, religious background, extenuating circumstances, a story about your kid that captures who they are, something you're worried about, a dream you have for them. The more you tell us, the more personal the plan becomes.

---

### SECTION 4: OUTPUT INSTRUCTIONS

Generate the output in two phases. Complete Phase 1 entirely before starting Phase 2.

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

This table will be the input to Phase 2.

---

**PHASE 2: Monte Carlo Simulation (Python Code)**

Using the parameter table from Phase 1, write and execute a Python script that:

1. Runs 10,000 simulations using numpy
2. For each simulation, for each school: draw admission (Bernoulli), then conditional on admission draw scholarship (Bernoulli with amount), then conditional on admission draw honors (Bernoulli)
3. Compute per-simulation:
   - Best 4-year cost (cheapest school admitted to, after scholarships)
   - Best tier outcome (reach/target/safety)
   - Count of acceptances
   - Whether the "financial floor" school is achieved
4. Produce summary statistics and four charts:
   - **Chart 1:** Distribution of best 4-year total cost (histogram)
   - **Chart 2:** Probability of admission to at least one school in each tier (bar chart)
   - **Chart 3:** Distribution of total acceptances (histogram)
   - **Chart 4:** Sibling budget impact analysis OR sensitivity analysis (varies by family)
5. End with a **Decision Framework** for April of senior year: 3-5 named scenarios (e.g., "Scenario A: Admitted to Vanderbilt with $25K/yr scholarship"), each with specific costs, trade-offs, and a recommendation.

Each scenario names specific schools, specific costs, and a recommendation. Include:
   - A gap year option if outcomes don't justify the price
   - Financial aid negotiation guidance
   - How sibling college timelines affect the math (if applicable)

---

**TONE (both phases):** Direct, honest, specific. Not consultant-speak. Acknowledge uncertainty and flag where the plan is optimistic. Use the family's own language and values. Reference specific details they provided naturally throughout. The plan should feel like it was written by a smart friend who knows college admissions, not by a brochure. Use humor sparingly but don't be afraid of it. Call out the parents directly when needed.

## PROMPT END
