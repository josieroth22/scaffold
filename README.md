# Scaffold

Every family deserves a college strategy. Not just the ones who can afford a $10,000 counselor.

## What is this?

Scaffold generates personalized, 20+ page college strategy documents for families. $50, one time. The strategy includes a developmental roadmap, school list with financial analysis, application materials plan, and a code-generated Monte Carlo simulation modeling 10,000 outcomes.

## Project Structure

```
scaffold-project/
  CLAUDE.md              # Project context for Claude Code
  src/
    index.html             # Marketing landing page
  prompts/
    scaffold-v3.md         # Current prompt template (two-phase, with Monte Carlo)
  samples/                 # Test family outputs (add generated docs here)
    nguyen-parker/
    washington/
  docs/                    # Business plan, strategy docs
  .claude/
    settings.json          # Claude Code project settings
```

## Getting Started

1. Install [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
2. `cd scaffold-project && claude`
3. Claude will read CLAUDE.md and understand the full project context

## Current Status

- Landing page: done
- Prompt template v3: done (two-phase with real Monte Carlo)
- Tested across 5 family profiles
- Backend, payment, hosting: not yet built

## Next Steps

- Build web intake form
- Backend to call Claude API with form data + prompt template
- Stripe integration ($50 one-time)
- Hosting for generated strategy docs at unique URLs
- Fix character encoding in landing page
