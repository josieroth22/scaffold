# Sample Plan Audit — July 5, 2026 (pre-deep-read)

Machine + model audit of the three live homepage samples (Sofia mr6eqht6rzc0tj,
Priya mr6hjpw1s7g8j0, Jake mr6ij7f02ymbzw), run before Josie's deep reads so her
time goes to judgment, not error-hunting. Imani (mr7vk33b5cr6px) had her own
trap-question read July 5 (passed; see CLAUDE.md Test Results).

## Verified clean (all three plans)

- **Style:** zero em dashes, zero AI-phrases, months capitalized, standard risk
  labels only. The three "unlock" uses are literal verbs ("FAFSA unlocks federal
  loans"), not fluff.
- **Admit rates:** every `admit_pct` in every JSON params block is exactly 3
  decimals (11 + 11 + 8 schools).
- **Scholarship dollars vs verified data — exact matches everywhere checked:**
  UW-Madison NMF $3,000; Lawrence, Macalester, Carleton, Grinnell NMF $2,000;
  USC NMF $28,000+ and Trustee full tuition. Jake's plan makes no scholarship
  dollar claims (correct for a $125K no-need profile leaning on in-state pricing).
- **Application-timeline math is consistent across all plans:** grade at July
  submission is read as the just-finished year, so Sofia (10th) applies fall
  2027, Priya (10th) fall 2027, Jake (11th) THIS fall 2026. Note: this means
  Jake's plan is also a rising-senior plan in practice.

## Findings (none demo-blocking)

1. **QuestBridge data gap (data issue, not a plan error).** Sofia's plan routes
   Carleton, Grinnell, Northwestern, and UChicago through QB Match, but only
   UChicago carries `questbridge_partner: true` in our reference data. The
   other three ARE real QB partners, so the plan is factually right — but the
   model asserted it from world knowledge, which is the exact pattern the
   fabrication rules exist to catch. It got lucky being right. **Action:**
   folded into task #11 (data hygiene): audit/complete `questbridge_partner`
   flags across the ~55 known partners so the reviewer can verify these claims
   from injected data.
2. **Jake's over-budget safeties.** Miami "Safety/High risk," Kelley
   "Safety/Very High" at $50-55K against a $25K budget. Permitted by the
   budget-flexibility rule (OU Athens at $20-23K is the strong financial
   floor), and the plan says so — but Josie should confirm the framing reads
   as honest guidance, not list-padding, in her deep read.

## Tone spot-reads (exec summaries)

- Sofia: the "most selective schools are the cheapest — that's not a typo"
  passage is the product thesis in two sentences. Strong.
- Priya: "$310K income... essentially zero need-based aid anywhere... your
  actual number will be at or near sticker. I've shown both." Exactly the
  no-BS promise.
- Jake: "the rare applicant who has actually run a business, not just joined a
  business club." Personal, specific, true to his intake.

## What Josie's deep reads should still cover

The machine can't judge: whether advice sequencing feels right to a parent,
whether any passage overpromises emotionally, whether the Four Threads read as
insight or horoscope, and whether each "What to Do Now" is actually doable.
Facts and format are pre-cleared above.
