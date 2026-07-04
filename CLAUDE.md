# Scaffold

## Model Preference

Always use Claude Fable 5 (`claude-fable-5`) for all API calls unless specifically asked to use a different model. The model is set once in `src/lib/config.js`.

Fable 5 API notes (these cause 400 errors if violated):
- No `temperature`, `top_p`, or `top_k`. Steer behavior through prompting.
- Thinking is adaptive only: `thinking: { type: "adaptive" }`. Never send `budget_tokens` or an explicit `{ type: "disabled" }` (omit the param to disable).
- No assistant-turn prefills. Use prompt instructions or structured outputs instead.
- Thinking tokens count toward `max_tokens`, so calls with thinking enabled need headroom above the expected output size.
- With thinking enabled, `response.content[0]` may be a thinking block. Always find the text block instead of indexing.

Previous model was claude-opus-4-20250514 (deprecated, retires June 15, 2026). Migrated June 2026.

## What This Is

Scaffold is a $50 consumer product that generates personalized 20+ page college strategy documents for families. A parent fills out a form, we run their details through Claude with verified school data injected, and they get a full strategy doc at a unique URL.

The mission: close the information gap in college planning. A $310K family in Naperville gets a $10K private counselor. A $48K single mom in San Antonio is Googling "how to pay for college" at midnight. Scaffold gives Family B the same data-driven planning for $50.

## Stack

Vanilla HTML/CSS/JS (no framework). Vercel serverless functions (Node.js). Upstash Redis. Anthropic API (Claude Fable 5).

## Architecture

```
Intake form (intake.html) -- bypass code: Millie2026
    |
    v
POST /api/generate        -- Tier 1 Strategy Brief via SSE
    |
    v
POST /api/review          -- programmatic validator + 15-check quality review
    |                        (validate-plan.js runs first: auto-fixes JSON
    |                         issues, force-fails checks on code-verified
    |                         violations)
    PASS? --> simulation
    FAIL? --> fix-plan (up to 2x) --> re-review --> regenerate if still failing
    |
    v
POST /api/simulate        -- 10K Monte Carlo simulation (JS, no API cost)
    |
    v
POST /api/reconcile-costs -- Update costs + tier labels to match sim
    |
    v
POST /api/generate-tier2  -- Tier 2 Reference Sections via SSE
    |
    v
POST /api/review          -- Final quality check
    |
    PASS? --> done
    FAIL? --> one fix attempt, then proceed with best version
    |
    v
plan.html?id=<id>         -- Rendered plan with sidebar nav, sim charts

Admin: admin.html (code: SCAFFOLD1216)
```

## Key Files

```
src/
  index.html               # Marketing landing page
  intake.html              # 7-step intake form + generating screen + cancel
  plan.html                # Plan renderer (sidebar nav, collapsible sections, sim charts)
  admin.html               # Admin dashboard (submission management, auto-polling)
  api/
    generate.js            # Tier 1 generation (buildPrompt + SSE streaming + email notification)
    generate-tier2.js      # Tier 2 generation
    review.js              # 15-check quality reviewer
    fix-plan.js            # Targeted find/replace fixer
    regenerate.js          # Full regen with review feedback injected
    simulate.js            # Monte Carlo simulation (10K iterations, JS)
    reconcile-costs.js     # Reconcile narrative costs with sim results
    update-status.js       # Redis status updates
    plan.js                # Load plan from Redis for rendering
    submissions.js         # Admin API
  lib/
    school-data.js         # Loads and formats school data for prompt injection (~23K tokens)
    validate-plan.js       # Programmatic validator (runs in review.js before Claude review)
    config.js              # Model name (single source of truth)
data/
  schools/                 # 1,492 school JSON files (CDS + Scorecard + reference data)
  state-aid-programs.md    # State aid for all 50 states + DC
  financial-aid-facts.md   # No-merit schools, full-need schools, CSS vs FAFSA, QuestBridge, etc.
scripts/
  parse-cds.js             # Parse CDS PDFs/XLSX via Claude API into school JSONs
  test-validate-plan.js    # Validator test fixture (run: node scripts/test-validate-plan.js)
docs/
  project-plan.md          # Full roadmap, unit economics, architecture
```

## School Data

- **136 schools** with CDS 2024-25 data (admit rates, costs, aid stats, test scores)
- **1,492 schools** with College Scorecard data (costs, grad rates, earnings)
- **108 schools** with curated reference data (scholarships, honors programs, National Merit)
- **55 schools** tagged as QuestBridge partners
- **98 honors programs** verified against official sources
- **All 50 states + DC** with state aid programs
- Data injected into every generation prompt via `school-data.js` (~23K tokens)

## Generation Prompt Rules

These are enforced in generate.js self-checks and review.js. Do not change without understanding the full context:

- **Admit rates:** Must use exactly 3 decimal places (45.1% = 0.451, not 0.45)
- **Risk ratings:** Only "Very Low / Low / Moderate / High / Very High" - no custom labels
- **REA/SCEA:** If one school is REA/SCEA, all other private schools must be RD. Explicit list of common private schools in the prompt.
- **Tier consistency:** Every school must have same tier label across all sections
- **Fabrication:** Strict for scholarship names (must match verified data). Relaxed for academic programs (Claude can reference well-known programs).
- **State aid:** Must mention state programs by name if they exist for the family's state
- **Budget flexibility:** If strong financial safety exists, over-budget reaches are acceptable
- **Footnotes:** Use dagger symbol for REA footnotes, not superscript numbers

## Email (Resend)

Live since July 4, 2026. Domain scaffoldcollegestrategy.com verified (DKIM/SPF/MX + DMARC at Squarespace DNS). Key: RESEND_API_KEY in Vercel env (Production + Preview); both sends silently no-op without it.

- **Plan-ready email to family:** update-status.js fires it when status flips to "completed". Sender plans@scaffoldcollegestrategy.com, reply-to Josie's gmail. Sent once per plan via `plan_email_sent` hash flag; safe to re-POST completed.
- **New-submission notification to Josie:** generate.js, fire-and-forget.
- Gotcha: the admin submissions API returns a hand-picked field summary that does NOT include `plan_email_sent` — don't use it to check the flag.
- Free tier limits: 100 emails/day, 3,000/month.

## Cancellation

Server-side: every API endpoint re-checks Redis status after Claude API call completes. If "cancelled", returns early.
Client-side: AbortController on all pipeline fetch calls. Cancel button on intake page. Cancel from admin page.

## Design System

- **Fonts:** Newsreader (serif, headlines) + DM Sans (body)
- **Palette:** `--ink: #1a1a18`, `--cream: #f8f5f0`, `--warm-white: #fdfcfa`, `--sage: #4a6741`, `--sage-light: #e8ede6`, `--sage-dark: #3a5233`, `--terra: #c4652a`, `--terra-light: #f5ece5`, `--muted: #6b6860`, `--border: #d9d4cc`
- **Tone:** "Smart friend who happens to know things." Direct, honest, no BS.

## Writing Style

- No em dashes. Use commas, periods, or restructure the sentence.
- Don't sound like AI. No "I'd be happy to help," no "Great question," no "Let's dive in."
- Direct and honest. Say what you mean.
- The strategy docs address the parent by name and speak frankly ("Maya, do not write his essays.")

## Current Priority

Goal: shippable content quality. A high-stakes external test (CRO's daughter) is coming, so plan quality comes first. Stripe and legal are deferred until quality is proven.

Done (June 2026): Fable 5 migration, programmatic validator (validate-plan.js, integrated as a review.js pre-pass), prompt consolidation + Fable re-tune for generate.js and review.js.

1. Re-baseline on Fable 5: rerun Brett Roth and Martinez profiles end to end, verify the review checks and the new validator calibrate correctly on the new model, check token usage and cost.
2. Diverse profile testing (20+ profiles), including a dry-run profile matching the upcoming external tester (CRO's daughter).

Deferred: legal docs, Stripe integration, LLC setup.

See `docs/project-plan.md` for full roadmap.

## Test Results

**Fable 5 re-baseline (July 4, 2026):**
- **Brett Roth** (Boca Raton FL, $200K, engineering): PASS, 0 issues, 0 flags. The six-run debugging saga that got here killed 15+ real bugs (token caps, prompt contradiction, platform timeout, validator/formatter data schism, fixer JSON blindness, reviewer blind spots, calibration). Plan: plan.html?id=mr6c9wqsdt9spd
- **Sofia Martinez** (Milwaukee WI, $62K, first-gen): PASS end-to-end in ONE submission (2 T1 fixes + 1 final fix, no regen, 19 minutes, ~$7). QuestBridge, Wisconsin aid, need-based paths all validated. Plan: plan.html?id=mr6eqht6rzc0tj

**Old Opus baseline (Feb 2026, for comparison):** Brett 15/15 at attempt 5; Martinez passed after 3 iterations.
