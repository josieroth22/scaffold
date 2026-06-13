# Session Status - June 12, 2026

## COMPLETED TODAY

- **Fable 5 migration**: all API calls on `claude-fable-5` ($10/$50 per MTok). Temperature removed (400s on Fable), adaptive thinking on generation + review. Old claude-opus-4-20250514 retires June 15.
- **Programmatic validator** (`src/lib/validate-plan.js` + pre-pass in review.js, test fixture `scripts/test-validate-plan.js`): REA/SCEA, tier consistency, admit_pct decimals (auto-fix), sticker vs verified data with residency awareness, no-merit enforcement (auto-fix), net-cost vs narrative.
- **Prompt consolidation** for Fable 5 in generate.js (~1K tokens saved, rules stated once, pressure language removed) and review.js (15 check keys unchanged).
- **Redis outage fixed**: old Upstash DB archived for inactivity (keep-alive cron was failing silently). New database via Vercel Storage, Pay As You Go plan (cannot be archived), KV-prefix env vars. Old data lost (test submissions + 3 sample plans). Live URL: scaffold-hazel.vercel.app.
- **Admin**: pipeline legend + validator findings section in review tab.
- **Bugs found by first live Fable run** (all fixed + deployed):
  1. 32K max_tokens truncated mid-document: Fable thinks ~25K tokens on this prompt. Generation/regeneration now 64K, Tier 2 48K.
  2. Reviewer blind spot: FAMILY DETAILS omitted assets/financial_special/preferences, causing false fabricated_content failures (flagged real home equity as invented). Reviewer now sees the full form.
- **Website copy**: index.html says Claude Fable 5 (2 spots).

## IN FLIGHT AT SESSION END

Brett re-baseline: TWO doomed runs so far. mqblu0bloz8gz6 (32K truncation, fixed) and mqbms3ivxsu6pw (prompt contradiction: "stop after the Monte Carlo Parameter Table" made Fable omit the JSON block, fixed in commit after 2d823e6). Cancel mqbms3ivxsu6pw if still running. Resubmit Brett fresh ~2 min after the fix deploys; that run has all three fixes (64K caps, reviewer full-form visibility, unambiguous output tail).

**When it completes, check (admin or curl `api/submission?code=...&id=mqbms3ivxsu6pw`):**
1. Document complete? Ends cleanly, has json-simulation-params block, has Tier 2, Monte Carlo charts render on plan.html
2. Review attempts to pass (Feb baseline: 5 attempts on old Opus)
3. Validator section in admin review tab: what was auto-fixed/flagged
4. Output length in chars -> recalibrate intake.html progress bar (`expectedChars`: 13000 for Tier 1 in streamResponse call ~line 1667, 15000 for Tier 2 ~line 1842; the truncated run already produced 24-30K chars for T1)
5. Read the plan for voice/quality (Fable writes warmer than old Opus)

## NEXT STEPS (in order)

1. Verify Brett rerun (above). If pass: run **Sofia Martinez** (full profiles for both: `docs/test-profiles.md`).
2. Recalibrate progress-bar expectedChars with measured lengths.
3. Re-measure unit economics with real token usage (project-plan table is scaled estimates; thinking adds ~25K billed output tokens per generation, ~$1.25/call, not in the table). Exact usage: Anthropic console.
4. UptimeRobot on /api/keep-alive (5 min, before external testers).
5. Regenerate sample plans (Alejandra, Priya, Jake) — then update the 6 hardcoded plan.html?id= links in index.html.
6. Copy pass: website + intake form, incl. a status message during Fable's silent thinking period at generation start (bar sits at 0% for 1-3 min, looks frozen).
7. Dry-run a profile resembling the CRO's daughter before sharing with Jon.

Deferred: legal, Stripe, LLC. Full roadmap: docs/project-plan.md.

## USEFUL

- Admin: scaffold-hazel.vercel.app/admin.html (code in src/api/submissions.js)
- Intake bypass code: in CLAUDE.md architecture diagram
- Pipeline watcher: `node scripts/watch-pipeline.js` (polls admin API, logs stage transitions; set IGNORE_ID env var to skip an old submission)
- Validator test: `node scripts/test-validate-plan.js`

## CARRIED OVER FROM FEB 21 (verify if still present)

### Plan rendering bugs
- Activities list wall of text: Currently:/Goal: descriptions render as one block (fix was deployed but unverified)
- EA (merit deadline) badge: fix deployed, verify
- Admit rates showing as decimals in rendered plan ("0.103" instead of "10.3%"): check formatSchoolCompact()/formatSchoolRadar() in school-data.js
- Honors programs incomplete: GSU and UNC show N/A; honors data only covers ~108 schools from the PDF parse

### Minor cleanup (low priority)
- Missing CDS schools (US News 80+): Binghamton, Colorado School of Mines, Chapman, Creighton, Elon, Saint Louis, Temple, U of Missouri, BYU, U of Tennessee, Yeshiva
- Consider adding DACA/undocumented aid, foster care waivers, military/veteran benefits, Native American tuition waivers to state aid doc
