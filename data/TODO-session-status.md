# Session Status - July 2, 2026 (evening)

## WHERE WE LEFT OFF (pick up here)

**Brett run five (`mr3xz0p0d2x2x5`) is parked mid-pipeline, ready to drive home.**
Its regenerated Tier 1 is complete server-side (33,913 chars, JSON block present, status `regenerated`) — the local driver died on a network blip after the regen POST, so the remaining steps were never driven. Two options:

1. **Drive it home manually** (~$3, ~12 min): POST in order to `/api/review`, `/api/simulate`, `/api/reconcile-costs`, `/api/generate-tier2` (SSE; curl with `--no-buffer --max-time 700`), `/api/review`, each with `{"id":"mr3xz0p0d2x2x5"}`. All steps now run on the fully repaired stack.
2. **Fresh run six** (~$5.50, ~25 min): `node scripts/run-pipeline.js brett` — cleanest end-to-end test of everything fixed on July 2.

Then, in order (Josie approves each run before it fires):
1. **Sofia Martinez** — `node scripts/run-pipeline.js sofia` (tests QuestBridge, WI aid, need-based, tight budget)
2. Draft 3 sample-plan profiles (Alejandra, Priya, Jake personas), Josie approves, run all three, update the 6 hardcoded `plan.html?id=` links in index.html
3. Copy pass: website + intake form (task list #6)
4. UptimeRobot on /api/keep-alive (Josie, 5 min)
5. Dry-run profile resembling Jon's daughter (get whatever details Josie can)
6. Delete temporary `/api/duration-probe` endpoint
**DEADLINE: demo-ready by July 13 (Josie's first day at Datacor).**

Run four's complete plan (72K chars, sim, review_failed-but-good) remains readable for QA comparison: plan.html?id=mr3wcxhgdzk3o8

## COMPLETED JULY 2

**Platform:** Vercel upgraded to Pro. The 300s function-kill saga's root cause was the dashboard **"Default Max Duration" field** (project Settings → Functions → Advanced Settings) stuck at 300 — it overrides vercel.json. Now 800, verified by probe (survived 390s). vercel.json glob also corrected to `api/*.js` (deployment-root relative), but the dashboard field is the boss.

**Bugs found by live runs and fixed (all deployed):**
1. Prompt contradiction: "stop after the Monte Carlo Parameter Table" made Fable omit the JSON block → output tail now explicit (table → JSON → Data Sources → stop)
2. Second reviewer blind spot: priorities/priority_other missing from FAMILY DETAILS → reviewer called the family's own words fabricated
3. fix-plan token starvation: 4K max_tokens → all-day no-text-block 500s → now 16K + adaptive thinking
4. reconcile-costs: now streams internally, 32K cap
5. `content[0].text` landmines in fix-plan + reconcile (thinking-safe extraction + loud failure with stop_reason)
6. findSchoolSlug matched wrong campus ("Purdue University" → Fort Wayne) → prefers main campus, then shortest name
7. Reviewer grounding: must compare against numbers PRINTED in verified data, never model memory (Fable cited its own Purdue figure as "verified")
8. Admit-probability calibration made selectivity-dependent (+5 cap only under ~40% overall; 85-95%+ at true safeties) **plus in-state public exception** (up to 1.5-2x overall, max 60%, reasoning stated in narrative) — Josie caught both calibration flaws reading the plan
9. plan.html activities-list mangling (Feb bug): label styler matched lowercase prose → now capitalized-only, single labels must start the element
10. **Validator now auto-fixes JSON sticker_cost** to the verified figure (same string surgery as decimals) with a review-severity flag for narrative verification
11. **fix-plan was blind to the JSON block by design** (stripped before the model saw it — three doomed fix cycles) → fixer now sees the full document and may patch JSON values
12. Formatting: months capitalized, ages as "16 years old" (prompt rules + plan.html render fix)

**Tooling:** `scripts/run-pipeline.js` (backend submission driver replicating intake.html's orchestration: stall watchdog, network retry, error-body logging) + `scripts/profiles/{brett-roth,sofia-martinez}.json`. Progress bar: thinking-pause status messages, expectedChars 13K→30K.

**Run ledger (July 2):** run 3 `mr3kolaxqdolm9` (killed by 300s cap, cancelled) · run 4 `mr3wcxhgdzk3o8` (COMPLETE 72K-char doc + sim; review_failed on Purdue bug-chain; kept as QA artifact) · run 5 `mr3xz0p0d2x2x5` (parked at `regenerated`, see top). ~$25-30 API spend today, all of it buying 12 permanent fixes.

**Roadmap additions:** Pipeline v2 gained severity-aware escalation ladder + Tier 2 re-run rung.

## SESSION LEARNINGS WORTH REMEMBERING

- Fable's world knowledge fights injected data: it wrote its remembered Purdue cost into the JSON even with verified data in the prompt, then cited the same number as "verified" while reviewing. Grounding instructions + validator auto-fix are the countermeasures.
- Every failure so far has been infrastructure/plumbing; plan content quality has been consistently strong (run 4's review praised strategy, state aid, REA handling, tier consistency).
- The Feb baseline was 5 attempts to pass on old Opus; the target is beating that on the repaired stack.

## CARRIED OVER (updated)

### Plan rendering
- ~~Activities list wall of text~~ **FIXED July 2**
- EA (merit deadline) badge: fix deployed Feb, still unverified
- Admit rates as decimals in rendered plan: check formatSchoolCompact()/formatSchoolRadar() — unverified
- Honors programs incomplete: GSU/UNC show N/A (~108-school coverage)

### Minor cleanup (low priority)
- Missing CDS schools (US News 80+): Binghamton, Colorado School of Mines, Chapman, Creighton, Elon, Saint Louis, Temple, U of Missouri, BYU, U of Tennessee, Yeshiva
- DACA/undocumented aid, foster care waivers, military/veteran benefits, Native American tuition waivers for state aid doc

## USEFUL

- Live site: scaffold-hazel.vercel.app (+ scaffoldcollegestrategy.com assigned) | Admin: /admin.html (code in src/api/submissions.js)
- Backend runs: `node scripts/run-pipeline.js <brett|sofia|profile.json>` — no form needed
- Watcher: `node scripts/watch-pipeline.js` | Validator test: `node scripts/test-validate-plan.js`
- Duration probe (temporary): /api/duration-probe?seconds=N
