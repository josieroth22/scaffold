# Scaffold

## Model Preference

Always use Claude Opus (claude-opus-4-20250514) for all API calls unless specifically asked to use a different model.

## What This Is

Scaffold is a $50 consumer product that generates personalized college strategy documents for families. The core loop: family fills out a form, we run their details through a Claude Opus prompt template, and they get a 20+ page strategy doc at a unique URL.

The mission is closing the information asymmetry in college planning. A $300K family in Bethesda gets a $10K private counselor. A $72K single mom in Atlanta is Googling "how to pay for college" at midnight. The strategy quality gap between those two families is the problem. Scaffold gives Family B the same data-driven planning for $50.

## Product Architecture

The product has three pieces:

1. **Landing page** (`src/index.html`) - static marketing site, editorial aesthetic
2. **Intake form** - guided form collecting family details (kid, schools, finances, priorities). Not yet built as a web form; currently the prompt template handles this.
3. **Strategy generation** - Claude Opus processes the family's details through a proprietary prompt template and produces a full strategy doc with developmental roadmap, school list, application materials plan, and Monte Carlo financial simulation.

## Current State

- Landing page is done (HTML/CSS, no framework). Lives in `src/`. Mojibake encoding issues fixed.
- Prompt template v3 is done and tested across 5 family profiles. Lives in `prompts/`.
- Washington family has a complete sample output (intake form + full strategy doc). Lives in `samples/washington/`.
- Business plan and project plan (including CDS data integration roadmap) live in `docs/`.
- **No backend yet.** Generation currently happens by pasting the prompt into a Claude conversation manually.
- **No payment flow yet.** The $50 price is set but Stripe isn't hooked up.

## What Needs to Be Built

- Web intake form that collects family details
- Backend that takes form data, injects it into the prompt template, calls Claude API, and returns the formatted strategy doc
- Payment integration (Stripe, $50 one-time)
- Hosting for the generated strategy docs at unique URLs
- Standalone sample HTML page is done (`src/washington-sample.html`), linked from landing page

## Tech Decisions (Open)

No framework decisions have been locked in yet. The landing page is vanilla HTML/CSS. The backend could be anything (Next.js, Flask, Rails, whatever makes sense). The founder is non-technical, so simplicity and low maintenance matter more than performance optimization.

## Design System

The visual identity is editorial/warm, not SaaS-corporate:

- **Fonts:** Newsreader (serif, headlines) + DM Sans (body)
- **Palette:** `--ink: #1a1a18`, `--cream: #f8f5f0`, `--warm-white: #fdfcfa`, `--sage: #4a6741`, `--sage-light: #e8ede6`, `--sage-dark: #3a5233`, `--terra: #c4652a`, `--terra-light: #f5ece5`, `--muted: #6b6860`, `--border: #d9d4cc`
- **Tone:** "Smart friend who happens to know things." Direct, honest, no BS. Not slick tech startup, not cutesy education brand.

## The Prompt Template

The prompt template (v3) has four sections:

1. **Instructions** - tells Claude what to generate (developmental roadmap, college list, application materials, Monte Carlo simulation)
2. **Family details** - the intake form data (kid info, school info, finances, priorities)
3. **Family priorities** - what matters to them (cost, prestige, geography, culture, etc.)
4. **Output instructions** - two-tier structure: Tier 1 is "The Strategy Brief" (~5,000 words, the thing a parent reads on their phone at midnight), Tier 2 is "Reference Sections" (detailed grade-by-grade roadmap, activities list, essay strategy, etc.)

The output uses a two-tier structure so a parent gets the full strategy and actionable next steps in Tier 1 without having to read the entire 20+ page document. Tier 2 sections are standalone reference tools they come back to over the years.

The Monte Carlo simulation uses real Python code execution (numpy) to run 10,000 scenarios, not reasoning-based estimates. The template was developed over 100+ hours of iteration.

## Test Families

Five profiles have been tested:

1. **Nguyen-Parkers** (Austin TX, $300K, STEM girl, Eanes ISD, two engineers)
2. **Washingtons** (Atlanta GA, $72K, single mom, humanities boy, APS)
3. **Okafor-Brennans** (Chicago IL, divorced, $115K+$140K, biracial, D1 volleyball recruit)
4. **Reeves** (Grants Pass OR, $80K, rural, first-gen, hidden math talent)
5. **Sato-Andersons** (Portland OR/Tokyo, $220K, bicultural, non-binary, music/conservatory)

## Writing Style

- No em dashes. Use commas, periods, or restructure the sentence.
- Don't sound like AI. No "I'd be happy to help," no "Great question," no "Let's dive in."
- Direct and honest. Say what you mean.
- The strategy docs address the parent by name and speak frankly ("Maya, do not write his essays.")

## Key Files

```
scaffold-project/
  CLAUDE.md                # This file
  src/
    index.html               # Marketing landing page
    washington-sample.html   # Standalone sample page (intake/strategy toggle)
  prompts/
    scaffold-v3.md           # Current prompt template (two-tier output structure)
  samples/
    washington/
      washington-intake.md   # Completed intake form (Maya Washington's voice)
      washington-strategy.md # Full strategy document output (two-tier structure)
    nguyen-parker/           # Test family (not yet generated)
  docs/
    business-plan.md         # Product strategy and roadmap
    project-plan.md          # CDS data integration plan
    sample-prompts.md        # All 5 test family prompts
  .claude/
    settings.json            # Claude Code project settings
```
