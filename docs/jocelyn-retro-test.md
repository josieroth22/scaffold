# The Jocelyn Retro-Test — July 7, 2026

The only test Scaffold will ever run with a twenty-year answer key. Josie fed her
own 2014 college application profile (real Common App + transcript, North Broward
Prep, 4.95W, 1540-equivalent SAT, NMSF, BBYO International Chair) through the
production generation prompt with production verified data, as a rising senior
dated to 2026. Run in-session on the Max plan (one-off interactive draft, not
pipeline infrastructure); profile at `scripts/profiles/jocelyn-roth.json`.
Ask: Yale is the dream, maximize merit aid, $200K income + paid-off house.
Vanderbilt, WashU scholarships, Robertson, and Benacquisto were deliberately
withheld from the intake as a blind test.

## What the plan recommended

Yale SCEA + early publics (UNC EA, UF, FSU), all other privates forced to RD by
the SCEA rules; regular round centered on Vanderbilt (Cornelius Vanderbilt /
Ingram / Chancellor's named, "the single school most likely to satisfy both the
prestige column and the merit column"), WashU scholar programs, USC via NMF
$28K+; Duke only as a Robertson vehicle (~1%); Miami's full-tuition deadlines
flagged as the price of Yale SCEA; UF kept "as insurance, not a plan" with
Benacquisto; FSU as the floor (NMF full COA, no first-choice required). Yale
aid math called as "modest at best... a polite zero" at this income + equity.

## Ground truth (what actually happened, 2014-15)

Actual strategy: Yale SCEA + UNC/UVA/UF early publics; after Yale acceptance
came with no money, focused the merit hunt on WashU and Vanderbilt. Duke
skipped as too competitive.

Outcomes: National Merit Scholar. Yale acceptance, no money. UF Honors +
Benacquisto (described as "basically a given"). UNC Honors + a full ride that
was NOT Morehead-Cain or Robertson. UVA Echols Scholars, no money. **Vanderbilt
Cornelius Vanderbilt Scholarship — the exact award the plan named, at the school
she attended.** WashU Social Sciences scholarship full ride, whose interview
weekend collided with the Robertson finalist weekend; she attended Robertson
finals (did not win it).

## Scorecard

**Direct hits:** strategy architecture (SCEA + early publics + merit-focused
regular round) identical to what she ran; Cornelius Vanderbilt named and won;
Yale aid-zero called; UF/Benacquisto called; Duke conclusion matched by a
different route; UVA's exclusion vindicated (Echols carried no money — exactly
the "prestige-honors-no-dollars tease" the prompt's affordability rule exists
to exclude).

**Reality beat the plan (product lessons):**
1. **Robertson finalist at a priced 1%** — n=1, but evidence the profile-fit
   read ("international organization at 17 is Robertson's literal job
   description") was right.
2. **Merit coverage depth:** UNC and WashU both awarded full rides that are not
   in our reference data (UNC beyond Morehead/Robertson; WashU "Social
   Sciences" beyond Danforth/Ervin/Rodriguez). The plan hedged correctly per
   the fabrication rules, but the big-award landscape at top schools is deeper
   than the 108-school reference layer. → folded into task #11 scope.
3. **Finalist-weekend collisions:** competitive full-ride finalist weekends
   cluster in Feb-Mar and can conflict (WashU vs Robertson, a forced choice
   between lotteries). One-line prompt addition for plans with 3+ competitive
   full-rides on the list. → post-demo prompt change, do not touch before 7/13.
4. **Soft-preference weighting:** teenage "I'd rather not UF" lost to
   UF-Honors-plus-Benacquisto certainty in real life; the plan ordered FSU
   above UF on that preference. Soft social preferences bend to certainty +
   honors money; keep the disliked-but-funded school on the list (the plan did)
   and weight the money more in the ordering.
5. **Benacquisto data freshness:** verified data still lists it; program
   funding has been legislatively shaky. Plan hedged with "verify current
   status." Check during data maintenance.

## The headline

A $50 product running on verified data reproduced, in ~20 minutes, the strategy
a National Merit Scholar with maximally invested parents took a year to
assemble by hand — including the school she chose and the scholarship that paid
for it, by name. Founder-story raw material for the About section (roadmap
item 12), and possibly for Jon.
