# Session Status - July 4, 2026 (afternoon)

## WHERE WE LEFT OFF (pick up here)

**UPDATE 3 (July 4, night):** Simulation renamed "Admissions and Financial Simulation" everywhere. Coming-soon gate live and verified (2 signups incl. Josie; view in admin dashboard "Interest list" section or /api/notify-signup?code=<admin code>). **Plan-ready email BUILT into update-status.js** (fires once per plan on completion, no-op until RESEND_API_KEY exists). **WAITING ON JOSIE: Resend setup** — resend.com account → verify domain scaffoldcollegestrategy.com (SPF/DKIM at DNS host) → API key → Vercel env var RESEND_API_KEY (Production) → then redeploy, test by POSTing update-status completed on Jake (mr6ij7f02ymbzw; plan_email_sent not set → emails josieroth22), then flip intake email hint to "We'll email your plan link when it's ready". Same key activates generate.js new-submission notification to Josie. NOTE: .env.local still has DEAD June Redis creds (new DB creds only in Vercel) — local scripts can't reach prod Redis.

**UPDATE 2 (July 4, late): Tab-close protection SHIPPED** — generating screen now shows the plan's permanent URL immediately (bookmark guidance), and intake.html resumes a stalled pipeline on revisit (localStorage `scaffold_active_submission`, 48h window, simplified one-repair-pass ladder, waits out in-flight server generations). Also shipped: coming-soon gate replaces dead $50 button (email capture → /api/notify-signup → Redis set `notify_emails`; access-code path unchanged; see project-plan Stripe bullet for the un-do checklist), footer love line, sample income "/year" clarification, www redirect verified (valid cert, 308), Tier 2 progress bar calibrated (34K), unit economics measured ($6-9/plan band). **NEXT: the browser end-to-end test is now essential** — it verifies the form, the new gate, the permanent-link display, AND resume (submit, close tab mid-build on purpose, reopen intake.html, confirm it resumes and finishes). Use a rising-senior profile to also cover the untested 12th-grade band (draft offer pending with Josie). Jon's-daughter-specific dry run dropped as unrealistic; profile coverage + browser-path test replace it.

**UPDATE (July 4 evening): everything below through item 5 is DONE.** Jake PASSED (mr6ij7f02ymbzw) and all three samples are live on the homepage with working tabs, nav dropdown, and plan-page sample bar. Copy pass done for index.html AND intake.html (honest generating-time expectations, email hint fixed, stale static samples deleted, live sample links in intake dropdown). UptimeRobot monitoring live on /api/keep-alive. www.scaffoldcollegestrategy.com added in Vercel: valid cert, 308 redirect verified. Tier 2 progress bar calibrated (34K chars). Unit economics updated with measured July 4 band (~$6-9/plan). REMAINING BEFORE JON: (1) Josie's deep reads of the three sample plans, (2) dry-run profile for Jon's daughter (needs intel), (3) optional post-demo: apex DNS record update to 216.150.1.1 (Vercel recommendation, old IP still works). Original notes follow:

**Jake's sample run (`mr6ij7f02ymbzw`) was in final review at pause time** — check `api/submission?code=...&id=mr6ij7f02ymbzw` or admin. His T1 passed after one fix (budget_alignment); if the final review passed, he needs Josie's read/blessing, then restore his three TODO-marked slots (search repo for `JAKE_ID`): index.html nav dropdown + sample tab + sample-desc CTA link, and plan.html sample-bar entry + `sampleIds` array.

**July 4 results: THE RE-BASELINE IS DONE AND THE SAMPLES ARE (nearly) REGENERATED.**
- Brett: PASS (mr6c9wqsdt9spd) after the validator/data bug chain was fixed
- Sofia: PASS end-to-end in one submission (mr6eqht6rzc0tj) — now the live homepage sample (replaced Alejandra persona)
- Priya: PASS, cleanest run ever, zero T1 fixes (mr6hjpw1s7g8j0) — blessed, live on homepage
- Jake: in flight at pause (see above). Fix pattern across samples: 3 fixes / 0 fixes / 1 fix, zero regens.

**Remaining before Jon (deadline July 13):**
1. Jake blessing + restore his 3 sample slots (JAKE_ID markers)
2. Copy pass: intake.html form steps still unread (index.html copy reviewed July 4: good; two launch-checklist flags: refund FAQ has no support email yet, "generate an updated plan" implies unbuilt regeneration feature)
3. UptimeRobot on /api/keep-alive (Josie, 5 min)
4. Dry-run profile resembling Jon's daughter (needs whatever Josie can learn)
5. www.scaffoldcollegestrategy.com doesn't resolve — add www redirect in Vercel → Domains
6. Update unit economics + progress-bar Tier 2 expectedChars with measured data (T1 ~30K chars, T2 ~31-40K chars observed)

## RENDER/UX FIXES SHIPPED JULY 4 (afternoon)
- Simulation section relocated after Probability table (was buried below Tier 2); width fix for nested context; sidebar nav entry follows suit
- Nested-list rendering fixed (indented bullets became orphaned bare text — the vanished "Admitted:" branch on Priya's plan)
- Reading guide box on every plan + orientation line on homepage samples section
- No-cache headers on HTML (ends the stale-browser confusion permanently)
- Sample bar on plan pages rewired to live IDs (Sofia/Priya)
- Homepage: Sofia replaces Alejandra everywhere; Priya restored with live ID
- Calibration: admit-probability rules made selectivity-dependent + in-state exception; verified-data-wins grounding in generator AND reviewer; fixer precedence rule; validator auto-fixes sticker costs; word-boundary school matching; validator reads directory index (school-list.json is missing 29 files — task #11)
- Hopkins ED question (Josie): plan's reasoning validated as counselor-grade; ED-for-full-pay-family logic is correct and conditional

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
