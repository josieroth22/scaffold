# Scaffold: Project Plan

## What Scaffold Is

Scaffold is a $50 consumer product that generates personalized 20+ page college strategy documents for families. A parent fills out a form, we run their details through Claude Opus with a proprietary prompt template, and they get a full strategy doc at a unique URL: school list, developmental roadmap, financial modeling, Monte Carlo simulation, essay strategy, and more.

The mission: close the information gap in college planning. A $310K family in Naperville gets a $10K private counselor. A $48K single mom in San Antonio is Googling "how to pay for college" at midnight. Scaffold gives Family B the same data-driven planning for $50.

---

## What's Built

- **Landing page** (index.html) with 3 sample plans (Alejandra, Priya, Jake)
- **Intake form** (intake.html) with 7-step guided flow, bypass code for free access
- **Generation pipeline**: Tier 1 (Strategy Brief) -> Monte Carlo simulation (10,000 iterations) -> Cost reconciliation -> Tier 2 (Reference Sections) -> Quality review (12 checks) -> Targeted fix pass (find/replace, up to 2 attempts) -> Re-review
- **Plan page** (plan.html) with sidebar navigation, collapsible sections, simulation charts, submission info
- **Admin dashboard** (admin.html) with submission management, plan viewing, simulation retry
- **Infrastructure**: Vercel serverless functions, Upstash Redis, Anthropic API (Claude Opus)

---

## Product Roadmap

### Phase 1: Friends & Family Testing (NOW)
- [ ] Share site with friends and collect feedback on plan quality and form UX
- [ ] Mobile test the full flow (form, generating screen, plan page) on a phone
- [ ] Collect testimonial quotes from testers for homepage
- [ ] Review generated plans for accuracy, tone, and hallucinated data
- [ ] Run 20+ test submissions covering diverse profiles (different income levels, regions, family structures, academic strengths, edge cases like DC residency, international students, divorced parents, first-gen, rural, etc.). Evaluate each plan and update prompts as needed to handle all bases.

### Phase 2: Business Setup
*Do this before taking real payments.*
- [ ] Form an LLC (state filing, ~$50-200 depending on state)
- [ ] Get an EIN from IRS (free, irs.gov, takes 5 minutes)
- [ ] Open a business bank account (keeps Stripe payouts separate from personal)
- [ ] Set up business email at scaffoldcollegestrategy.com

### Phase 3: Data Quality
*Before taking money, the numbers need to be verifiable.*
- [x] Build a JSON database of Common Data Set data for 100-150 schools — **136 schools parsed from CDS PDFs/XLSX**
- [x] Build a master school reference document with qualitative info — **108 schools with scholarships/honors/National Merit, 55 QuestBridge tags, 1,492 schools with Scorecard data**
- [x] Build comprehensive state aid reference — **data/state-aid-programs.md covering all 50 states + DC, 17 prompt rules**
- [x] Inject school data (CDS + Scorecard + reference + state aid + financial-aid-facts) into the prompt at generation time via `src/api/school-data.js` — **~23K tokens of verified data injected per generation**
- [x] Inject verified data into Tier 2 and review pipelines — **review.js now uses verified data as ground truth (check #12)**
- [ ] Deploy the data injection update to Vercel
- [ ] Run manual test generation with Washington family (Atlanta, GA, $72K) and verify: Georgia HOPE/Zell Miller appears with correct thresholds, UGA uses in-state tuition, no fabricated scholarship names, costs match verified data
- [ ] Run automated 20-profile batch test with CDS data live. Profiles cover: DC/PR residency edge cases, no-merit schools, tight budgets ($0-$15K), rural first-gen, athletes, arts/conservatory, DACA, divorced families (FAFSA vs CSS split), homeschool, learning disabilities, military/ROTC, CC transfers, international, legacy, LGBTQ+ culture fit. Evaluate every plan for accuracy, run full review+fix pipeline, and iterate prompts based on failure patterns.
- [ ] Regenerate homepage sample plans (Alejandra, Priya, Jake) with CDS-backed data so samples reflect the same data quality as paid plans
- [ ] Add school data count to homepage (e.g., "Built on verified data from 1,492 schools")
- [ ] Add source citations to the output ("Based on Emory CDS 2024-2025 data")
- [ ] Plan the annual update process: refresh CDS data, Scorecard API data, and reference data every year when new CDS releases come out (typically fall/winter). Set a calendar reminder. Document which schools publish CDS as PDF vs Excel vs online-only.

### Phase 3b: Data Cleanup (low priority)
*Nice-to-haves that improve coverage but aren't blockers.*
- [ ] Parse CDS for 11 missing schools (all US News 80+): Binghamton, Colorado School of Mines, Chapman, Creighton, Elon, Saint Louis, Temple, U of Missouri, BYU, U of Tennessee, Yeshiva
- [ ] Add DACA/undocumented aid, foster care tuition waivers, military/veteran education benefits, and Native American tuition waivers to state aid doc
- [ ] Fill in founder-curated reference fields still empty for most schools: demonstrated_interest, no_loan_policy, application_notes, strong_programs

### Phase 4: Legal
*Required before charging strangers.*
- [ ] Terms of Service (you're collecting sensitive financial data and info about minors)
- [ ] Privacy Policy (legally required, especially with financial/education data; COPPA may apply)
- [ ] Formal disclaimer page ("not professional counseling, no guaranteed admission or scholarship outcomes")

### Phase 5: Launch Infrastructure
*Everything needed to go from free testing to paid product.*
- [ ] Stripe integration ($50 one-time payment before form access)
- [ ] Connect Stripe to business bank account
- [ ] Custom domain (scaffoldcollegestrategy.com) for plan URLs
- [ ] DNS: point domain nameservers to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- [ ] Email delivery of completed plan link to the family
- [ ] Open Graph meta tags (so link previews look good on iMessage, social, etc.)
- [ ] Analytics (Google Analytics or Plausible) to track traffic, form completion rate, drop-off

### Phase 6: Reliability & Safety
- [ ] Rate limiting on form submission (prevent spam that runs up API costs)
- [ ] Error recovery: save form state so families can retry without re-filling everything
- [ ] Character limits on form fields (prevent excessively long inputs that blow up token counts and cost; guide users toward concise answers)
- [ ] Graceful error handling when Claude API is down or times out: show a friendly error message with a support email to contact, and save their form data so they don't lose it
- [ ] Data retention policy (how long do plans live in Redis? backup strategy?)
- [ ] SEO basics (meta descriptions, Google Search Console)

### Phase 7: User Accounts (Supabase + Google OAuth)
- [ ] Set up Supabase project (free tier)
- [ ] Configure Google OAuth provider in Supabase (Gmail sign-in, one click)
- [ ] Add "Sign in with Google" to the site
- [ ] Link submissions to Supabase user IDs so families can view their plan(s) when they sign back in
- [ ] Row-level security so families only see their own plans
- [ ] Enables: viewing past plans, regenerating, managing payment history
- [ ] Required for plan regeneration (tie new submission to existing account)

### Phase 8: Revenue Growth

- [ ] **Plan walkthrough upsell**: 30-minute paid meeting ($TBD) where someone walks the family through their plan, answers questions, helps prioritize. Founder-led initially, then hire college counseling students or recent grads. Scheduling via Calendly or similar.
- [ ] **Plan regeneration**: allow families to update their info (new grades, changed interests, different school list) and regenerate for ~$20. Reuse same submission ID so the plan URL stays the same.

### Phase 9: Polish
- [ ] PDF export of the full plan
- [ ] Testimonials section on homepage
- [ ] Delete old static sample files (washington-sample.html, medina-sample.html, kaplan-sample.html)

---

## Unit Economics

### Monthly Fixed Costs
| Item | Cost |
|------|------|
| Claude Max plan (for Claude Code / development) | $125/month |
| Legal docs (Termly or similar) | ~$15/month |
| Domain renewal | ~$1/month |
| Hosting (Vercel + Upstash) | Free tier until significant volume |
| **Total fixed** | **~$140/month** |

### Per-Plan API Costs (Claude Opus at $15/M input, $75/M output)

*Updated February 2026 to reflect verified school data injection (~23K tokens of CDS/Scorecard/state aid data injected into Tier 1, Tier 2, and Review prompts).*

| Pipeline Step | Input Tokens | Output Tokens | Cost |
|---------------|-------------|---------------|------|
| Tier 1 Generate (streaming) | ~27K | ~12K | ~$1.31 |
| Monte Carlo Simulation | 0 (JS, no API call) | 0 | $0 |
| Cost Reconciliation | ~15K | ~14K | ~$1.27 |
| Tier 2 Generate (streaming) | ~38K | ~12K | ~$1.47 |
| Review (12 checks) | ~55K | ~2K | ~$0.98 |
| **Base total** | **~135K** | **~40K** | **~$5.03** |

If review fails, each fix+re-review cycle adds:

| Fix Step | Input Tokens | Output Tokens | Cost |
|----------|-------------|---------------|------|
| Fix pass (find/replace JSON) | ~25K | ~1K | ~$0.45 |
| Re-review | ~30K | ~2K | ~$0.60 |
| **Per fix cycle** | **~55K** | **~3K** | **~$1.05** |

| Scenario | API Cost | Total w/ Stripe |
|----------|----------|-----------------|
| Review passes first try | ~$5.03 | ~$6.78 |
| 1 fix cycle needed | ~$6.08 | ~$7.83 |
| 2 fix cycles (max) | ~$7.13 | ~$8.88 |

### Summary
- **Revenue per plan:** $50
- **API cost per plan:** ~$5-7 (depending on review outcome; up from ~$4-6 after data injection adds ~23K input tokens)
- **Stripe fee (2.9% + $0.30):** ~$1.75
- **Total COGS per plan:** ~$7-9
- **Margin per plan:** ~$41-43 (82-86%)
- **Break-even:** ~4 plans/month
- **Upfront investment:** ~$200-400 (LLC filing, first month of subscriptions, $100 buffer)

API costs scale with volume. At 50 plans/month, API spend would be ~$200-300/month. Prepaid API credits get a small discount. The reconciliation step (~$1.27) is the most expensive non-generation call and could be optimized later if needed.

---

## Common Data Set (CDS) Integration

### Why This Matters
The prompt currently relies on Claude's training data for admission rates, financial aid, and costs. Two problems:
1. **Staleness.** Training data has a cutoff. A family paying $50 deserves current numbers.
2. **Verifiability.** "Based on Emory's 2024-2025 CDS, Section C" is more trustworthy than "based on what we know about Emory."

### What Is the CDS?
A standardized survey most U.S. colleges publish annually. Key sections for Scaffold:
- **Section C:** Admission stats (admit rate, yield, test score ranges, GPA distribution)
- **Section G:** Annual expenses (tuition, room/board, fees by residency)
- **Section H:** Financial aid (% receiving aid, average award, % of need met, net price by income bracket)

### Approach
**Option A (decided):** Pre-loaded JSON database of CDS data for 100-150 schools. Inject relevant school data into the prompt at generation time. Update annually when new CDS releases come out (typically fall/winter).

Option B (live retrieval via scraping/RAG) is a future consideration if we outgrow the pre-loaded approach.

### Data Points Per School

| Field | Source | Example (Emory) |
|-------|--------|-----------------|
| Admit rate (overall) | CDS C1 | 11.2% |
| Admit rate (ED/EA) | CDS C1 | 18.5% ED |
| Middle 50% SAT | CDS C9 | 1450-1540 |
| Middle 50% ACT | CDS C9 | 33-35 |
| Middle 50% GPA | CDS C12 | 3.8-4.0 |
| Tuition and fees (in-state if public) | CDS G1 | $59,000 |
| Room and board | CDS G1 | $17,500 |
| % of need met (average) | CDS H2 | 100% |
| Average need-based grant | CDS H2 | $54,000 |
| Net price ($0-48K income) | CDS H2/NPC | $3,200 |
| Net price ($48-75K income) | CDS H2/NPC | $5,100 |
| Net price ($75-110K income) | CDS H2/NPC | $12,400 |
| Meets full demonstrated need? | CDS H2 | Yes |
| No-loan policy? | Website | Yes (<$75K) |
| QuestBridge partner? | Website | Yes |
| Honors program? | Website | No |
| Notable programs | Website | Creative Writing MFA, forensics |

### Additional Website Data
Beyond the CDS, each school's website provides: net price calculator results, specific program pages, financial aid policies, application deadlines, diversity statistics, and scholarship eligibility criteria.

### Priority Schools for Initial Database
Start with schools appearing most frequently across generated plans, then expand:
- All state flagships (50)
- All QuestBridge partner schools (~50)
- HBCUs with >2,000 enrollment (~30)
- Top 50 liberal arts colleges

Gets to ~150 schools with some overlap.

### CDS Implementation Steps
1. Build the JSON schema for school data
2. Pull CDS data for the first 50 schools (start with schools from test plans)
3. Add a pipeline step that injects relevant school data into the prompt
4. Add citation format to the output so families can verify numbers
5. Expand to 150 schools
6. Document the annual update process

---

## Master School Reference Document

### Why This Matters
The CDS provides standardized quantitative data (admit rates, costs, aid stats). But there's a whole category of qualitative information that matters for strategy and that Claude currently pulls from training data, which may be outdated or wrong:
- Whether a school has a strong honors college (and what it's worth)
- Specific residency quirks (DC students, reciprocity agreements, WUE eligibility)
- Known scholarship programs and their typical award ranges
- Application quirks (supplements, interviews, demonstrated interest weight)
- Program-specific strengths that aren't obvious from rankings
- Financial aid policies beyond what's in the CDS (no-loan thresholds, gap policies)

### What It Contains
A curated JSON or markdown file per school with fields the CDS doesn't cover:

| Field | Example (UMD) |
|-------|---------------|
| Residency notes | DC residents are OUT-OF-STATE. DC TAG provides $10K/yr toward OOS public tuition. |
| Honors program | Honors College: separate application, ~1,500 students, priority registration, dedicated housing. Worth applying. |
| Notable merit scholarships | Banneker/Key: full ride, ~30 students/yr. Presidential: $12K/yr. |
| Demonstrated interest? | Yes, moderately weighted. Campus visit recommended. |
| Application quirks | Accepts Coalition or Common App. Short supplement. |
| Known strong programs | Engineering (Clark School), computer science, business (Smith School) |
| Financial aid notes | Does NOT meet full need. Average gap: ~$5K/yr. |
| WUE/reciprocity | N/A (not a western state) |

### Approach
- Start with schools that appear most frequently in generated plans
- Build alongside the CDS database (same schools, complementary data)
- Founder curates this manually from school websites, counselor knowledge, and Reddit/College Confidential
- Injected into the prompt alongside CDS data at generation time
- Updated annually or when significant policy changes occur

### Priority
This is part of Phase 3 (Data Quality). Build it alongside the CDS database so both quantitative and qualitative data are available at launch.

---

## Decisions Made

- **CDS citations:** Show them in the final document. Transparency builds trust, especially for first-gen families who don't know what to Google.
- **Database coverage at launch:** 100-150 schools.
- **Data injection approach:** Inject all relevant school data upfront into the prompt. No mid-generation tool use. The context window is large enough.

---

## Current Architecture

```
Landing page (index.html)
    |
    v
Intake form (intake.html) -- bypass code: Millie2026
    |
    v
=== GENERATION PIPELINE (runs once) ===

POST /api/generate        -- Tier 1 Strategy Brief via SSE (~$0.96)
    |
    v
POST /api/simulate        -- 10K Monte Carlo simulation (JS, no API cost)
    |
    v
POST /api/reconcile-costs -- Update narrative costs to match sim (~$1.27)
    |
    v
POST /api/generate-tier2  -- Tier 2 Reference Sections via SSE (~$1.13)
    |
    v
=== REVIEW + FIX LOOP (up to 2 fix attempts) ===

POST /api/review          -- 11-check quality review (~$0.60)
    |
    PASS? --> done
    FAIL? |
          v
    POST /api/fix-plan    -- Targeted find/replace fixes (~$0.45)
          |
          v
    POST /api/review      -- Re-review (~$0.60)
          |
          PASS? --> done
          FAIL? --> retry fix (max 2), then proceed with best attempt
    |
    v
POST /api/update-status   -- Mark completed or review_failed
    |
    v
Redirect to plan.html?id=<submission_id>
    |
    v
GET /api/plan             -- Load from Redis, return JSON
    |
    v
plan.html renders: sidebar nav, outline toggle, collapsible sections,
                   simulation charts, submission info

Admin: admin.html -> GET /api/submissions (code: SCAFFOLD1216)
```

**Stack:** Vercel serverless functions (Node.js), Upstash Redis, Anthropic API (Claude Opus), vanilla HTML/CSS/JS (no framework).
