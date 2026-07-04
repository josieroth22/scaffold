# Scaffold: Project Plan

## What Scaffold Is

Scaffold is a $50 consumer product that generates personalized 20+ page college strategy documents for families. A parent fills out a form, we run their details through Claude (Fable 5) with verified school data injected, and they get a full strategy doc at a unique URL: school list, developmental roadmap, financial modeling, Monte Carlo simulation, essay strategy, and more.

The mission: close the information gap in college planning. A $310K family in Naperville gets a $10K private counselor. A $48K single mom in San Antonio is Googling "how to pay for college" at midnight. Scaffold gives Family B the same data-driven planning for $50.

---

## What's Built

**Product**
- Landing page (index.html) with 3 sample plans (Alejandra, Priya, Jake)
- Intake form (intake.html): 7-step guided flow, bypass code for free access, cancel button, form state auto-saved to localStorage with `restoreAndRetry` on failure/cancel
- Plan renderer (plan.html): sidebar navigation, collapsible sections, simulation charts, submission info
- Admin dashboard (admin.html): submission management, plan viewing, simulation retry, auto-polling (5s while active)

**Pipeline**
- Tier 1 generation (SSE streaming)
- 15-check quality review
- Targeted fix pass (up to 2 attempts)
- Full regeneration fallback if fixes don't pass
- Monte Carlo simulation (10K iterations, JS, no API cost)
- Cost/tier reconciliation against sim results
- Tier 2 generation (SSE streaming)
- Final review + one fix attempt
- All steps re-check Redis status for cancellation after Claude API call returns

**Cancellation**
- Server-side: every endpoint re-checks Redis status after Claude API call completes; returns early if "cancelled"
- Client-side: AbortController on all pipeline fetch calls; cancel button on intake page; cancel from admin

**Data**
- 136 schools with CDS 2024-25 data (admit rates, costs, aid stats, test scores) parsed via `scripts/parse-cds.js`
- 1,492 schools with College Scorecard data (costs, grad rates, earnings)
- 108 schools with curated reference data (scholarships, honors programs, National Merit)
- 55 QuestBridge partners
- 98 honors programs verified against official sources (36 corrections applied; W&M Monroe Scholars and NYU Presidential Honors Scholars added)
- All 50 states + DC state aid in `data/state-aid-programs.md` (17 prompt rules)
- Financial aid reference in `data/financial-aid-facts.md` (no-merit schools, full-need, CSS vs FAFSA, QuestBridge, gapping)
- All injected into generation prompt via `src/lib/school-data.js` (~23K tokens per call)
- Review.js uses verified data as ground truth (check #12)

**Infrastructure**
- Vercel serverless (Node.js), Upstash Redis, Anthropic API (Claude Fable 5), vanilla HTML/CSS/JS
- Auto-deploy from main working
- Email notification code written in generate.js: fire-and-forget via Resend, guarded by RESEND_API_KEY. Still needs: Resend account, API key, domain verification, env var in Vercel.

---

## Roadmap

**Current focus (June 2026): content quality over monetization.** A high-stakes external test is coming (CRO's daughter will run a real plan), so the priority is proving plan quality end to end. Legal, business setup, and Stripe (items 4-6) are deferred until quality is proven.

### Phase 0: Fable 5 Migration — DONE (June 2026)

*claude-opus-4-20250514 was deprecated with a June 15, 2026 retirement date. Migrated all API calls to Claude Fable 5 (`claude-fable-5`, $10/M input, $50/M output, down from $15/$75).*

- [x] Swap model in `src/lib/config.js` and both parse scripts
- [x] Remove `temperature` from all 6 endpoints (Fable 5 returns 400 if sent)
- [x] Enable adaptive thinking on generation, regeneration, and review calls; raise `max_tokens` for thinking headroom (thinking tokens count toward the cap)
- [x] Fix review.js text extraction (with thinking enabled, `content[0]` may be a thinking block)
- [ ] **Re-baseline:** rerun Brett Roth and Martinez profiles end to end. Verify the 15 review checks calibrate correctly on Fable 5, confirm SSE streaming and the fix/regen loop behave, and measure actual token usage (Fable counts tokens differently, and thinking adds billed output tokens)
- [x] Re-tune prompts for Fable 5 instruction-following — done as part of item 2 below (June 2026)

### Pre-launch (do before taking payments)

#### 1. Programmatic Plan Validation
*Highest ROI. Catches bugs the Claude reviewer misses and reduces fix/regen API cost. Build this before more testing — no point testing if the validation system is getting revamped.*

- [x] Build `validate-plan.js` module (`src/lib/validate-plan.js`) — **done June 2026.** Checks in code:
  - **REA/SCEA constraint:** Parses `round` from JSON sim params, cross-references `type: "private"` from school JSONs (fallback: static private-school list). Violations are flagged for the fix loop (narrative + JSON corrected together).
  - **Tier consistency:** Compares JSON tier against tier labels in markdown table rows. Mismatches flagged with evidence lines.
  - **Admit rate decimals:** Auto-fixes `admit_pct` to exactly 3 decimals via string surgery on the JSON block.
  - **Cost consistency:** Compares JSON `sticker_cost` against verified CDS/Scorecard data with residency awareness (catches wrong in-state/out-of-state rate, e.g. the DC-at-UMD case). Compares JSON-derived net cost against the exec summary table within $3K.
  - **No-merit school enforcement:** Auto-zeroes merit fields in JSON for need-only schools.
  - Test fixture: `scripts/test-validate-plan.js` (covers all checks + edge cases, including the two Brett Roth bugs the reviewer originally missed).
- [x] Integrate into pipeline — **done June 2026.** Runs as a pre-pass inside review.js (covers all four review call sites with no client changes). Auto-fixes are persisted to Redis; flags are injected into the review prompt as ground truth, and code force-fails the matching checks even if the model reviewer disagrees, so fix-plan always receives the specifics.
- [ ] Structured extraction for review: extract school names, tiers, rounds, costs into structured JSON first, validate programmatically, and leave Claude review only subjective quality. (Partially covered now: validator findings are structured; full extraction still open.)
- [ ] Skip the fix loop when the validator raises a regen-severity flag (missing/unparseable JSON params block): find/replace cannot fix an absent block, so intake.html should jump straight to /api/regenerate. Saves ~4 min and ~$2 per occurrence (observed in the first live Fable run).

#### 2. Prompt Consolidation + Fable 5 Re-tune
*The generation and review prompts have 12+ patches layered from iterative testing, all written against the old Opus model. Fable 5 follows instructions more literally, so this cleanup doubles as the model re-tune.*
- [x] Consolidate redundant instructions in generate.js prompt — **done June 2026.** Each rule now stated once: the 14-item self-check became a 12-item compact reference list, decimal examples cut from 11 to 3, REA/SCEA private-school list stated once, budget rules merged into one directive. ~1K tokens saved per generation.
- [x] Soften aggressive instruction language — **done June 2026.** Removed "This is not negotiable", "CRITICAL:", "right now", "Period." framing; rules stay firm but stated once.
- [x] Consolidate review.js checks — **done June 2026.** Checks 1-3 and 13 rewritten to lean on programmatic validator findings (code owns JSON-level verification; reviewer owns prose and judgment). All 15 check keys unchanged (fix-plan and client depend on them).
- [x] Reduce token count where possible (~1K tokens per generation call; review prompt also slimmer)
- [ ] Review all other code and docs for staleness

#### 3. Testing
- [ ] **Website + intake form copy pass:** read index.html, intake.html (all form steps, helper text, placeholders, generating-screen messages), and plan.html with an eye to detail and sounding human (no em dashes, no AI-sounding phrasing). Includes adding a "Reading your family's details..." style status during Fable's silent thinking period at the start of generation. Do before any external eyes.
- [ ] **UptimeRobot on /api/keep-alive** (free, 5 min setup): pings every 5 minutes, which keeps Redis active and emails on failure. The June 2026 outage went unnoticed because the Vercel cron failed silently. Do before external testers.
- [ ] **CRO's daughter test prep:** before sharing the link, run a dry-run profile that matches her situation as closely as possible (grade level, region, income band, academic interests) and review that plan line by line. This is a reference customer and a referral source, treat it like a launch.
- [ ] Share site with friends and collect feedback on plan quality and form UX
- [ ] Mobile test the full flow (form, generating screen, plan page) on a phone
- [ ] Collect testimonial quotes from testers for homepage
- [ ] Review generated plans for accuracy, tone, and hallucinated data
- [ ] Run Washington family test (Atlanta GA, $72K): verify Georgia HOPE/Zell Miller with correct thresholds, UGA in-state tuition, no fabricated scholarship names, costs match verified data
- [ ] Run 20+ test submissions covering diverse profiles (see Phase 7 for full edge case list)

#### 4. Legal
*Required before charging strangers. Deferred while the focus is content quality.*
- [ ] Terms of Service (collecting sensitive financial data and info about minors)
- [ ] Privacy Policy (legally required, especially with financial/education data; COPPA may apply). Must commit to a data deletion process for GDPR/CCPA requests.
- [ ] Formal disclaimer page. Termly's templates won't cover product-specific risks — add language for:
  - No guarantee of admission outcomes
  - No guarantee of scholarship/aid amounts (lawsuit risk: families act on cost projections)
  - Not a substitute for professional financial planning or legal advice (especially for divorced families)
  - Data accuracy disclaimer (CDS data is as-reported by schools)
- [ ] **Refund policy** (critical for a $50 product — protects against Stripe disputes and builds trust)
  - Decisions to make: money-back guarantee window (7 or 14 days?), conditions (full vs partial, satisfaction vs technical failure?)
  - Recommended: full refund if plan didn't generate; full refund within 7 days if unsatisfied
  - Lives on: FAQ, checkout page, ToS, post-purchase email
- [ ] **Data deletion workflow:** documented process for fulfilling deletion requests. Even a simple admin button to delete a submission's Redis keys works for v1.

#### 5. Business Setup
- [ ] Form an LLC (state filing, ~$50-200 depending on state). Delaware/Wyoming are fast (1-2 days); California is slow (1-2 weeks).
- [ ] Get an EIN from IRS (free, irs.gov, 5 minutes)
- [ ] Open business bank account (keeps Stripe payouts separate from personal)
- [ ] Set up business email at scaffoldcollegestrategy.com (Google Workspace)
- [ ] **Sales tax handling:** Enable Stripe Tax (~0.5% fee) to handle registration, calculation, and remittance. Digital products are taxed in ~20 states (WA, TX, PA, etc.). Without this, you're personally liable for uncollected sales tax in states that require it.

#### 6. Launch Infrastructure
*Everything needed to go from free testing to paid product. Deferred while the focus is content quality.*
- [ ] Stripe integration ($50 one-time payment before form access)
- [ ] Connect Stripe to business bank account
- [ ] Custom domain (scaffoldcollegestrategy.com) for plan URLs
- [ ] DNS: point domain nameservers to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com). **apex domain works (July 4); www.scaffoldcollegestrategy.com does not resolve — add www in Vercel → Domains with a redirect to apex**
- [ ] Resend setup: account signup, API key, domain verification, add RESEND_API_KEY to Vercel env vars
- [ ] **Post-purchase confirmation email** sent immediately after Stripe payment (before plan completion):
  - Receipt (Stripe handles automatically)
  - Order confirmation with realistic time expectation ("Your plan will be ready in ~5 minutes")
  - Support email contact if they don't receive the plan
  - *Currently the email only fires when generation completes — the gap between payment and delivery is anxiety territory*
- [ ] Email delivery of completed plan link to the family
- [ ] **Customer support email:** set up support@scaffoldcollegestrategy.com (forwarder to inbox initially). Add visibly to footer, FAQ, post-purchase email. Decide response SLA (recommended: same-day during week, 24h weekend).
- [ ] **First-week support playbook:** what to do when generation fails after payment (manual retry? auto-refund? apology email?). Document the process now, not when the first complaint comes in.
- [ ] **Plan URL security audit:** verify submission IDs are cryptographically random UUIDs, not sequential or guessable. Every plan contains income, family details, kids' names — enumerable URLs would be a privacy disaster.
- [ ] **"Generated on [date]" in plan template:** prominent date on every plan + note that data ages ("Reflects data current as of [date]. Regenerate for updated info."). Sets up the $20 regeneration upsell narrative.
- [ ] **Monitoring + failure alerts:**
  - Email yourself when a generation fails after payment (worst customer scenario — they paid and got nothing)
  - UptimeRobot free tier pings homepage every 5 min
  - Enable Vercel's built-in alerts for function errors
- [ ] Open Graph meta tags (so link previews look good on iMessage, social, etc.)
- [ ] Analytics (Plausible recommended — simpler, privacy-respecting, ~$9/mo): traffic, form completion rate, drop-off

### Post-launch

#### 7. Data Quality & Diverse Testing
- [ ] Run automated 20-profile batch test with CDS data live. Profiles must cover: DC/PR residency edge cases, no-merit schools, tight budgets ($0-$15K), rural first-gen, athletes, arts/conservatory, DACA, divorced families (FAFSA vs CSS split), homeschool, learning disabilities, military/ROTC, CC transfers, international, legacy, LGBTQ+ culture fit. Evaluate every plan, run full review+fix pipeline, iterate prompts based on failure patterns.
- [ ] Regenerate homepage sample plans (Alejandra, Priya, Jake) with CDS-backed data so samples reflect paid plan quality
- [ ] Add source citations to output ("Based on Emory CDS 2024-2025 data")
- [ ] Find correct CDS for UCLA (current PDF is fillable form, pdftotext can't extract; need non-fillable PDF or flattened export)
- [ ] Find correct CDS for Columbia (current PDF is Columbia General Studies, 516 applicants; need real Columbia College CDS, ~60K applicants, ~3-4% admit rate)
- [ ] Download and parse CDS for missing high-priority schools: Georgia Tech, WashU St. Louis, Florida State, Cal Poly SLO, Juilliard. Check school CDS websites or IPEDS for availability.
- [ ] YouTube college prep channel research: find channels with college prep advice (admissions strategy, financial aid, essay tips, school selection). Summarize key recommendations. Identify common themes or gaps Scaffold's plans should address.

#### 7b. Pipeline v2 (post-demo reliability project)
*Findings from the June-July 2026 Fable re-baseline. The two small items are safe pre-demo; the structural ones wait until after July 13. Do before Stripe turns on — these are the "customer paid and got nothing/got a flawed plan" risks.*

**Small, safe pre-demo:**
- [ ] Regen fast-path: skip the two doomed fix attempts when the validator raises a regen-severity flag (also listed under item 1; ~$1.50 and ~4 min saved per occurrence)
- [ ] Honest completion status + alert: the pipeline currently marks plans "completed" even when the final review failed (observed live: completed with FAIL review). Add a distinct status and email Josie whenever a plan ships with a failing review.

**Structural, post-demo:**
- [ ] **Severity-aware escalation ladder.** All failures currently walk the same patch-patch-regen ladder. Branch on failure shape: unfixable-by-patch (missing JSON block) jumps straight to regen; 5+ failed checks (systemic) skips patches; 1-3 surgical findings patch as today.
- [ ] **Tier 2 re-run rung.** The final review's only remedy is one patch. If the failure is in Tier 2 content, re-run just generate-tier2 once instead of shipping flawed reference sections (T1, sim, and reconcile stay intact).
- [ ] **Auto re-simulate when params change after the sim ran.** The simulation is free (JS); whenever a fix or validator auto-correction touches the JSON params post-simulation, re-run it automatically instead of letting the review flag stale sim results (observed July 4: corrected sticker left a params-vs-sim mismatch only a manual re-simulate could clear).
- [ ] **Server-side orchestration.** The customer's browser tab drives all nine pipeline calls; closing the laptop mid-run kills the plan with no resume. Move orchestration server-side (or add resume-from-Redis-state) and add "we'll email you when it's ready." Biggest single reliability gap before taking payments.
- [ ] **Structured outputs for sim params.** Both dead re-baseline runs failed by omitting/truncating the JSON block — asking a model to end a 5,000-word document with perfect JSON is fragile by design. Split Tier 1: narrative call, then a small extraction call using output_config json_schema to produce the params from the finished narrative (guaranteed-valid JSON, schema-enforced fields, ~$0.40/plan). Eliminates the validator's worst-case class entirely.
- [ ] **Deterministic reconciliation.** reconcile-costs is an LLM find/replace over the whole document and is known to corrupt the params block (review.js carries a warning for it). With structured params, reconciliation becomes mostly code, with the LLM touching only narrative sentences.

#### 8. Reliability & Safety
- [ ] Rate limiting on form submission (prevent spam that runs up API costs)
- [ ] Character limits on form fields (prevent excessively long inputs that blow up token counts; guide users toward concise answers)
- [ ] Graceful error handling when Claude API is down or times out: friendly error message with support email, save form data so it isn't lost
- [ ] **Durable plan backup beyond Redis.** Upstash is not archival storage. A family who paid $50 in March and returns in November expects their plan to still exist. Options: nightly backup of completed plans to S3/Vercel Blob, or write a copy to secondary store on completion. Becomes more urgent as volume grows.
- [ ] Data retention policy (how long do plans live in Redis? what's the public commitment in Privacy Policy?)
- [ ] **Bypass code lifecycle:** decide what to do with `Millie2026`. Keep for friends/family? Rotate periodically? Monitor admin for suspicious volume in case it leaks on Reddit. Consider per-person codes for higher-volume sharing.
- [ ] SEO basics (meta descriptions, Google Search Console)

#### 9. User Accounts (Supabase + Google OAuth)
- [ ] Set up Supabase project (free tier)
- [ ] Configure Google OAuth provider (Gmail sign-in, one click)
- [ ] Add "Sign in with Google" to the site
- [ ] Link submissions to Supabase user IDs so families can view their plan(s) when they sign back in
- [ ] Row-level security so families only see their own plans
- [ ] Enables viewing past plans, regenerating, managing payment history
- [ ] Required for plan regeneration (tie new submission to existing account)

#### 10. Distribution & Revenue Growth
*A working product with no traffic is an expensive hobby. Distribution is the Day 11 priority.*

**Distribution (how do customers find Scaffold?)**
- [ ] Reddit presence: r/ApplyingToCollege, r/financialaid, r/Parenting. Be careful — these communities are hostile to self-promo. Lead with helpful answers, link only when directly relevant.
- [ ] Facebook groups for parents of high schoolers (state-specific college planning groups exist)
- [ ] Independent college counselor outreach: they might refer families they can't afford to take on
- [ ] High school PTA newsletters (especially in lower-income districts that match the mission)
- [ ] SEO content: blog posts on "how to read a CDS," "what is QuestBridge," "state aid in X" — long-tail organic search

**Pricing**
- [ ] **Validate $50 pricing.** Could be too low (parents who pay $200/hr for tutoring would happily pay $99) or too high (single moms in San Antonio — the stated target — might balk at $50). A/B test post-launch with a price experiment.

**Upsells**
- [ ] **Plan walkthrough upsell:** 30-minute paid meeting ($TBD) where someone walks the family through their plan, answers questions, helps prioritize. Founder-led initially, then hire college counseling students or recent grads. Scheduling via Calendly or similar.
- [ ] **Plan regeneration:** allow families to update their info (new grades, changed interests, different school list) and regenerate for ~$20. Reuse same submission ID so the plan URL stays the same. The "Generated on [date]" note creates natural demand.

**Cost optimization**
- [ ] **Contact Anthropic sales about enterprise/volume pricing** once volume justifies it. They have a Scale tier with direct sales team for higher-volume API usage.

#### 11. Output Enhancements
- [ ] **4-year cost projection table:** For each school, show year-by-year cost estimate accounting for tuition inflation (~3-5%/year), potential in-state residency establishment for OOS public schools (year 2 or 3 switch to in-state rates where allowed), and sibling overlap (multiple kids in college simultaneously reduces EFC/SAI, increasing need-based aid). Full picture, not just year-1 sticker shock.
- [ ] PDF export of the full plan

#### 11b. Admin Portal Revamp (post-Fable-5 pipeline)
*The June 2026 changes (validator, adaptive thinking, fix/regen flow) outgrew the current admin. Partially done: pipeline legend and a validator findings section in the review tab shipped June 12.*
- [ ] Capture per-call usage (input/output/thinking tokens) and stop_reason into Redis from every pipeline step; show per-submission cost and a truncation warning in admin. A 32K-cap truncation on the first Fable run was only discoverable by reading the document tail; stop_reason would have made it a one-glance diagnosis.
- [ ] Show validator activity in the submissions list (auto-fix/flag count badges), not just the detail tab
- [ ] Review history entries should include validator findings per attempt
- [ ] Verify stage display covers all statuses (fixing, regenerating, with attempt counts)

#### 12. Polish
- [ ] Write founder bio and add to website (landing page "About" section or footer)
- [ ] Testimonials section on homepage
- [ ] Delete old static sample files (washington-sample.html, medina-sample.html, kaplan-sample.html)
- [ ] Admin dashboard: show review history in status column (e.g., "Fail → Fix → Pass" or "Fail x2 → Pass") instead of just final status. Store review attempt count and per-attempt results in Redis so admin can see the full pipeline journey.
- [ ] Admin dashboard: make review JSON viewable per submission (currently stored in Redis but not returned by the submission API endpoint)
- [ ] Admin dashboard: verify all pipeline status stages display correctly (generating, tier1_complete, simulating, reconciling, generating_tier2, completed, reviewing, review_failed, etc.)

### Low Priority

#### Data Cleanup
*Nice-to-haves that improve coverage but aren't blockers.*
- [ ] Parse CDS for 11 missing schools (all US News 80+): Binghamton, Colorado School of Mines, Chapman, Creighton, Elon, Saint Louis, Temple, U of Missouri, BYU, U of Tennessee, Yeshiva
- [ ] Add DACA/undocumented aid, foster care tuition waivers, military/veteran education benefits, and Native American tuition waivers to state aid doc
- [ ] Fill in founder-curated reference fields still empty for most schools: demonstrated_interest, no_loan_policy, application_notes, strong_programs

#### Data Maintenance
*Set up before scaling so data doesn't go stale.*
- [ ] **CDS refresh cadence:** Each school publishes its own CDS, mostly **October-December** of the year following the admissions cycle (so 2024-25 CDS lands Oct-Dec 2025). Top-ranked schools publish earlier (US News needs them for September rankings); stragglers push into Q1. Section H (financial aid) often lags Section C (admissions).
  - **Primary refresh sprint: mid-January** — catches most schools while data is fresh
  - **Secondary sweep: April-May** — picks up late publishers
  - Set calendar reminders for both
- [ ] Refresh Scorecard API data annually (typically updates in fall with prior-year data)
- [ ] Document which schools publish CDS as PDF vs Excel vs online-only (affects parse-cds.js workflow)
- [ ] Document the current data pipeline (fetch scripts, parse scripts, validation) so future refreshes are repeatable

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

### Per-Plan API Costs (Claude Fable 5 at $10/M input, $50/M output)

*Updated June 2026 for the Fable 5 migration. Both rates dropped to 2/3 of old Opus pricing ($15/$75), so all costs below scale by 2/3. Token estimates carry over from the February 2026 baseline and need re-measuring: Fable counts tokens differently, and adaptive thinking adds billed output tokens on generation and review calls. Treat these as floors until the re-baseline test runs.*

**Base path** (both reviews pass first try):

| Pipeline Step | Input Tokens | Output Tokens | Cost |
|---------------|-------------|---------------|------|
| Tier 1 Generate (streaming) | ~30K | ~12K | ~$0.90 |
| T1 Review (15 checks) | ~46K | ~2K | ~$0.56 |
| Monte Carlo Simulation | 0 (JS, no API call) | 0 | $0 |
| Cost/Tier Reconciliation | ~15K | ~14K | ~$0.85 |
| Tier 2 Generate (streaming) | ~31K | ~12K | ~$0.91 |
| Final Review (15 checks) | ~46K | ~2K | ~$0.56 |
| **Base total** | **~168K** | **~42K** | **~$3.78** |

**If T1 review fails**, each fix+re-review cycle adds:

| Fix Step | Input Tokens | Output Tokens | Cost |
|----------|-------------|---------------|------|
| Fix pass (find/replace JSON) | ~25K | ~1K | ~$0.30 |
| Re-review | ~46K | ~2K | ~$0.56 |
| **Per fix cycle** | **~71K** | **~3K** | **~$0.86** |

**If fixes fail**, full regeneration adds:

| Regen Step | Input Tokens | Output Tokens | Cost |
|------------|-------------|---------------|------|
| Regenerate (full buildPrompt + feedback) | ~30K | ~12K | ~$0.90 |
| Post-regen review | ~46K | ~2K | ~$0.56 |
| **Per regen** | **~76K** | **~14K** | **~$1.46** |

### Per-Plan Totals

| Scenario | API Cost | + Stripe ($1.75) | Total COGS |
|----------|----------|-------------------|------------|
| Both reviews pass | ~$3.78 | ~$1.75 | ~$5.53 |
| 1 T1 fix cycle | ~$4.64 | ~$1.75 | ~$6.39 |
| 2 T1 fix cycles | ~$5.50 | ~$1.75 | ~$7.25 |
| 2 fixes + regen | ~$6.96 | ~$1.75 | ~$8.71 |
| Worst case (regen + final fix) | ~$7.82 | ~$1.75 | ~$9.57 |

### Summary (updated with July 4, 2026 measured runs)

*Four complete plans generated July 4 (Brett, Sofia, Priya, Jake). Observed pattern: single-submission passes with 0-3 fix cycles, no regenerations. Documents measured at ~30-35K chars (T1) + ~31-40K chars (T2); adaptive thinking adds roughly 15-25K billed output tokens per generation call and 5-8K per review, which the original 2/3-scaled table above understates. Exact per-call token counts still require the Anthropic console until admin usage capture ships (roadmap 11b).*

- **Revenue per plan:** $50
- **API cost per plan (measured band):** ~$6 (clean run, e.g. Priya) to ~$9 (multi-fix run, e.g. Sofia); call it **~$7.50 typical**
- **Stripe fee (2.9% + $0.30):** ~$1.75
- **Total COGS per plan:** ~$8-11
- **Margin per plan:** ~$39-42 (78-84%)
- **Break-even:** ~4 plans/month
- **Upfront investment:** ~$200-400 (LLC filing, first month of subscriptions, $100 buffer)

API costs scale with volume. At 50 plans/month, API spend would be ~$200-275/month. Prepaid API credits get a small discount. As prompt quality improves, the fix/regen rate should drop, keeping most plans on the base path (~$3.78). If Fable 5 quality reduces the fix/regen rate (better instruction following should mean fewer review failures), the typical case moves toward the base path.

**Volume pricing:** If using the API at larger scale, Anthropic has an enterprise/Scale tier where you work directly with their sales team — likely where volume pricing or negotiated rates come in. Worth contacting once volume justifies it.

---

## School Data Reference

### CDS Data Per School
Sections C (admissions), G (costs), H (financial aid) from the Common Data Set. Fields include: admit rate overall/ED/EA, middle 50% SAT/ACT/GPA, tuition (in-state/out-of-state/private), room and board, % need met, average need-based grant, net price by income bracket.

### Remaining Data Gaps
- **UCLA:** CDS PDF is fillable form, pdftotext can't extract values
- **Columbia:** PDF is for General Studies, not main college
- **Missing CDS:** Georgia Tech, WashU, FSU, Cal Poly SLO, Juilliard
- **11 lower-priority schools** still missing (Binghamton, Colorado School of Mines, etc.)
- **Founder-curated fields mostly empty** for most schools: demonstrated_interest, no_loan_policy, application_notes, strong_programs

---

## Prompt Engineering Log

*Iterative fixes from test submissions. All changes are in generate.js (self-checks) and review.js (15-check reviewer).*

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

## Test Results

**Brett Roth** — Boca Raton FL, $200K, engineering, merit-focused
- Result: 15/15 passed on attempt 5 (2 fixes + regen)
- Found two issues the reviewer missed: CWRU listed as EA despite Stanford REA (should be RD); NC State labeled Safety in one section and Target in another
- Led to: stricter REA/SCEA constraints, tier consistency checks

**Martinez** — Milwaukee WI, $62K, first-gen, environmental science
- Result: passed after 3 iterations (first run 10/15, second 12/15, third passed)
- Stress-tested 11 improvements in one run
- Led to: admit rate 3-decimal enforcement, split fabrication rule, state aid must-mention, review false positive fixes

---

## Decisions Made

- **CDS citations in output:** Yes. Transparency builds trust, especially for first-gen families who don't know what to Google.
- **Database coverage at launch:** 100-150 schools (currently 136).
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

**Stack:** Vercel serverless functions (Node.js), Upstash Redis, Anthropic API (Claude Fable 5), vanilla HTML/CSS/JS (no framework).
