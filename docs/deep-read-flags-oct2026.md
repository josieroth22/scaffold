# Deep-Read Flags: Homepage Samples (October 2026)

Claude's pre-read of the three homepage samples, done Oct 15, 2026 so Josie's
deep read (Launch Plan chunk 1) is judging a short list instead of 60+ pages.
Facts and format were already audited July 5 (docs/sample-plan-audit-july5.md);
this pass looks for what that one couldn't: advice a parent could act on and get
hurt by, stale specifics, tone, and what a paid counselor would add.

**Caveat:** Claude wrote, reviewed, and is now re-reading these plans, so this
list shares the generator's blind spots. Josie's read is the independent check;
treat these as starting points, not a substitute.

**Questions for Josie to check before the next session** (added Oct 15; answers decide the chunk 3 fixes):
1. **Wisconsin merit scholarship:** does the Wisconsin Academic Excellence Scholarship (HEAB) currently exist? Our state-aid data says Wisconsin has no statewide merit program.
2. **Harvard/Stanford restrictive early action:** do their current policies allow an early application elsewhere when that school's early deadline is required for merit scholarship consideration (e.g., USC Dec 1)? If yes, our REA/SCEA prompt rule is too strict.
3. **Full-pay family pricing:** should public safeties for high-income, no-need families be priced at sticker minus likely merit instead of the income-bracket average net price?

### Evidence summary (research pass, Oct 15-16, 2026)

Verdicts on the three questions (draft answers; details and sources are under each flag below). Pages checked Oct 15-16, 2026 via web fetch/search; secondary sources are labeled.

| # | Question | Draft answer |
|---|---|---|
| 1 | Does Wisconsin Academic Excellence Scholarship exist? | **Yes, confirmed.** HEAB page lists nominations for 2026 graduates, $2,250/yr toward tuition (state funds half, the college the other half), up to 8 semesters, for the top-GPA senior(s) at each WI high school (count scaled by enrollment). It is small and slots are scarce, but "Wisconsin has no statewide merit scholarship" is **wrong** in `data/state-aid-programs.md` (2 places) and in the Sofia sample. Fix the data file. |
| 2 | Do Harvard/Stanford REA allow an early application elsewhere when required for merit scholarship? | **Yes, confirmed in both policies.** Both carve out a non-binding early plan at another school when applying early is required for scholarship (or special program) consideration. Stanford's page names USC as its example. The prompt's blanket "all other privates must be RD" rule is too strict, and the Priya sample's central tradeoff (REA "kills USC's Dec 1 merit deadline") is a phantom. Needs Josie's decision on the carve-out (generate.js rule, CLAUDE.md, validate-plan.js REA check). |
| 3 | Price public safeties for full-pay families at sticker minus merit? | **Not web-verifiable; Claude's recommendation: yes.** Policy question, so no source applies. The sample's own text says a $310K family gets essentially no need aid, so a bracket-average net price (which embeds need aid) contradicts it. Sticker minus likely merit is the honest number. Keep the existing conclusions (all still under budget). Josie's call on rule wording. |

Other results at a glance: WI juniors take the **ACT with writing** (DPI; confirmed). **ACT Academy**: unclear, no retirement notice found, but ACT's current prep page no longer lists it. **College Possible Milwaukee**: confirmed operating. **Bucky's Tuition Promise**: threshold is **$65,000** AGI (not "mid-$60Ks" vaguely; Sofia at $62K qualifies on income), CSS Profile required from 2026-27. **Illinois NM cutoff**: 218-222 for recent classes; sample's "~221" is in range. **SIMR**: late February, not January (the sample is wrong). **RSI**: Dec 11, 2026 deadline, juniors only. **Ohio OCOG**: Oct 1 of the award year, so the "earliest in the country" claim is wrong (see flag). **College Credit Plus**: confirmed, free at public Ohio colleges.

**Proposed data-file edits** (not applied; `data/` was out of scope for this pass):
1. `data/state-aid-programs.md` Wisconsin entry (line ~975 "Wisconsin has no statewide merit scholarship program" and the Scaffold note at ~977): add the Wisconsin Academic Excellence Scholarship ($2,250/yr, up to 8 semesters, top-GPA senior(s) per high school, designated by the school, nominated Feb-Mar of senior year, full-time at UW/tech/independent/tribal college by Sept 30 after designation). Replace "no statewide merit" with "only one small statewide merit award, WAES; not something a family can plan around beyond being #1 in the class."
2. Same file, Ohio entry (lines ~933-945) and Note 3 (line ~989): reword "unusually early deadline" / "one of the earliest in the country" to "FAFSA must be received by October 1 of the award year (a 2026-27 award needs the 2026-27 FAFSA in by Oct 1, 2026); file as early as the FAFSA opens anyway." Remove "Ohio: October 1" from the early-deadline list in Note 3 or annotate it.
3. Same file, Ohio entry: add College Credit Plus (free tuition/books/fees at public Ohio colleges for grades 7-12; credits transfer to Ohio publics) as a named program for Ohio families.
4. Same file, Wisconsin entry: consider naming Bucky's Tuition Promise ($65,000 AGI, CSS Profile required from 2026-27) so it stops being "a program ... verify". The school JSON for UW-Madison may need the same number; check `data/schools/` for the old $56,000 figure.
5. Prompt/reference (Josie's call, not edited): the Harvard/Stanford merit-deadline carve-out in the REA/SCEA rule; a "dated" reminder for date-sensitive facts (SIMR, RSI, OCOG year).

Legend: **[verify]** = Claude suspects a fact but couldn't confirm it from repo
data; **[judgment]** = Josie's call; **[gap]** = something a counselor would add.

---

## Sofia (mr6eqht6rzc0tj): Milwaukee, $62K, first-gen, 10th grade

Overall: the strongest of the three, and the product thesis in one document
("the most selective schools are the cheapest"). No harm-level problems found.
Flags, most important first:

1. **[verify] "Wisconsin has no statewide merit scholarship."** The Wisconsin
   Academic Excellence Scholarship (HEAB) is merit-based: awarded to the
   top-GPA seniors at each Wisconsin high school, renewable, usable at in-state
   colleges. A top-5% student at a large MPS school may be in range. If WAES
   still exists, this sentence is wrong AND it's the exact "name the state
   program" rule the generator is supposed to enforce. **Root cause is our
   data, not the model:** `data/state-aid-programs.md` (Wisconsin entry) says
   "Wisconsin has no statewide merit scholarship program" in two places, and
   the plan repeated it faithfully. If WAES is current, fix the data file and
   every future Wisconsin plan inherits the fix. Candidate for the chunk-2/5
   data-hygiene pass.

   **Evidence (Oct 2026):** **Confirmed** (WAES exists; the plan sentence is wrong). HEAB's page lists a Feb 18-Mar 13, 2026 nomination window for 2026 graduates; $2,250/yr toward tuition, state funds half and the institution half, max 8 semesters; the high school designates the top-GPA senior(s), count scaled by enrollment (new Act 80 gives each 1-499 enrollment school one); recipient must enroll full-time by Sept 30 after designation at a UW campus, WI technical, independent, or tribal college. Caveat: page footer says 2025, so confirm the 2027 window with HEAB (608-267-2213); and it is one small award per school, so Sofia benefits only if she is #1 in GPA. Source: https://heab.state.wi.us/features/aes.html (also https://uwm.edu/finances/scholarships/academic-excellence-scholarship/). Checked Oct 15, 2026.
2. **[verify] The testing plan assumes Wisconsin gives juniors the ACT.** The
   whole spring-2027 test plan rests on "statewide ACT, free." Confirm which
   test Wisconsin DPI administers to juniors now. If it switched, the plan's
   test advice (ACT prep, ACT fee waivers, ACT retakes) points the wrong way.

   **Evidence (Oct 2026):** **Confirmed** (still the ACT). DPI: all grade 11 students take the ACT with writing; the 2026 window ran Mar 10-20, and the next is Mar 9-19, 2027. The ACT is the state test, so the plan's spring-2027 framing holds. Not found: student cost (DPI page is silent; the state pays, per the plan's "free", which I did not independently confirm). Sources: https://dpi.wi.gov/assessment/act ; https://dpi.wi.gov/sites/default/files/imce/assessment/pdf/ACT_Updates_9-8-25.pdf (a search summary of the PDF; the PDF itself did not parse). Checked Oct 15, 2026.
3. **[verify] "ACT Academy" is recommended as a free prep tool** (twice). Claude
   believes ACT retired it; if so, a parent searches for a dead product. Low
   harm, but it's the kind of stale detail that erodes trust.

   **Evidence (Oct 2026):** **Unclear, leaning "stale."** No retirement notice found. A school flyer dated Aug 2025 still points to act.org/academy, but ACT's current test-prep page does not mention ACT Academy and lists instead the Official ACT Self-Paced Course powered by Kaplan (free with a fee-waiver registration), free practice tests, and MyACT tools. act.org/academy itself returned no usable content. Suggested wording: "ACT's free official practice test and, with a fee waiver, the free self-paced course" instead of ACT Academy. Sources: https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html ; https://varelahighschool.net/wp-content/uploads/2025/08/ACT-Academy-is-a-free-online-learning-tool.pdf . Checked Oct 15, 2026. Josie: one click on act.org/academy settles it.
4. **[judgment] "This is a certainty" (UW-Milwaukee, 97%).** The only absolute
   in a plan that's otherwise careful with probabilities. "As close to certain
   as admissions gets" says the same thing honestly.
5. **[gap] College Possible Milwaukee.** A free, local, near-peer coaching
   program built for exactly this family (low-income, high-achieving, MPS).
   A Milwaukee counselor would name it in the first meeting. Verify it still
   runs in Milwaukee; if so, it's a better "do now" than anything on the
   scholarship database list.

   **Evidence (Oct 2026):** **Confirmed** operating. Free near-peer coaching for low-income, first-gen students, at least six years of coaching; started in Milwaukee in 2008; sources report 15-18 partner high schools and roughly 800-2,300 students depending on year/definition (figures vary; do not quote a number). Office: 1515 N. Rivercenter Dr., Suite 105, Milwaukee, 414-220-9450. Eligibility/partner high schools should be checked before naming a specific MPS school. Sources: https://www.fox6now.com/news/milwaukee-students-college-possible-prep-financial-aid ; https://americorps.gov/evidence-exchange/Evaluation-of-College-Possible-Milwaukee ; https://biztimes.com/college-possible-milwaukee . Checked Oct 15, 2026 (search results only; collegepossible.org not fetched).
6. **[judgment] Bucky's Tuition Promise is hedged as "a program ... verify."**
   It's named vaguely ("a program that covers full tuition... mid-$60Ks") while
   it could be the single biggest number in the plan for a $62K family. Should
   the prompt/data name it outright with the current threshold?

   **Evidence (Oct 2026):** **Confirmed, with a number.** UW-Madison financial aid lists the income limit as **$65,000 family AGI** (launched 2018 at $56,000); covers tuition and segregated fees for 8 consecutive semesters (first-years) or 4 (transfers); eligibility is by AGI, not SAI; from 2026-27 all eligible students must submit the **CSS Profile** for their incoming year. Sofia ($62K) is under the line, a reason to name it outright. Wisconsin-residency criteria were not captured; confirm on the page. Source: https://financialaid.wisc.edu/types-of-aid/tuition-promise/ (read via search summary; direct fetch returned empty). Checked Oct 15, 2026.
7. **[judgment] Minnesota as a "Safety" at 90%.** Defensible, but four safeties
   plus a 90% "safety" means the list has 5 of 11 slots near-certain. Is that
   the right shape for a family whose budget is the real constraint, or does it
   read as padding?
8. **[judgment] Closing line: "You're closer than you think."** Slightly
   greeting-card. Josie's call whether that's "smart friend" or "AI being nice."
9. **[judgment] Stale-date framing on the homepage.** "Summer 2026 (right now)"
   reads oddly to a visitor in October. The header says "Scaffold July 2026",
   so it's honest; decide whether the sample needs a "generated July 2026"
   badge more visible than the subtitle.

**Things that read well and should be protected in any prompt change:** the
"not a deficit narrative" essay guidance, the "keep the grocery job" thread,
the honest Northwestern/UChicago odds, the outside-scholarship warning about
full-need schools reducing their own aid, and the four-year-total decision math.

---

## Priya (mr6hjpw1s7g8j0): Naperville, $310K, full-pay, 10th grade

Overall: tone is the best of the three ("you're allowed to do less", "the plan
should feel like subtraction"). Two flags matter, both systemic (prompt or
data level), not one-off writing slips. (Pre-read covered the main brief and
the first half of the reference sections.)

1. **[verify, likely systemic] The public safeties are priced with need aid
   this family can't get.** The plan says up front that a $310K family gets
   "essentially zero need-based aid anywhere," then prices UIUC, Purdue, and
   IU off the bracket-average net price anyway. Its own JSON gives IU
   $20-28K of *need* aid, Purdue $6-12K, UIUC $3-7K, Case $6-14K. Realistic
   full-pay numbers: IU out-of-state is ~$56K sticker minus whatever merit
   (not $26-33K); Purdue ~$39K; UIUC ~$33K. Every *conclusion* still holds
   (all three are under the $60K budget even at sticker), but the dollar
   figures in the exec summary, the "financial floor" ("40-50% of budget,
   $100K+ of the 529 preserved"), and the simulation are off by $6-25K/yr.
   A parent comparing "IU at $26K vs Hopkins at $88K" is comparing against a
   number they'll never see. **Likely fix:** a prompt rule that high-income
   families (bracket $110K+ with income well above it) get sticker-minus-merit
   for publics too, not bracket averages; plus a validator check that
   need_aid is ~0 when the plan itself says need aid is ~0.

   **Evidence (Oct 2026):** **Unclear (not a web-checkable fact).** It is an internal-consistency problem in the plan, not an external claim, so no source applies; the sticker prices were not re-checked against the schools' current cost pages. Recommendation is under Question 3 above.
2. **[verify, prompt rule] The REA argument may rest on a wrong rule.** The
   plan rejects Harvard/Stanford REA because it "would force USC and Case
   Western to Regular Decision, which kills USC's December 1 merit
   scholarship deadline." Claude believes both Harvard's and Stanford's
   restrictive early policies carve out an exception for private schools
   whose early deadline is *required for merit scholarship consideration*,
   which is exactly USC's case. If so, the plan's central strategic tradeoff
   is a phantom. The plan didn't invent this: the generation prompt's
   REA/SCEA rule (generate.js, Application Strategy Principles, and CLAUDE.md
   "Generation Prompt Rules") is a blanket "every other private must be RD"
   and lists USC and Case by name. CLAUDE.md says not to change that rule
   without understanding the full context, so this is Josie's call: check
   the current Harvard/Stanford policy text, and if the exception exists,
   the rule (and validate-plan.js's REA check) needs a merit-deadline
   carve-out.

   **Evidence (Oct 2026):** **Confirmed** for both. Harvard's FAQ: you may apply to scholarships or special academic programs with an early deadline at another institution, provided the early timing is necessary for consideration and the outcome is non-binding; binding ED elsewhere is barred until Harvard releases REA decisions in mid-December. Stanford's decision-process page: simultaneous early application is allowed when the plan is non-binding and applying early is required to be considered for a scholarship or special academic program, and it uses **USC** (Early Action required for most merit awards) as its example; otherwise no other private early plans, and no public binding plans. Caveats: the exception requires the early timing to be *required*; Case Western's merit tied to early deadlines was not checked, so the carve-out should apply per school, not by blanket. Sources: https://college.harvard.edu/resources/faq/if-i-apply-restrictive-early-action-harvard-may-i-apply-another-colleges-early ; https://admission.stanford.edu/apply/first-year/decision_process.html . Checked Oct 15, 2026. Related: other REA schools' rules differ (e.g., Yale narrower); a per-school note would be needed before generalizing beyond Harvard and Stanford.
3. **[judgment] Hopkins ED as the default.** The logic ("full-pay, so ED
   costs you almost nothing") is sound, but ED also forfeits the
   USC/Case/WashU merit comparison in April. For a family whose budget is
   $60K and whose best merit shots are USC/Case, is that really "almost
   nothing"? A counselor might frame it as "ED only if Hopkins is the
   clear first choice after visits," which the plan half-says via Decision
   Point #1.
4. **[verify] National Merit framing.** "Her 1440 PSAT 10 puts Semifinalist
   genuinely in range (Illinois cutoff ~221)." A balanced 1440 is a
   Selection Index around 216, so she needs a real jump, and PSAT 10 itself
   doesn't count toward NM. The plan does say "with prep"; Josie's call
   whether it oversells a $28K+/yr outcome.

   **Evidence (Oct 2026):** **Confirmed that the plan is optimistic.** Illinois Semifinalist cutoffs (Selection Index): Class of 2024 = 219, 2025 = 220, 2026 = 222, 2027 = 218 (Priya, a rising 10th grader in the sample, would be class of 2028, cutoff not yet known). So "~221" is a fair recent-years figure, but a balanced 1440 gives (2x720+720)/10 = 216, 2-6 points short, "a real jump." PSAT 10 does not count; only the PSAT/NMSQT in junior fall does. Source for cutoffs is Compass Prep (a test-prep company compiling NMSC data; NMSC does not publish state cutoffs itself): https://www.compassprep.com/national-merit-semifinalist-cutoffs/ . Checked Oct 15, 2026. A mirror site listed Illinois as 138, which is not on the index scale; ignore.
5. **[verify] Small timing details:** SIMR's deadline listed as January
   (Claude recalls February); RSI "December 2026." Confirm before the
   sample is shown to a family who'd act on them.

   **Evidence (Oct 2026):** **SIMR: refuted, it's February.** Stanford's 2026 cycle closed Feb 21, 2026; the SIMR site says 2027 applications are due "late February 2027" (juniors/seniors, 16 by program start, U.S. citizen/permanent resident; strongly Bay Area-weighted). Note: the page text said the application opened "Dec. 18, 2026," a date later than today, so treat that detail as unreliable. **RSI: confirmed.** CEE: applications for RSI 2027 close 11:59 p.m. Dec 11, 2026, juniors only (seniors not eligible); a Stanford site was announced for 2027. Because RSI takes juniors only, the sample's 10th-grade student cannot use the Dec 2026 deadline; her window is the fall of 2027, so "December 2026" in a sample read now is either stale or wrong for her grade, worth a look in the plan text. Sources: https://simr.stanford.edu/ ; https://www.cee.org/research-science-institute . Checked Oct 15-16, 2026.

**Protect in any prompt change:** "Northwestern University, not Northwestern
College in Iowa" disambiguation, the 529 framing ("is Hopkins worth $170K
more than UIUC"), the explicit "QuestBridge: not applicable", and the
burnout-first voice.

## Jake (mr6ij7f02ymbzw): Columbus/Westerville OH, $125K, rising senior (July)

Overall: the most practical of the three, and the honesty on Kelley ("the
school you admire from Ohio") is exactly the brand. Flags:

1. **[judgment, carry-over from July] "Safety" on a school the family can't
   afford.** Indiana/Kelley is labeled Safety at $50-55K against a $25K budget
   ("Very High" financial risk), Miami Safety at $27-31K. Academically true,
   but a parent reads "safety" as "the fallback we can count on." Consider a
   prompt rule: a school whose cost is Very High can't carry the Safety label
   without a qualifier (e.g., "Safety (admission only)"). The plan's text is
   honest; the table label isn't.
2. **[verify] "Ohio's state grant deadline is October 1 and is one of the
   earliest in the country."** Claude believes Ohio's OCOG deadline is
   October 1 *of the award year* (i.e., about a year after the FAFSA opens),
   which makes it one of the more forgiving deadlines, not one of the
   earliest. The advice ("file on opening day") is still good; the reason
   given is wrong. Our state-aid file's notes list "Ohio: October 1" among
   early deadlines, so this may be a data-file wording issue, same pattern as
   Wisconsin.

   **Evidence (Oct 2026):** **Confirmed (the plan's reason is wrong).** Ohio schools restate the rule as "the student's initial 2026-27 FAFSA must be received by October 1" of the award year, a year after the FAFSA opens, so it is forgiving, not among the earliest in the country. The advice to file early still holds. For the data file: 2025-26 criteria were SAI 3,750 or less and household income $96,000 or less, up to $5,000/yr full-time; 2026-27 numbers are set in the state budget and were not final in sources found. ODHE's page (highered.ohio.gov) returned 404, so this rests on college pages, not the state agency: https://www.cedarville.edu/offices/financial-aid/undergraduate/student-aid-2026-27/info/2026/ohio-college-opportunity-grant ; https://www.capital.edu/admission-aid/office-of-financial-aid/types-of-aid/ohio-college-opportunity-grant/ . Checked Oct 15, 2026. Re-verify at ODHE before changing the data file.

3. **[gap] College Credit Plus.** Ohio's free dual-enrollment program. For a
   kid whose weakness is early-transcript rigor and whose family is cost-first,
   free college credit senior year that transfers to OSU is a standard
   counselor move. Not mentioned.

   **Evidence (Oct 2026):** **Confirmed.** College Credit Plus lets Ohio students in grades 7-12 earn high school and college credit; at public Ohio colleges, tuition, books, and fees are free for public-school students (private colleges and homeschoolers can carry limited costs); credits transfer to Ohio colleges; students sign a Letter of Intent in the Feb 1-Apr 1 window (2024-25 dates; confirm for the coming year). Source: https://education.ohio.gov/topics/ohio-education-options/college-credit-plus . Checked Oct 15, 2026 (via search summary; the ODHE page was not fetched).
4. **[judgment] Stale-date framing on the homepage** (same as Sofia #9, but
   sharper): "Register for the August SAT today", "Common App opens August 1".
   A visitor in October reads instructions that already expired. Worth a
   visible "Sample generated July 2026" badge, or regenerating the samples
   after the school-year fix (see below).
5. **[systemic, FIXED Oct 15] School-year framing.** Not a flaw in this
   July sample, but the Oct 15 server-conducted Jake re-run exposed that the
   prompt framed every August-December submission a year late (an 11th
   grader planned as a current senior). Fixed in src/lib/school-calendar.js;
   the samples were generated in July, so they were framed correctly.

**Protect in any prompt change:** the "commute as escape hatch" lever, the
FAFSA-only/home-equity explanation, the "what's not on the list and why"
paragraph, and the graceful-degradation framing.
