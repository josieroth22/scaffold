# Beta Materials Draft (Launch Plan chunk 3)

Drafted Oct 15, 2026 for Josie to edit. Text only. Nothing here is wired into `src/` yet, and nothing ships without Josie's say-so. Placeholders: `[$X]`, `[CODE]`, `[SURVEY LINK]`, `[YOUR NAME]`, `[DELETE EMAIL]`.

Facts these drafts rely on (checked against `src/intake.html` and the project plan, Oct 15):
- The intake form is 7 steps. It asks for the student's name, age, grade, grades, activities, personality and a teacher quote; both parents' names, education and profession; family structure and custody; household income, assets, college budget and special financial circumstances; and the parent's email.
- The form takes about 20 minutes. The plan then builds for roughly 20 to 30 minutes. The generating screen already says it is safe to close the tab and that an email with the link will arrive.
- The plan lives at a private link, `plan.html?id=...`, and is emailed from plans@scaffoldcollegestrategy.com. Josie's reply-to is set.
- The form's text goes to Claude (Anthropic API) to write the plan. Data is stored in Upstash Redis and hosted on Vercel. Email goes through Resend. Josie sees submissions in the admin dashboard.
- The bypass link pattern is `intake.html?code=...`.

---

## 1. Privacy and data-deletion note (intake form)

Placement suggestion: directly under the Step 1 intro, above the first field, in small hint text. Also shown again next to the final submit button.

> **How we handle your family's information.** To build your plan we collect what you type into this form: your student's name, age, grades and activities (they're a minor, so we treat this carefully), your names and professions, and your household's income and assets. We use it for one purpose, to write your plan and to email you the link. Your answers are sent to Anthropic's Claude to write the plan, and are stored with our hosting providers (Vercel and Upstash) and emailed through Resend. Only Josie, the founder, can read submissions, and only when she needs to fix a problem with your plan. We never sell your information or share it with advertisers, schools, or anyone else. Your plan is only reachable by its private link, so be careful who you forward it to. To have your plan and everything you submitted permanently deleted, email [DELETE EMAIL] from the address you used on the form and we'll do it within [7] days and confirm by reply.

Notes for Josie:
- "Anthropic's Claude" is true and worth naming. Parents will ask. Anthropic's API terms say API inputs are not used to train its models by default; confirm the current wording before you rely on it, then consider adding "and not used to train AI models."
- This is a beta-period note, not the legal Privacy Policy (that is chunk 6, Termly). It should not promise things the legal version can't, so keep the retention line out until you decide it (see Decisions).
- Deletion is manual today: Josie removes the submission from Redis. That is fine at beta volume of 5 to 10 families.

---

## 2. Post-plan survey (5 questions)

Send the day the plan finishes, or have the plan-ready email link to it. Aim for under 5 minutes. Intro line:

> Thank you for being one of the first families through Scaffold. You're helping us fix things before anyone pays. Be blunt. "This was wrong" is the most useful thing you can tell us.

| # | Question | Answer format |
|---|----------|---------------|
| 1 | **What was wrong?** Anything inaccurate, outdated, off for your family, or that made you say "that's not right." Please name the school or section if you can. | Long text. Optional "Nothing I could find" checkbox. |
| 2 | **What was missing?** What did you want from this plan that it didn't give you? | Long text. |
| 3 | **What would you actually do?** Which parts of the plan will you act on in the next 30 days? | Checkboxes: Change my school list / Apply to a school I hadn't considered / Change application rounds or deadlines (ED, EA, RD) / Apply for specific scholarships / Change how we approach financial aid or FAFSA/CSS / Have a different conversation with my student / Talk to a counselor or school with new questions / Nothing yet. Plus "Other" text. |
| 4 | **If this had cost money, would you have paid for it?** | Single choice: Yes, definitely / Probably / Not sure / Probably not / No. |
| 5 | **What's the most you think this is worth?** Assume it's the plan you just read, delivered the same way. | Single choice: Under $25 / $25 / $50 / $75 / $99 / $150 / $200 or more. Optional text: "Why that number?" |

Optional add-on (not counted in the five, one tap): "How likely are you to recommend Scaffold to another parent?" 0 to 10. This is the number the hero stat "% who'd recommend" would use. Decide whether to include it (see Decisions).

Notes:
- Q4 and Q5 feed the $99 price test in the project plan. Ask Q4 before Q5 so people aren't anchored by the price list first.
- Q3 is deliberately about action, since "did it change what they'd do" is a stronger proof point than a star rating.
- Add two hidden fields to every response: plan id and a tag for beta cohort, so answers can be matched to the plan without asking the parent to re-enter anything.

---

## 3. Intake consent checkbox (outcomes follow-up)

Placement: Step 7, just above the Submit button. Unchecked by default. Optional, and the plan builds either way. Make sure the form text says so.

> ☐ **Yes, you can email me about how things turn out.** I'm OK with Scaffold emailing me once in spring 2027 (and once more after that if I'm still applying) to ask where my student applied, what they got, and what the real costs were. It takes about 10 minutes, and I'll get a **[$X] gift card** when I finish it. My answers help show whether Scaffold's advice holds up, and I understand they may be used in anonymous form, with no names, on the Scaffold website and in write-ups. I can opt out any time by replying to any email.

Shorter alternative if the block is too long for the form:

> ☐ Email me once this spring about how admissions and aid turned out. A 10-minute survey, and I get a **[$X] gift card**. My answers can be used anonymously, with no names.

Notes:
- The "anonymous, no names" line is what lets you later publish hero stats and the accuracy ledger without going back for permission. If you'd rather publish school-level comparisons (for example, a Scaffold estimate vs. a real aid offer at a named school), keep school names in and strip family identifiers only. The wording above allows that, since it says no names of people.
- Because the student is a minor, the consenting adult is the parent. The wording says "my student" and "my answers" to make that clear.
- Gift card timing is a promise. Decide how it is delivered and by when (see Decisions).

---

## 4. Spring outcomes survey

Send in April 2027, after most decisions are out and before the May 1 deposit deadline for the families who haven't committed. A second send in June for anyone who answered "still deciding." Tell families they can skip any question.

**Intro:**

> Last fall you ran your family's college plan through Scaffold. Now we want to know how it actually went, including the parts the plan got wrong. About 10 minutes. You'll get your [$X] gift card when you finish. Skip anything you'd rather not answer.

**A. Where they applied.** One row per school. Repeat until done.

| Field | Format |
|-------|--------|
| School name | Text with autocomplete from the 1,492-school list if the tool supports it, otherwise plain text. |
| Application round | Single choice: Early Decision / Early Decision II / Early Action / Restrictive or Single-Choice Early Action / Regular Decision / Rolling / Transfer or other. |
| Was this school on your Scaffold plan? | Yes, as a safety / Yes, as a target / Yes, as a reach / Not on the plan. |

**B. Results.** For each school above.

| Field | Format |
|-------|--------|
| Decision | Admitted / Waitlisted / Denied / Deferred, then decided later / Withdrew before a decision. |
| If admitted: scholarship or honors program offered? | Yes / No. If yes: name and amount per year (text and number). |

**C. Actual aid offers.** The calibration data. For each school where they received an aid package.

| Field | Format |
|-------|--------|
| Total cost of attendance listed on the offer, per year | Dollar amount. |
| Grants and scholarships (money you don't repay), per year | Dollar amount. |
| Loans offered, per year | Dollar amount. |
| Work-study offered, per year | Dollar amount. |
| **Your real net cost per year** (what your family would pay out of pocket or borrow) | Dollar amount, plus "I'm not sure how to calculate this" so we can calculate it from the other fields. |
| Did you appeal or negotiate the offer? | No / Yes, no change / Yes, it improved by about $___. |
| Optional: upload or paste the award letter | File upload, clearly marked optional and delete-on-request. |

**D. Where they enrolled.**

| Field | Format |
|-------|--------|
| Where is your student going? | School name, or: Gap year / Community college / Still deciding / Not attending. |
| Main reason (pick up to 2) | Cost or aid / Academic fit / Distance from home / Campus feel / Specific program / Where friends are going / Other. |
| Is this the school you'd have predicted last fall? | Yes / No / Different from what we'd have guessed. |

**E. Which plan advice they used.**

| Field | Format |
|-------|--------|
| Which of these did you do because of the plan? | Checkboxes: Added a school to our list / Removed a school / Changed an application round / Applied for a specific scholarship / Filled out CSS Profile or a school-specific aid form / Used the state aid information / Used the essay or application guidance / Appealed an aid offer / Used the timeline and deadlines / None of these. |
| Which single piece of advice mattered most? | Long text. |
| Did you ignore any advice? Why? | Long text. |
| Did the plan's cost estimates match what you were offered? | Single choice: Very close / Somewhat close / Not close, we paid more / Not close, we paid less. |

**F. Open feedback.**

| Field | Format |
|-------|--------|
| What did the plan get wrong? | Long text. |
| What would have helped you most that you didn't have last fall? | Long text. |
| Anything you'd tell a parent about to start this process? | Long text, with a checkbox "OK to quote this on the Scaffold website, first name only or anonymous." |
| Would you recommend Scaffold to another parent? | 0 to 10. |

**Footer:**

> Thank you. Your gift card will arrive by email within [7] days. If you'd like your family's answers removed later, reply to any Scaffold email and we'll delete them.

Notes:
- Section C is what turns into "% of cost estimates within $X of real offers." Keep every dollar field numeric so it can be compared with the plan's stored net price per school without cleanup.
- Match survey answers to plan ids so you can compare predicted tiers (safety, target, reach) with actual decisions. Store the plan id as a hidden field in the survey link.
- Families with juniors will not have results until spring 2028. Only 12th graders get this survey in 2027. Flag those families at intake so you can send the right follow-up year.

---

## 5. Beta invite email

**Subject line options:**
- Can you try something I built? (free, about an hour)
- Will you be my first guinea pig?

**Body:**

> Hi [NAME],
>
> You know I've been building Scaffold, a tool that gives parents a real college strategy for their kid. A 20-plus page plan built from your family's actual details, with real cost and financial aid data for each school. It's the kind of planning families with private counselors get, for a lot less.
>
> I'm opening it to a small group of friends and family before anyone pays, and I'd love for you to be one of them. It's free.
>
> Here's what I'm asking:
> 1. Run your own family through it. Fill out the form (about 20 minutes), then the plan builds and I email you the link.
> 2. Read it, then give me honest feedback in a short survey. Tell me what's wrong. That's the point.
> 3. Optional: let me email you once next spring to hear how admissions and aid turned out. There's a [$X] gift card for it.
>
> If you have a student in 9th through 12th grade, that's perfect. If you're a current senior, you're especially helpful, because I'll learn how the advice held up against real decisions.
>
> Your link: https://scaffoldcollegestrategy.com/intake.html?code=[CODE]
>
> It asks about your student and your household finances, so I want you to know where that goes: only I can see it, I never share or sell it, and if you want everything deleted, you just ask me and I'll do it.
>
> Thank you. This helps more than you know.
>
> [YOUR NAME]

Notes:
- Confirm the live domain and the full `intake.html?code=` URL before sending. Use the real code only in the email, never in this file. (The code is also hard-coded in `src/intake.html`, so anyone who views source can find it. Consider a throwaway beta code before you invite people beyond close friends. See Decisions.)
- "About an hour" in the subject line counts the 20 minute form, the wait, and reading time. If you'd rather not promise the whole hour, change it to "about 20 minutes to start."

---

## 6. "What to expect" note

Placement: the email that goes out with the beta link, and optionally on the form's first screen. Short on purpose.

> **What to expect**
>
> - **The form takes about 20 minutes.** Take your time on the open-ended questions. The more you tell us about your kid and your family, the better the plan.
> - **Then your plan builds, for roughly 20 to 30 minutes.** You don't need to sit and watch.
> - **It's safe to close the tab.** Your plan keeps building without you. We'll email you a private link when it's ready, and you can bookmark the same link on the waiting screen.
> - **Check spam if nothing arrives.** The email comes from plans@scaffoldcollegestrategy.com.
> - **A computer is easier than a phone for the form,** but either works.
> - **If something looks broken or confusing,** reply to the email and tell me. I read every one.

Notes:
- Matches what the form already says today (20 minutes plus 20 to 30 minutes of build, tab-close is safe, emailed link). If chunk 5's mobile pass lets you drop the computer note from the form, drop it here too.

---

## Decisions Josie needs to make

1. **Gift card amount `[$X]`.** It needs to be large enough to actually get spring responses and small enough to scale to launch (cost per responding family adds to the ~$7 API cost). Also decide whether it is the same for every family, who sends it (Amazon, Visa, Target), and the promised delivery window (drafts say 7 days).
2. **Survey tool.** Options: Google Forms (free, easy, but hard to join with plan ids and clumsy for repeating "one row per school" in section 4), Tally or Typeform (better branching and hidden fields, free or paid tier), or a small page built into the site that writes to Redis. The spring survey's repeating school rows are the hard part. Decide before building anything.
3. **Where answers are stored, and who can see them.** Survey tool's own storage, a spreadsheet, or Redis next to each plan. Decide whether answers are tied to the plan id (needed for the accuracy ledger and hero stats) and whether Redis snapshots in `data/backups/` will ever hold survey data. Note that backups are committed to git.
4. **Retention and deletion window.** How long do plans and submissions live, and how fast do you delete on request (drafts say 7 days)? Matches the retention item in the project plan. Also confirm you are comfortable with manual deletion at beta scale.
5. **Anthropic training line.** Confirm the current Anthropic API data-use terms before adding "not used to train AI models" to the privacy note.
6. **What "anonymous" allows.** Can you publish named schools alongside Scaffold's estimate vs. the real offer? The consent wording assumes yes, with no personal names.
7. **Recommend question.** Include the 0 to 10 "would you recommend" question in the beta survey (needed for the hero stat), or keep to exactly five questions.
8. **Bypass code for the beta.** `Millie2026` is hard-coded in `src/intake.html` and anyone can read it. Keep it for close friends and Jon's family, or switch to a beta-specific code (a code change, not part of this doc) before wider invites.
9. **Who gets invited, and which grades.** Include 12th graders so results land in spring 2027. Decide how many juniors to include knowing their outcomes arrive in 2028, and whether to track a "follow-up year" tag at intake.
10. **Invite email voice and subject line.** Pick a subject, and decide whether the email goes to Jon's family separately with a more specific note (see `docs/jon-message-draft.md`).
