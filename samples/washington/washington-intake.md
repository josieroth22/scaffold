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
- Name: Jaylen Washington
- Age / Current grade: 14 / rising 9th grader (starting high school fall 2026)
- School (name and type): Barack Obama Academy of Young Men, APS magnet middle school. Will attend North Atlanta High School in the fall (public, APS).
- School district: Atlanta Public Schools
- Academic profile: 3.7 GPA unweighted. Scored in the 88th percentile on MAP testing in reading, 71st in math. No gifted identification but his 7th grade English teacher nominated him for the APS Scholars program. Honor roll every semester since 6th grade.
- Academic strengths: Reading, writing, social studies. He devours books. Wrote an essay on the Tulsa Race Massacre for a class assignment that his teacher entered into a city-wide MLK writing contest and it placed 2nd. He can argue a point better than most adults I know.
- Academic weaknesses or gaps: Math. He's not failing but he doesn't love it and it takes him longer. Currently in regular 8th grade math (not accelerated). Science is fine but not a passion.
- Interests, hobbies, obsessions: Debate (just started this year and he's already obsessed), reading (history, graphic novels, James Baldwin), writing poetry in his journal (he'd die if he knew I was telling you this), basketball (plays rec league, not travel, he's good but not elite), anime, cooking with me on Sundays
- Personality / temperament: Old soul. Quiet until he trusts you, then he will talk your ear off. Sensitive but doesn't show it. Very protective of his little sister. Can be stubborn when he thinks he's right (which is often). Gets frustrated when things don't click immediately, especially in math.
- Anything a teacher has said about them that stuck with you: His 7th grade English teacher, Ms. Coleman, told me at conferences that Jaylen "thinks in questions, not answers" and that she's never had an 8th grader who could hold a class discussion like he can. She said he reminds her of students she had when she taught at Morehouse.

**The Parents:**
- Parent 1: Maya Washington, associate's degree from Atlanta Technical College (business administration), office manager at a pediatric dental practice in Buckhead
- Parent 2: Marcus Washington. Not in the picture day-to-day. He's in Macon, works construction. Pays some child support but it's inconsistent. Did not go to college.
- Family structure: Single parent. I have full custody.
- If divorced: Never married. I have sole legal and physical custody. Marcus sees the kids maybe 4-5 times a year. He would not be filing FAFSA. Relationship is civil but distant.

**Siblings (if any):**
- Amara Washington, age 9, 3rd grade at Benteen Elementary (APS). She's a good student, very different from Jaylen, more social and into dance. She'll be entering the college pipeline in about 5-6 years.

**Geography:**
- City and state: Atlanta, GA
- Urban / suburban / rural: Urban. We're in the Pittsburgh neighborhood, southwest Atlanta.
- Willing to relocate for a school? How far? Jaylen can go wherever makes sense. I'd love him close enough to drive to (within the Southeast) but if a school in the Northeast or Midwest gives him a full ride, he's going. I'm not going to hold him back for my comfort.

**Finances:**
- Approximate household income: $72,000 (my salary is $68K, I do some bookkeeping on the side that brings in another $3-4K)
- Any significant assets: I own my home (bought in 2019 for $185K, probably worth $260K now, still owe about $140K). No 529 plan. I have about $8,000 in savings. That's it.
- What can you realistically afford per year for college: Honestly? Maybe $3,000-5,000 out of pocket per year. I know that sounds low. I'll still have Amara at home and I can't take on massive parent loans. I'm not doing $50K in Parent PLUS loans, I've seen what that does to people.
- Any special financial circumstances: The child support is not reliable, maybe $4,000-6,000/year when it comes. I don't want to count on it. My mom helps with childcare sometimes but she's on a fixed income (retired, social security).

**School Preferences:**
- Size preference: Unsure. I think mid-size might be right for Jaylen. He'd get lost at a 40,000-person school but he also doesn't want somewhere so small everyone knows his business. Open to suggestions.
- Geographic preference: Southeast is ideal. Open to the Northeast or Midwest if the money is right.
- Any must-haves: Strong writing or English or communications program. Good debate/forensics team. I want him somewhere that has real support for first-gen students (I guess technically he's first-gen for a four-year degree). A campus where a Black boy from Atlanta isn't going to feel like an alien.
- Any deal-breakers: No schools where the net cost would be over $15K/year for us. I'm serious about this. I don't care how prestigious it is. Also no schools in the middle of nowhere with nothing around, he's a city kid.
- Schools already on your radar: Morehouse (obviously, we're in Atlanta and Ms. Coleman's comment stuck with me), Georgia State (it's right here and I've heard they give good aid), Spelman for if Amara ends up on the same path. Howard has always been a dream. Someone at my church mentioned Emory but I honestly don't know if we could afford it. I've heard of QuestBridge but I don't really understand how it works.

---

### SECTION 2: WHAT YOU CARE ABOUT

Rank these 1-7 (1 = most important):

- [1] Minimize total cost of attendance
- [5] Prestige / brand name
- [4] Academic fit (specific programs, research, major strength)
- [6] Geographic location
- [3] Campus culture / social fit
- [2] Merit scholarship likelihood
- [7] Post-graduation outcomes (career placement, earnings, grad school)

Anything else that matters to you that isn't on this list: I want Jaylen to be somewhere that sees him. Not as a statistic, not as a diversity number, but as a kid with something to say. I want him around professors who will push him and mentors who look like him. I also want him to graduate without debt hanging over him for the next 20 years. I watched my cousin take out $90K in loans for a degree she's not even using. I won't do that to my son.

---

### SECTION 3: ADDITIONAL CONTEXT

Jaylen doesn't know I'm doing this. He'd probably roll his eyes. He thinks college is "far away" but it's really not, he starts high school in six months.

He's a good kid in a neighborhood that doesn't always make it easy to be a good kid. We've had friends lose sons to the street. That's not Jaylen's story but I'm aware of it every day. The structure matters. Debate has been huge for him this year, it gives him a place where being smart and being articulate is the cool thing. I want more of that.

His dad not being around is something he doesn't talk about but it's there. He's close to my brother (my brother went to Fort Valley State, played football, works at Delta now) and my pastor. Those are his male role models.

Culturally, we're active at Ebenezer Baptist Church. Jaylen has done community service through the youth ministry since he was 10. He organized a book drive for the Pittsburgh neighborhood library last year, collected over 400 books. That was his idea, not a school assignment.

I should mention: I don't know how any of this works. I didn't go through this process myself. My parents didn't go to college. I'm figuring it out as I go and I'm terrified of making a mistake that costs him an opportunity. That's why I'm here.

One more thing. Jaylen writes. Not just for school. He has a journal he's been keeping since 6th grade. He writes poems, observations, little essays about things that bother him. He showed me one once about what it feels like to walk past the abandoned houses on our block and imagine who used to live there. It made me cry. He has a voice. I just want to make sure the right people hear it.

---

### SECTION 4: OUTPUT INSTRUCTIONS

Generate the output in two phases. Complete Phase 1 entirely before starting Phase 2.

---

**PHASE 1: Strategy Document**

1. **Part One (Developmental Roadmap):** Organize by stage (preschool, elementary, middle school, high school). For each stage, cover academics, extracurriculars tied to the threads above, community involvement, and key milestones. Include specific local programs, schools, camps, and organizations by name. Include a "What Not to Do" section for each stage. Include course progression tables for middle and high school.

2. **Part Two (College Application Strategy):** Build a projected applicant profile based on the roadmap, explicitly noting where the profile is optimistic and what a "lands lower" version looks like. Create a school list of 8-12 schools spanning reaches, targets, and safeties, with rationale for each. Include:

   - **Activities list:** 10 items, ordered by distinctiveness (most unique first). Use Common App format: activity type, position/role, organization, description, grade levels, hours per week, and weeks per year.

   - **Honors and awards list:** Standalone formatted list, ordered by prestige/distinctiveness. Include projected year for each. Flag any that are aspirational vs. likely.

   - **Essay strategy:** Common App personal essay angle plus a supplemental lead angle table (one row per school, with the specific thread or story to emphasize). Include what the essay should NOT be.

   - **Recommendation letter strategy:** Which teachers, when to ask, what each letter should convey, and supplemental recommender options.

   - **Portfolio guidance** (if applicable): arts supplement, research abstract, athletic recruitment materials, or other supplemental materials.

   - **FAFSA/CSS Profile timeline:** When to file, strategic considerations for need-based vs. merit-focused families.

   - **Senior year application timeline:** Month-by-month from August through May, including EA/ED deadlines, RD deadlines, FAFSA/CSS dates, scholarship deadlines, and decision milestones. Include ED strategic advice (when it makes sense and when it doesn't given the family's financial priorities).

3. **Part Three (Monte Carlo Parameters):** End Phase 1 with a clearly formatted parameter table. For each school on the list, provide:
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
