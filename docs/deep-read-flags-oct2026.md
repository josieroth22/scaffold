# Deep-Read Flags: Homepage Samples (October 2026)

Claude's pre-read of the three homepage samples, done Oct 15, 2026 so Josie's
deep read (Launch Plan chunk 1) is judging a short list instead of 60+ pages.
Facts and format were already audited July 5 (docs/sample-plan-audit-july5.md);
this pass looks for what that one couldn't: advice a parent could act on and get
hurt by, stale specifics, tone, and what a paid counselor would add.

**Caveat:** Claude wrote, reviewed, and is now re-reading these plans, so this
list shares the generator's blind spots. Josie's read is the independent check;
treat these as starting points, not a substitute.

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
2. **[verify] The testing plan assumes Wisconsin gives juniors the ACT.** The
   whole spring-2027 test plan rests on "statewide ACT, free." Confirm which
   test Wisconsin DPI administers to juniors now. If it switched, the plan's
   test advice (ACT prep, ACT fee waivers, ACT retakes) points the wrong way.
3. **[verify] "ACT Academy" is recommended as a free prep tool** (twice). Claude
   believes ACT retired it; if so, a parent searches for a dead product. Low
   harm, but it's the kind of stale detail that erodes trust.
4. **[judgment] "This is a certainty" (UW-Milwaukee, 97%).** The only absolute
   in a plan that's otherwise careful with probabilities. "As close to certain
   as admissions gets" says the same thing honestly.
5. **[gap] College Possible Milwaukee.** A free, local, near-peer coaching
   program built for exactly this family (low-income, high-achieving, MPS).
   A Milwaukee counselor would name it in the first meeting. Verify it still
   runs in Milwaukee; if so, it's a better "do now" than anything on the
   scholarship database list.
6. **[judgment] Bucky's Tuition Promise is hedged as "a program ... verify."**
   It's named vaguely ("a program that covers full tuition... mid-$60Ks") while
   it could be the single biggest number in the plan for a $62K family. Should
   the prompt/data name it outright with the current threshold?
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
5. **[verify] Small timing details:** SIMR's deadline listed as January
   (Claude recalls February); RSI "December 2026." Confirm before the
   sample is shown to a family who'd act on them.

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
3. **[gap] College Credit Plus.** Ohio's free dual-enrollment program. For a
   kid whose weakness is early-transcript rigor and whose family is cost-first,
   free college credit senior year that transfers to OSU is a standard
   counselor move. Not mentioned.
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
