# Scaffold: Project Plan

## What Scaffold Is

Scaffold is a $50 consumer product that generates personalized 20+ page college strategy documents for families. A parent fills out a form, we run their details through Claude Opus with a proprietary prompt template, and they get a full strategy doc at a unique URL: school list, developmental roadmap, financial modeling, Monte Carlo simulation, essay strategy, and more.

The mission: close the information gap in college planning. A $310K family in Naperville gets a $10K private counselor. A $48K single mom in San Antonio is Googling "how to pay for college" at midnight. Scaffold gives Family B the same data-driven planning for $50.

---

## What's Built

- **Landing page** (index.html) with 3 sample plans (Alejandra, Priya, Jake)
- **Intake form** (intake.html) with 7-step guided flow, bypass code for free access, cancel button, form state auto-save
- **Generation pipeline**: Tier 1 (Strategy Brief) -> Quality review (15 checks) -> Targeted fix pass (up to 2 attempts) -> Full regeneration if fixes fail -> Monte Carlo simulation (10,000 iterations) -> Cost/tier reconciliation -> Tier 2 (Reference Sections) -> Final review + fix
- **Cancellation**: Server-side re-checks after every Claude API call (review, fix, reconcile, simulate), client-side AbortController kills in-flight fetch requests, cancel from admin or intake page
- **Plan page** (plan.html) with sidebar navigation, collapsible sections, simulation charts, submission info
- **Admin dashboard** (admin.html) with submission management, plan viewing, simulation retry, auto-polling (5s while active)
- **Email notification**: Code in generate.js ready to send via Resend on every new submission (needs RESEND_API_KEY env var in Vercel)
- **Infrastructure**: Vercel serverless functions, Upstash Redis, Anthropic API (Claude Opus)

---

## Product Roadmap

### Phase 0: Learn Claude Code Best Practices
- [ ] Read Claude Code docs and learn effective workflows (CLAUDE.md, hooks, slash commands, MCP servers, etc.)
- [ ] Optimize CLAUDE.md with project-specific context so Claude Code is maximally effective on this codebase
- [ ] Learn prompt engineering patterns for getting the best results from Claude Code sessions

### Phase 1: Programmatic Plan Validation
*Build this BEFORE more testing. No point testing if the validation system is getting revamped.*
- [ ] **Build `validate-plan.js` module** that parses the generated output and runs these checks in code:
  - **REA/SCEA constraint:** Parse each school's `round` from the JSON sim params, cross-reference `type: "private"` from school JSONs. If any private school is EA/ED while another is REA/SCEA, auto-fix to RD.
  - **Tier consistency:** Extract tier labels from JSON params AND from markdown sections (exec summary table, school writeups, probability table). Flag any school with mismatched tiers across sections.
  - **Admit rate decimals:** Check every `admit_pct` in JSON has exactly 3 decimal places. Auto-fix by padding with zero if needed.
  - **Cost consistency:** Compare JSON `sticker_cost` against verified school data. Compare narrative cost ranges against JSON-derived net costs.
  - **No-merit school enforcement:** Verify `merit_pct=0` for schools on the no-merit list (Ivies, MIT, Stanford, Caltech, etc.).
- [ ] **Integrate into pipeline** as a step between generation and Claude review. Auto-fix what's possible, flag what needs regeneration.
- [ ] **Structured extraction for review:** Instead of asking Claude to review the whole plan in one shot, first extract specific values (school names, tiers, rounds, costs, admit rates) into structured JSON, then validate programmatically. Leave Claude review only for subjective quality (tone, strategy logic, completeness).

### Phase 2: Friends & Family Testing
- [ ] Share site with friends and collect feedback on plan quality and form UX
- [ ] Mobile test the full flow (form, generating screen, plan page) on a phone
- [ ] Collect testimonial quotes from testers for homepage
- [ ] Review generated plans for accuracy, tone, and hallucinated data
- [ ] Run 20+ test submissions covering diverse profiles (different income levels, regions, family structures, academic strengths, edge cases like DC residency, international students, divorced parents, first-gen, rural, etc.). Evaluate each plan and update prompts as needed to handle all bases.

### Phase 3: Business Setup
*Do this before taking real payments.*
- [ ] Form an LLC (state filing, ~$50-200 depending on state)
- [ ] Get an EIN from IRS (free, irs.gov, takes 5 minutes)
- [ ] Open a business bank account (keeps Stripe payouts separate from personal)
- [ ] Set up business email at scaffoldcollegestrategy.com

### Phase 4: Data Quality
*Before taking money, the numbers need to be verifiable.*
- [x] Build a JSON database of Common Data Set data for 100-150 schools — **136 schools parsed from CDS PDFs/XLSX**
- [x] Build a master school reference document with qualitative info — **108 schools with scholarships/honors/National Merit, 55 QuestBridge tags, 1,492 schools with Scorecard data**
- [x] Full quality verification of all 98 honors programs against official sources — **36 corrections applied (program names, separate_application values, avg_sat removals), 2 new programs added (William & Mary Monroe Scholars, NYU Presidential Honors Scholars)**
- [x] Build comprehensive state aid reference — **data/state-aid-programs.md covering all 50 states + DC, 17 prompt rules**
- [x] Inject school data (CDS + Scorecard + reference + state aid + financial-aid-facts) into the prompt at generation time via `src/api/school-data.js` — **~23K tokens of verified data injected per generation**
- [x] Inject verified data into Tier 2 and review pipelines — **review.js now uses verified data as ground truth (check #12)**
- [x] Deploy the data injection update to Vercel — **auto-deploy from main is working**
- [x] Run Brett Roth test submission (Boca Raton, FL, $200K, engineering, merit-focused) — **15/15 checks passed (attempt 5: 2 fixes + regen). Found two issues the reviewer missed: CWRU listed as EA despite Stanford REA (should be RD), NC State labeled Safety in one section and Target in another. Led to stricter REA/SCEA and tier consistency checks.**
- [x] Run Martinez test submission (Milwaukee, WI, $62K, first-gen, environmental science) — **stress-tested 11 improvements in one run. Multiple iterations: first run 10/15, second 12/15, third passed. Led to fixes for admit rate 3-decimal enforcement, split fabrication rule, state aid must-mention, review false positive fixes.**
- [ ] Run manual test generation with Washington family (Atlanta, GA, $72K) and verify: Georgia HOPE/Zell Miller appears with correct thresholds, UGA uses in-state tuition, no fabricated scholarship names, costs match verified data
- [ ] Run automated 20-profile batch test with CDS data live. Profiles cover: DC/PR residency edge cases, no-merit schools, tight budgets ($0-$15K), rural first-gen, athletes, arts/conservatory, DACA, divorced families (FAFSA vs CSS split), homeschool, learning disabilities, military/ROTC, CC transfers, international, legacy, LGBTQ+ culture fit. Evaluate every plan for accuracy, run full review+fix pipeline, and iterate prompts based on failure patterns.
- [ ] Regenerate homepage sample plans (Alejandra, Priya, Jake) with CDS-backed data so samples reflect the same data quality as paid plans
- [x] Add school data count to homepage — **done, updated Step 2, FAQ, pricing, and "What You Get" sections**
- [ ] Add source citations to the output ("Based on Emory CDS 2024-2025 data")
- [x] **Re-parse CDS for schools with source files:** Rochester fixed (sheet name bug), UVA and UT Austin already had good data
- [ ] **Find correct CDS for UCLA:** Current PDF is a fillable form that pdftotext can't extract. Need a non-fillable PDF or flattened export.
- [ ] **Find correct CDS for Columbia:** Current PDF is for Columbia General Studies (516 applicants), not the main Columbia College. Need the real CDS (~60K applicants, ~3-4% admit rate).
- [ ] **Download and parse CDS for missing high-priority schools:** Georgia Tech, WashU St. Louis, Florida State, Cal Poly SLO, Juilliard. Check school CDS websites or IPEDS for availability.

### Phase 4b: Data Cleanup (low priority)
*Nice-to-haves that improve coverage but aren't blockers.*
- [ ] Parse CDS for 11 missing schools (all US News 80+): Binghamton, Colorado School of Mines, Chapman, Creighton, Elon, Saint Louis, Temple, U of Missouri, BYU, U of Tennessee, Yeshiva
- [ ] Add DACA/undocumented aid, foster care tuition waivers, military/veteran education benefits, and Native American tuition waivers to state aid doc
- [ ] Fill in founder-curated reference fields still empty for most schools: demonstrated_interest, no_loan_policy, application_notes, strong_programs

### Phase 5: Legal
*Required before charging strangers.*
- [ ] Terms of Service (you're collecting sensitive financial data and info about minors)
- [ ] Privacy Policy (legally required, especially with financial/education data; COPPA may apply)
- [ ] Formal disclaimer page ("not professional counseling, no guaranteed admission or scholarship outcomes")

### Phase 6: Launch Infrastructure
*Everything needed to go from free testing to paid product.*
- [ ] Stripe integration ($50 one-time payment before form access)
- [ ] Connect Stripe to business bank account
- [ ] Custom domain (scaffoldcollegestrategy.com) for plan URLs
- [ ] DNS: point domain nameservers to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- [x] Email notification code written in generate.js — fire-and-forget via Resend API, guarded by RESEND_API_KEY env var. **Still needs: Resend account signup, API key, domain verification, add RESEND_API_KEY to Vercel env vars.**
- [ ] Email delivery of completed plan link to the family
- [ ] Open Graph meta tags (so link previews look good on iMessage, social, etc.)
- [ ] Analytics (Google Analytics or Plausible) to track traffic, form completion rate, drop-off

### Phase 6b: Data Maintenance
*Set up before scaling so data doesn't go stale while you're selling.*
- [ ] Plan the annual update process: refresh CDS data, Scorecard API data, and reference data every year when new CDS releases come out (typically fall/winter). Set a calendar reminder. Document which schools publish CDS as PDF vs Excel vs online-only.
- [ ] Document the current data pipeline (fetch scripts, parse scripts, validation) so future refreshes are repeatable

### Phase 7: Reliability & Safety
- [ ] Rate limiting on form submission (prevent spam that runs up API costs)
- [x] Error recovery: form state auto-saved to localStorage, restoreAndRetry function restores all fields on failure/cancel
- [ ] Character limits on form fields (prevent excessively long inputs that blow up token counts and cost; guide users toward concise answers)
- [ ] Graceful error handling when Claude API is down or times out: show a friendly error message with a support email to contact, and save their form data so they don't lose it
- [ ] Data retention policy (how long do plans live in Redis? backup strategy?)
- [ ] SEO basics (meta descriptions, Google Search Console)

### Phase 8: User Accounts (Supabase + Google OAuth)
- [ ] Set up Supabase project (free tier)
- [ ] Configure Google OAuth provider in Supabase (Gmail sign-in, one click)
- [ ] Add "Sign in with Google" to the site
- [ ] Link submissions to Supabase user IDs so families can view their plan(s) when they sign back in
- [ ] Row-level security so families only see their own plans
- [ ] Enables: viewing past plans, regenerating, managing payment history
- [ ] Required for plan regeneration (tie new submission to existing account)

### Phase 9: Revenue Growth

- [ ] **Plan walkthrough upsell**: 30-minute paid meeting ($TBD) where someone walks the family through their plan, answers questions, helps prioritize. Founder-led initially, then hire college counseling students or recent grads. Scheduling via Calendly or similar.
- [ ] **Plan regeneration**: allow families to update their info (new grades, changed interests, different school list) and regenerate for ~$20. Reuse same submission ID so the plan URL stays the same.
- [ ] **Contact Anthropic sales about enterprise/volume pricing.** Once plan volume justifies it, reach out to negotiate rates. They have a Scale tier with direct sales team for higher-volume API usage.

### Phase 10: Output Enhancements
- [ ] **4-year cost projection table:** For each school, show a year-by-year cost estimate that accounts for tuition inflation (~3-5%/year), potential in-state residency establishment for OOS public schools (year 2 or 3 switch to in-state rates where allowed), and sibling overlap (multiple kids in college simultaneously reduces EFC/SAI, increasing need-based aid). This gives families the full picture, not just year-1 sticker shock.
- [ ] PDF export of the full plan

### Phase 11: Polish
- [ ] Write founder bio and add to website (landing page "About" section or footer)
- [ ] Testimonials section on homepage
- [ ] Delete old static sample files (washington-sample.html, medina-sample.html, kaplan-sample.html)
- [ ] Admin dashboard: show review history in status column (e.g., "Fail → Fix → Pass" or "Fail x2 → Pass") instead of just final status. Store review attempt count and per-attempt results in Redis so admin can see the full pipeline journey.
- [ ] Admin dashboard: make review JSON viewable per submission (currently stored in Redis but not returned by the submission API endpoint)
- [ ] Admin dashboard: verify all pipeline status stages display correctly (generating, tier1_complete, simulating, reconciling, generating_tier2, completed, reviewing, review_failed, etc.)

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

*Updated February 2026. Reflects verified school data injection (~23K tokens per call), new pipeline order (review before simulation), and two reviews in the base path (T1 review + final review).*

**Base path** (both reviews pass first try):

| Pipeline Step | Input Tokens | Output Tokens | Cost |
|---------------|-------------|---------------|------|
| Tier 1 Generate (streaming) | ~30K | ~12K | ~$1.35 |
| T1 Review (15 checks) | ~46K | ~2K | ~$0.84 |
| Monte Carlo Simulation | 0 (JS, no API call) | 0 | $0 |
| Cost/Tier Reconciliation | ~15K | ~14K | ~$1.28 |
| Tier 2 Generate (streaming) | ~31K | ~12K | ~$1.37 |
| Final Review (15 checks) | ~46K | ~2K | ~$0.84 |
| **Base total** | **~168K** | **~42K** | **~$5.68** |

**If T1 review fails**, each fix+re-review cycle adds:

| Fix Step | Input Tokens | Output Tokens | Cost |
|----------|-------------|---------------|------|
| Fix pass (find/replace JSON) | ~25K | ~1K | ~$0.45 |
| Re-review | ~46K | ~2K | ~$0.84 |
| **Per fix cycle** | **~71K** | **~3K** | **~$1.29** |

**If fixes fail**, full regeneration adds:

| Regen Step | Input Tokens | Output Tokens | Cost |
|------------|-------------|---------------|------|
| Regenerate (full buildPrompt + feedback) | ~30K | ~12K | ~$1.35 |
| Post-regen review | ~46K | ~2K | ~$0.84 |
| **Per regen** | **~76K** | **~14K** | **~$2.19** |

| Scenario | API Cost | + Stripe | Total COGS |
|----------|----------|----------|------------|
| Both reviews pass | ~$5.68 | ~$1.75 | ~$7.43 |
| 1 T1 fix cycle | ~$6.97 | ~$1.75 | ~$8.72 |
| 2 T1 fix cycles | ~$8.26 | ~$1.75 | ~$10.01 |
| 2 fixes + regen | ~$10.45 | ~$1.75 | ~$12.20 |
| Worst case (regen + final fix) | ~$11.74 | ~$1.75 | ~$13.49 |

### Summary
- **Revenue per plan:** $50
- **API cost per plan:** ~$6-8 typical, ~$12 worst case
- **Stripe fee (2.9% + $0.30):** ~$1.75
- **Total COGS per plan:** ~$7-10 typical, ~$13.50 worst case
- **Margin per plan:** ~$37-43 (74-86%)
- **Break-even:** ~4 plans/month
- **Upfront investment:** ~$200-400 (LLC filing, first month of subscriptions, $100 buffer)

API costs scale with volume. At 50 plans/month, API spend would be ~$300-400/month. Prepaid API credits get a small discount. As prompt quality improves, the fix/regen rate should drop, keeping most plans on the base path (~$5.68).

**Volume pricing:** If using the API at a larger scale, Anthropic has an enterprise/Scale tier where you work directly with their sales team, and that's likely where volume pricing or negotiated rates would come into play. Worth contacting them once volume justifies it.

---

## School Data (Built)

### What's Done
- **136 schools** parsed from CDS 2024-25 PDFs/XLSX via `scripts/parse-cds.js` (Claude API extraction)
- **1,492 schools** with College Scorecard data (costs, grad rates, earnings)
- **108 schools** with curated reference data (scholarships, honors programs, National Merit)
- **55 schools** tagged as QuestBridge partners
- **98 honors programs** verified against official sources
- **All 50 states + DC** with state aid programs in `data/state-aid-programs.md`
- **Financial aid reference** in `data/financial-aid-facts.md` (no-merit schools, full-need, CSS vs FAFSA, QuestBridge, gapping)
- All data injected into generation prompt via `src/lib/school-data.js` (~23K tokens per call)

### CDS Data Per School
Sections C (admissions), G (costs), H (financial aid) from Common Data Set. Fields include: admit rate overall/ED/EA, middle 50% SAT/ACT/GPA, tuition (in-state/out-of-state/private), room and board, % need met, average need-based grant, net price by income bracket.

### Remaining Data Gaps
- UCLA: CDS PDF is fillable form, pdftotext can't extract values
- Columbia: PDF is for General Studies, not main college
- Missing CDS: Georgia Tech, WashU, FSU, Cal Poly SLO, Juilliard
- 11 lower-priority schools still missing (Binghamton, Colorado School of Mines, etc.)
- Founder-curated fields mostly empty: demonstrated_interest, no_loan_policy, application_notes, strong_programs

---

## Prompt Improvements Log

*Iterative fixes based on test submissions. All changes are in generate.js (generation prompt self-checks) and review.js (15-check reviewer).*

- **Admit rate 3-decimal enforcement:** Explicit padding examples (45.1% = 0.451, 11.0% = 0.110). #1 reason plans failed review.
- **Split fabrication rule:** Strict for scholarship names/amounts (must match verified data verbatim). Relaxed for academic programs/colleges/institutes (Claude can reference well-known programs from its knowledge).
- **State aid must-mention:** If verified data includes state aid programs for this family's state, the plan MUST mention them by name.
- **Standard risk ratings only:** Only "Very Low / Low / Moderate / High / Very High" allowed. No custom labels like "Over Budget."
- **Dagger footnote:** Changed REA footnote from superscript numbers (barely visible) to dagger symbol with terra color CSS.
- **Budget flexibility with strong safety:** If a strong financial safety exists (well under budget, high admit probability), over-budget reaches are acceptable. Don't force 60% under budget when UF at $16K is the floor.
- **REA/SCEA explicit private school list:** Self-check and review now list common private schools by name (MIT, Case Western, USC, NYU, etc.) that must be RD when REA/SCEA is used. No rationalizations like "acceptable if REA is not pursued."
- **Tier consistency self-check:** Every school must have the same tier label (Reach/Target/Safety) across all sections. Review now checks this before cost consistency.
- **Vague radar school handling:** If family says "Ivies" or "UCs," asterisk every school on the list that belongs to that group.
- **Review false positive fixes:** Admit rate check no longer self-contradicts on minor prose variations. Verified data check scoped to admit rates and costs only (programs don't trigger failure). Budget alignment flexible with strong safety.
- **Badge rendering fix:** Catch-all CSS class matching "high"/"low" substrings in full sentences replaced with strict regex for short risk-label text only.
- **CDS null cost fallback:** Schools with CDS admission data but null cost fields fall back to Scorecard costs instead of showing null.

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
=== GENERATION PIPELINE ===

POST /api/generate        -- Tier 1 Strategy Brief via SSE
    |
    v
=== REVIEW + FIX LOOP (review BEFORE simulation) ===

POST /api/review          -- 15-check quality review
    |
    PASS? --> continue to simulation
    FAIL? |
          v
    POST /api/fix-plan    -- Targeted find/replace fixes (up to 2 attempts)
          |
          v
    POST /api/review      -- Re-review
          |
          PASS? --> continue to simulation
          FAIL? |
                v
          POST /api/regenerate  -- Full regen using same buildPrompt + review feedback
                |
                v
          POST /api/review      -- Review regenerated output
    |
    v
=== SIMULATION (runs ONCE on final verified school list) ===

POST /api/simulate        -- 10K Monte Carlo simulation (JS, no API cost)
    |
    v
POST /api/reconcile-costs -- Update costs + tier labels to match sim
    |
    v
POST /api/generate-tier2  -- Tier 2 Reference Sections via SSE
    |
    v
=== FINAL REVIEW + FIX ===

POST /api/review          -- Final quality check on complete doc
    |
    PASS? --> done
    FAIL? --> one fix attempt, then proceed with best version
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
