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
- Name: Nora Kaplan
- Age / Current grade: 14 / freshman (9th grade, 2025-2026 school year)
- School (name and type): Walt Whitman High School, public
- School district: Montgomery County Public Schools (MCPS)
- Academic profile: 3.9 unweighted GPA first semester. All honors classes available to freshmen. Took AP Human Geography as a reach course and got a 5 on the exam. Hasn't taken PSAT yet (sophomore year) but scored 95th percentile on the 8th grade MAP test. Identified for the MCPS Gifted and Talented program in 3rd grade.
- Academic strengths: She's good at everything, which is part of the problem. Strong writer, consistently gets A's on essays. Does well in math (Honors Geometry as a freshman). Science is solid. She reads constantly but mostly YA fiction, not for intellectual reasons.
- Academic weaknesses or gaps: Nothing obvious, and that worries me. She's good at school but I don't know if she's passionate about any subject. She picks courses based on what looks good, not what excites her. She admitted to me that she finds most of her classes "fine but boring."
- Interests, hobbies, obsessions: She plays JV soccer (has since 5th grade, decent but not getting recruited anywhere). She's in Model UN (joined because her friends did). She volunteers at a food bank once a month through the school's community service club. She does coding club but told me "I'm not really into it, I just need activities." She likes drawing in her sketchbook but calls it "just doodling." She watches a lot of design and architecture content on TikTok and YouTube. She rearranged her room three times this year and spent 45 minutes at the Hirshhorn Museum staring at the building itself, not the art inside. She sketches floor plans for fun.
- Personality / temperament: Smart, conscientious, anxious about doing things right. Classic overachiever energy but already showing signs of burnout at 14. She makes to-do lists for her to-do lists. She cares deeply about what other people think. She once cried over an A-. Warm and funny with close friends but stiff and "performing" around adults she's trying to impress. She wants to get into a great school but when I ask what she wants to study she says "I don't know, maybe political science? Or business?"
- Anything a teacher has said about them that stuck with you: Her 8th grade art teacher, Ms. Novak, told us at the portfolio review that Nora has "a real eye for spatial design" and should consider architecture or industrial design courses. Nora dismissed it because it was "just an elective."

**The Parents:**
- Parent 1: Ethan Kaplan, JD from Georgetown Law, attorney at a mid-size firm in DC (government contracts)
- Parent 2: Sarah Kaplan, MPH from Johns Hopkins, program manager at NIH
- Family structure: Married, both in the home
- If divorced: N/A

**Siblings (if any):**
- Eli Kaplan, age 11, 5th grade at Burning Tree Elementary (MCPS). Less academically intense than Nora. Into Legos and basketball. He'll hit the college pipeline in about 7 years.

**Geography:**
- City and state: Bethesda, MD
- Urban / suburban / rural: Suburban. Classic Bethesda. Good schools, high cost of living, lots of type-A families competing over everything.
- Willing to relocate for a school? How far? She can go anywhere on the East Coast comfortably. We'd consider Midwest or West Coast for the right school. Probably not the deep South.

**Finances:**
- Approximate household income: About $235,000 combined. Ethan makes $165,000, Sarah makes $70,000 at NIH.
- Any significant assets: Home (bought 2016 for $680K, probably worth $950K now, owe about $410K). 529 plan for Nora with about $62,000 in it. 529 for Eli with about $35,000. Retirement accounts totaling about $380,000 between us. Two cars, one still financed (~$18K remaining).
- What can you realistically afford per year for college: We've been telling ourselves $35,000-40,000 per year. But Ivy League sticker prices are $85K+ and even with financial aid I get nauseous looking at the math. If she gets a state school with merit money we could be looking at $15-20K. That's a massive difference. We'd stretch for the right opportunity but we're not mortgaging our retirement.
- Any special financial circumstances: Nothing unusual. Both W-2 employees, straightforward taxes. The home equity is significant and I've heard some schools count that against you on CSS Profile. That scares me.

**School Preferences:**
- Size preference: Mid-to-large. She likes having options and wouldn't want everyone to know her business. But not so big she disappears.
- Geographic preference: East Coast preferred. Cities and suburbs feel natural. Boston, New York, Philadelphia, DC area all work.
- Any must-haves: Strong academics (she's worked hard, the school should match). Good campus life. Ideally a school with strong advising and mentoring, because she needs someone to help her figure out what she actually cares about. Active Jewish community on campus is a plus but not a requirement.
- Any deal-breakers: No schools where $85K/year is the only option. No party schools. Nothing where she'd feel academically unchallenged.
- Schools already on your radar: The Ivies, obviously. Harvard, Penn, Columbia, Brown are the ones she brings up. Georgetown (we drive past it all the time), UVA (lots of Whitman kids go there), University of Maryland (the safety, I assume). Her friend's older sister goes to Tufts and loves it. A colleague at NIH keeps telling me to look at Johns Hopkins. We've heard good things about Northeastern and their co-op program.

---

### SECTION 2: WHAT YOU CARE ABOUT

Rank these 1-7 (1 = most important):

- [4] Minimize total cost of attendance
- [3] Prestige / brand name
- [1] Academic fit (specific programs, research, major strength)
- [7] Geographic location
- [6] Campus culture / social fit
- [5] Merit scholarship likelihood
- [2] Post-graduation outcomes (career placement, earnings, grad school)

Anything else that matters to you that isn't on this list: I know we ranked prestige #3 but I want to be honest. It matters to us more than we want to admit. Ethan and I both went to "good" schools and we'd be lying if we said we don't care where she ends up. But we're also watching friends take out $300K in loans and wondering if the name is worth it. We need someone to help us think about this rationally, not emotionally.

---

### SECTION 3: ADDITIONAL CONTEXT

Here's what keeps me up at night: Nora is doing everything "right" and I'm terrified it won't be enough. She has the GPA, she has the activities, she'll probably have the test scores. But I read these articles about kids with perfect stats getting rejected from everywhere, and I think: what makes Nora different from the other 10,000 girls at competitive suburban public schools doing the exact same things?

The answer right now is: nothing. And that's the problem.

She doesn't have a "thing." She's not the girl who started a nonprofit or built an app or won a national science fair. She's the girl who does her homework, shows up to practice, volunteers when it's required, and goes home. She's pleasant and smart and completely interchangeable with a thousand other applicants from schools exactly like Whitman.

I think there might be something in the design/architecture direction. The art teacher saw it, and when I watch Nora she's constantly noticing visual things. How spaces are arranged, how things are built, why one room feels right and another doesn't. She spent 45 minutes at the Hirshhorn just looking at the building. She sketches floor plans for fun. But she dismisses all of this because it doesn't feel "serious" enough for college, and her friends are all talking about pre-med or finance.

I need to say something about the school environment. Whitman is an excellent school but it's a pressure cooker. Every kid has a tutor. Every kid does test prep. The parents compare notes on who's taking what AP and who got into which summer program. Nora absorbs all of this pressure even though we try to shield her from it. She told me last month that she feels like she's "losing the race" even though she has a 3.9 GPA. That broke my heart.

We're Jewish, and while we're not super religious, cultural community matters to us. Schools with active Hillel chapters or Jewish life on campus would be a plus.

One more thing: we can see University of Maryland from our metaphorical backyard. Nora has said "I'm not going to Maryland, that's where you go if you don't get in anywhere." I know that's teen snobbery and Maryland is an excellent school. But if I'm being honest, I kind of feel the same way, and I need someone to either validate that instinct or talk us out of it.

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
