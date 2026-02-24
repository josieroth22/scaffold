# Scaffold

## Model Preference

Always use Claude Opus (claude-opus-4-20250514) for all API calls unless specifically asked to use a different model.

## What This Is

Scaffold is a $50 consumer product that generates personalized 20+ page college strategy documents for families. A parent fills out a form, we run their details through Claude Opus with verified school data injected, and they get a full strategy doc at a unique URL.

The mission: close the information gap in college planning. A $310K family in Naperville gets a $10K private counselor. A $48K single mom in San Antonio is Googling "how to pay for college" at midnight. Scaffold gives Family B the same data-driven planning for $50.

## Stack

Vanilla HTML/CSS/JS (no framework). Vercel serverless functions (Node.js). Upstash Redis. Anthropic API (Claude Opus).

## Architecture

```
Intake form (intake.html) -- bypass code: Millie2026
    |
    v
POST /api/generate        -- Tier 1 Strategy Brief via SSE
    |
    v
POST /api/review          -- 15-check quality review
    |
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
    config.js              # Model name, temperatures
data/
  schools/                 # 1,492 school JSON files (CDS + Scorecard + reference data)
  state-aid-programs.md    # State aid for all 50 states + DC
  financial-aid-facts.md   # No-merit schools, full-need schools, CSS vs FAFSA, QuestBridge, etc.
scripts/
  parse-cds.js             # Parse CDS PDFs/XLSX via Claude API into school JSONs
docs/
  project-plan.md          # Full roadmap, unit economics, architecture
  business-plan.md         # Product strategy
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

Phase 0: Learn Claude Code best practices.
Phase 1: Build programmatic plan validator (validate-plan.js) - code-based checks for REA/SCEA, tier consistency, admit rate decimals, cost consistency, no-merit enforcement. Runs before Claude review.
See `docs/project-plan.md` for full roadmap.

## Test Results

- **Brett Roth** (Boca Raton FL, $200K, engineering): 15/15 passed (attempt 5). Found CWRU EA bug and NC State tier mismatch that reviewer missed.
- **Martinez** (Milwaukee WI, $62K, first-gen, environmental science): Passed after 3 iterations. Led to major prompt improvements.
