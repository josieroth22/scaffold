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
- Name: Marco Medina
- Age / Current grade: 15 / sophomore (10th grade, 2025-2026 school year)
- School (name and type): Lake Nona High School, public
- School district: Orange County Public Schools (OCPS)
- Academic profile: 3.3 unweighted GPA. PSAT score from fall was 1060 (540 reading, 520 math). No gifted identification. Not in any honors or AP classes currently. He's in standard-track everything. Got a B+ in Biology and an A in his Digital Information Technology elective. Otherwise mostly B's and a couple C+'s in math.
- Academic strengths: He's actually sharp when he's interested. His biology teacher said he asks better questions than most of the honors kids. He aced the automotive systems unit in his tech elective. He's a good reader when he picks up something he cares about, just doesn't love the assigned stuff.
- Academic weaknesses or gaps: Math has always been a grind. He's in Algebra 2 and struggling with it. Writing is OK but he doesn't put effort into essays because he thinks they're pointless. He's never been in an honors or AP class and I worry he's behind the curve on that. His GPA is fine but not great.
- Interests, hobbies, obsessions: Cars. That's the big one. He helps Roberto at the shop every Saturday and some afternoons. He can diagnose engine problems by sound, I'm not exaggerating. He watches YouTube channels like Donut Media and ChrisFix for hours. He's been building a go-kart in the garage from parts he salvaged. Also plays guitar, self-taught from YouTube, mostly classic rock and some Latin stuff his abuela likes. Never performed anywhere, just plays at home. He fishes with my dad on weekends when he's not at the shop. He games with his friends but not obsessively.
- Personality / temperament: Quiet, easygoing, doesn't cause trouble. Not lazy but doesn't push himself unless something clicks. A little shy in groups but one-on-one he's funny and thoughtful. Not the kid who raises his hand in class but if a teacher asks him directly he usually has something good to say. He's responsible, shows up to the shop on time every Saturday, never complains. My husband says he's the best employee he's ever had.
- Anything a teacher has said about them that stuck with you: His biology teacher, Mr. Reeves, said at conferences that Marco "understands systems" and thinks about how things connect instead of just memorizing. He recommended Marco for AP Environmental Science next year but Marco said no because his friends aren't in it. That frustrated me.

**The Parents:**
- Parent 1: Sofia Medina, associate's degree from Valencia College (health sciences), office administrator at Orlando Health medical group
- Parent 2: Roberto Medina, no college degree, owns and operates Medina Auto Repair in Lake Nona (independent shop, been open 9 years)
- Family structure: Married, both in the home
- If divorced: N/A

**Siblings (if any):**
- Isabella (Izzy) Medina, age 11, 5th grade at Moss Park Elementary (OCPS). Straight A student, very different from Marco. Into dance and student council. She'll hit the college pipeline in about 6-7 years.

**Geography:**
- City and state: Orlando, FL (Lake Nona area)
- Urban / suburban / rural: Suburban. Lake Nona is a newer planned community on the southeast side of Orlando. Nice area, growing fast, good public schools by Florida standards.
- Willing to relocate for a school? How far? We'd prefer he stays in Florida, honestly. In-state tuition is a big deal for us. But if somewhere out of state offered a really compelling package we'd consider it. Southeast would be most comfortable. He's never been farther from home than Savannah.

**Finances:**
- Approximate household income: About $105,000 combined. My salary is $42,000. The shop nets about $60,000-70,000 (it fluctuates, some years better than others). Roberto takes a salary of about $63,000 from the business.
- Any significant assets: We own our home (bought 2020 for $340K, probably worth $420K now, owe about $280K). Roberto owns the shop building and equipment, probably worth $150K, still has a $90K loan on it. No 529 plan. We have about $15,000 in savings and Roberto has maybe $40,000 in a SEP-IRA. Two cars, both paid off.
- What can you realistically afford per year for college: Probably $8,000-10,000 per year out of pocket. More if Izzy's not in college at the same time. We're not going to take out crazy loans. Roberto's parents came to this country so their kids wouldn't start life in debt and he feels strongly about that.
- Any special financial circumstances: The shop income varies year to year. Last year was $68K profit, year before was $55K. The business owns assets (equipment, building) that might complicate FAFSA. I don't really understand how self-employment affects financial aid.

**School Preferences:**
- Size preference: He'd probably do best at a mid-size school. Not tiny, not enormous. He wouldn't do well somewhere where he's just a number.
- Geographic preference: Florida strongly preferred. In-state tuition plus Bright Futures would make a huge difference. Open to Georgia, the Carolinas if the package is right.
- Any must-haves: Something where he can work with his hands or do applied/practical work. Engineering maybe? He's never said "I want to be an engineer" but everything he does is engineering. If there's a school with a strong mechanical engineering or automotive engineering program that would be amazing. Also somewhere that has things to do, he'd be miserable at a school in the middle of a cornfield.
- Any deal-breakers: No party schools where he'll get lost. No schools where the net cost is over $12-15K/year. Nothing too far from home that we can't drive to if something goes wrong.
- Schools already on your radar: UCF (it's right here and everyone goes there), UF (but I don't know if his grades are good enough), Florida State. My coworker's son went to Florida Polytechnic and liked it. Roberto keeps mentioning Florida International because it's more Hispanic and he thinks Marco would be comfortable there. That's basically our whole list, I don't even know what else to look at.

---

### SECTION 2: WHAT YOU CARE ABOUT

Rank these 1-7 (1 = most important):

- [1] Minimize total cost of attendance
- [6] Prestige / brand name
- [3] Academic fit (specific programs, research, major strength)
- [4] Geographic location
- [5] Campus culture / social fit
- [2] Merit scholarship likelihood
- [7] Post-graduation outcomes (career placement, earnings, grad school)

Anything else that matters to you that isn't on this list: I want Marco to find a direction. He's a good kid but he's coasting. He has no idea what he wants to do and I think that's partly because no one has shown him what's possible. He doesn't think of himself as "college material" even though he's smart. He just doesn't fit the mold of the kids who get talked about at school. I want a plan that works for who he actually is, not who I wish he was.

---

### SECTION 3: ADDITIONAL CONTEXT

Here's what I'm worried about: Marco is invisible at school. He's not a troublemaker so nobody worries about him. He's not a straight-A kid so nobody celebrates him. He's just... there. His counselor has 500 students and I don't think she knows his name. He's going to graduate, get a diploma, and have no plan unless we make one.

The shop thing is real. Roberto started that business with nothing. Came from Puerto Rico at 19, worked at dealerships for 10 years, saved up, opened his own place. Marco has been helping there since he was 12. He can do oil changes, brake jobs, basic diagnostics. He built that go-kart I mentioned from a riding mower frame, a Harbor Freight engine, and parts from junked cars at the shop. It actually runs. His dad filmed it and it got like 2,000 views on YouTube, which for us is a lot.

The guitar is private. He plays in his room, mostly for himself. My mom (his abuela) requests songs and he learns them for her. He learned "Besame Mucho" for her birthday and she cried. He's not in a band, he's never performed, I don't even know if he's good by any real standard. But it matters to him.

We're a Puerto Rican family. Roberto's parents are still in Bayamon, we visit every other year. Marco speaks decent Spanish but won't speak it at school. His abuela lives with us half the year and they're close. She tells him stories about his abuelo who was a mechanic for the Navy in the 60s, and Marco eats that up.

I should be honest: I don't think Marco sees himself going to a "good" school. He thinks college is for the smart kids, the kids with the AP classes and the SAT prep courses. His friends are planning to go to Valencia (community college) or just work. I'm not knocking Valencia, I went there and it changed my life. But Marco is capable of more if someone shows him the path.

One more thing. Roberto doesn't really believe in the college process. He thinks Marco should take over the shop someday and that college is a waste of money for someone who's good with his hands. He's not opposed to college, he just doesn't see the point for Marco specifically. I need this plan to show Roberto that college and the shop aren't mutually exclusive. That an engineering degree makes Marco a better business owner, not a worse one. That's the conversation I need to win at home before I can win anything else.

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
- Writing Portfolio Guidance (if applicable)
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
