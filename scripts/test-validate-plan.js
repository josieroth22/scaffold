const { validatePlan } = require("../src/lib/validate-plan.js");

const output = `# Jordan's College Strategy

## Executive Summary

| # | School | Tier | Round | Est. Net Cost | Risk |
|---|--------|------|-------|---------------|------|
| 1 | Stanford University* | Reach | REA | $58-65K | Very High |
| 2 | Case Western Reserve University | Target | EA | $35-40K | Moderate |
| 3 | Harvard University | Reach | RD | $55-62K | Very High |
| 4 | North Carolina State University | Target | EA | $30-34K | Low |
| 5 | University of Georgia | Safety | EA | $14-18K | Very Low |

## School List

### 4. North Carolina State University
NC State is a safety for this profile.

\`\`\`json-simulation-params
{
  "schools": [
    {
      "name": "Stanford University",
      "tier": "reach",
      "admit_pct": 0.04,
      "merit_pct": 0.0,
      "merit_low": 0,
      "merit_high": 0,
      "need_aid_low": 20000,
      "need_aid_high": 30000,
      "sticker_cost": 87000,
      "round": "REA"
    },
    {
      "name": "Case Western Reserve University",
      "tier": "target",
      "admit_pct": 0.45,
      "merit_pct": 0.6,
      "merit_low": 25000,
      "merit_high": 35000,
      "need_aid_low": 10000,
      "need_aid_high": 18000,
      "sticker_cost": 70000,
      "round": "EA"
    },
    {
      "name": "Harvard University",
      "tier": "reach",
      "admit_pct": 0.035,
      "merit_pct": 0.3,
      "merit_low": 10000,
      "merit_high": 20000,
      "need_aid_low": 25000,
      "need_aid_high": 35000,
      "sticker_cost": 87000,
      "round": "RD"
    },
    {
      "name": "North Carolina State University",
      "tier": "safety",
      "admit_pct": 0.40,
      "merit_pct": 0.3,
      "merit_low": 5000,
      "merit_high": 10000,
      "need_aid_low": 5000,
      "need_aid_high": 9000,
      "sticker_cost": 48000,
      "round": "EA"
    }
  ],
  "family_budget": 30000
}
\`\`\`
`;

const result = validatePlan(output, { city: "Atlanta, GA", state: "GA" });
console.log("=== AUTO-FIXES ===");
for (const f of result.autoFixes) console.log(`[${f.check}] ${f.detail}`);
console.log("\n=== FLAGS ===");
for (const f of result.flags) console.log(`[${f.check}|${f.severity}] ${f.detail}\n`);
console.log("=== FIXED BLOCK ===");
const m = (result.fixedOutput || "").match(/```json-simulation-params\s*([\s\S]*?)```/);
if (m) {
  const admits = m[1].match(/"admit_pct":\s*[\d.]+/g);
  console.log("admit_pct values:", admits);
  const harvard = m[1].match(/\{[^{}]*Harvard[^{}]*\}/)[0];
  console.log("Harvard merit fields:", harvard.match(/"merit_\w+":\s*[\d.]+/g));
  JSON.parse(m[1].trim());
  console.log("fixed block parses: OK");
} else {
  console.log("(no fixed output)");
}

// Edge cases
console.log("\n=== EDGE: missing block ===");
console.log(validatePlan("no json here", {}).flags);
console.log("\n=== EDGE: broken json ===");
console.log(validatePlan("```json-simulation-params\n{broken\n```", {}).flags);

// ---------------------------------------------------------------------------
// Assertion cases (Oct 2026: REA merit-deadline exception, full-pay need aid,
// Safety (admission only) label). Exit code 1 on any failure.
// ---------------------------------------------------------------------------

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

function plan(narrative, schools, budget = 60000) {
  const full = schools.map((s) => ({
    tier: "target", admit_pct: 0.5, merit_pct: 0, merit_low: 0, merit_high: 0,
    need_aid_low: 0, need_aid_high: 0, sticker_cost: 60000, ...s,
  }));
  return `${narrative}\n\n\`\`\`json-simulation-params\n${JSON.stringify({ schools: full, family_budget: budget }, null, 2)}\n\`\`\`\n`;
}
const flagsFor = (out, checkKey, school) =>
  validatePlan(out, { city: "Naperville, IL", state: "IL" }).flags.filter(
    (f) => f.check === checkKey && (!school || f.school === school)
  );

console.log("\n=== ASSERTIONS ===");

// Original fixture: Stanford REA, Case Western EA with no merit reason -> fix.
check(
  "Stanford REA + Case Western EA, no merit reason: fix",
  result.flags.some((f) => f.check === "rea_scea_constraint" && f.school === "Case Western Reserve University" && f.severity === "fix")
);

const usc = { name: "University of Southern California", round: "EA" };
const meritLine = "USC requires its Early Action deadline (Dec 1) for merit scholarship consideration, so it stays EA.";

let f = flagsFor(plan(meritLine, [{ name: "Stanford University", round: "REA" }, usc]), "rea_scea_constraint", usc.name);
check("Stanford REA + USC EA with merit reason: one review flag", f.length === 1 && f[0].severity === "review");

f = flagsFor(plan("USC is a great fit.", [{ name: "Stanford University", round: "REA" }, usc]), "rea_scea_constraint", usc.name);
check("Stanford REA + USC EA without merit reason: fix", f.length === 1 && f[0].severity === "fix");

f = flagsFor(plan(meritLine, [{ name: "Harvard University", round: "SCEA" }, usc]), "rea_scea_constraint", usc.name);
check("Harvard SCEA + USC EA with merit reason: review", f.length === 1 && f[0].severity === "review");

f = flagsFor(plan(meritLine, [{ name: "Stanford University", round: "REA" }, { ...usc, round: "ED" }]), "rea_scea_constraint", usc.name);
check("Stanford REA + USC ED (binding): fix even with merit reason", f.length === 1 && f[0].severity === "fix");

f = flagsFor(plan(meritLine, [{ name: "Yale University", round: "SCEA" }, usc]), "rea_scea_constraint", usc.name);
check("Yale SCEA + USC EA with merit reason: fix (exception is Harvard/Stanford only)", f.length === 1 && f[0].severity === "fix");

f = flagsFor(plan("", [{ name: "Stanford University", round: "REA" }, { name: "Purdue University", round: "EA" }]), "rea_scea_constraint");
check("Stanford REA + public EA: no flag", f.length === 0);

// Full-pay need aid
const fullPaySchools = [
  { name: "Indiana University Bloomington", need_aid_low: 20000, need_aid_high: 28000 },
  { name: "University of Illinois Urbana-Champaign", need_aid_low: 3000, need_aid_high: 7000 },
  { name: "Case Western Reserve University", need_aid_low: 6000, need_aid_high: 14000 },
  { name: "Purdue University", need_aid_low: 0, need_aid_high: 0 },
];
const fullPayText = "At $310K, your family will get essentially zero need-based aid anywhere.";
f = flagsFor(plan(fullPayText, fullPaySchools), "cost_consistency").filter((x) => /blanket claim/.test(x.detail));
const bySchool = Object.fromEntries(f.map((x) => [x.school, x.severity]));
check("Full-pay: public with $24K need aid is fix", bySchool["Indiana University Bloomington"] === "fix");
check("Full-pay: private with $10K need aid is review", bySchool["Case Western Reserve University"] === "review");
check("Full-pay: $5K midpoint and $0 need aid not flagged", !("University of Illinois Urbana-Champaign" in bySchool) && !("Purdue University" in bySchool));

f = flagsFor(plan("Your family won’t qualify for need-based aid at the publics.", fullPaySchools), "cost_consistency").filter((x) => /blanket claim/.test(x.detail));
check("Full-pay: curly-apostrophe phrasing is detected", f.some((x) => x.school === "Indiana University Bloomington"));

f = flagsFor(plan("You will qualify for little to no need-based aid at most schools; MIT and Stanford are the exceptions.", fullPaySchools), "cost_consistency").filter((x) => /blanket claim/.test(x.detail));
check("Scoped claim (at most schools): no full-pay flags", f.length === 0);

f = flagsFor(plan("Expect meaningful need-based aid at most schools.", fullPaySchools), "cost_consistency").filter((x) => /blanket claim/.test(x.detail));
check("No full-pay claim: no full-pay flags", f.length === 0);

// Safety (admission only)
const safetySchools = [{ name: "Indiana University Bloomington", tier: "safety", sticker_cost: 52000 }];
const safetyTable = (label) =>
  `| # | School | Tier | Round | Est. Net Cost | Risk |\n|---|---|---|---|---|---|\n| 1 | Indiana University Bloomington | ${label} | EA | $50-54K | Very High |`;

let out = plan(safetyTable("Safety"), safetySchools, 25000);
f = flagsFor(out, "cost_consistency").filter((x) => /admission only/.test(x.detail));
check("Bare Safety + Very High: flagged", f.length === 1 && f[0].severity === "fix");

out = plan(safetyTable("Safety (admission only)"), safetySchools, 25000);
const all = validatePlan(out, { city: "Naperville, IL", state: "IL" }).flags;
check("Safety (admission only) + Very High: no label flag", !all.some((x) => /admission only/.test(x.detail) && /bare/.test(x.detail)));
check("Safety (admission only) matches JSON tier safety: no tier mismatch", !all.some((x) => /Tier mismatch/.test(x.detail)));

out = plan(safetyTable("Safety").replace("Very High", "Low"), safetySchools, 60000);
f = flagsFor(out, "cost_consistency").filter((x) => /admission only/.test(x.detail));
check("Bare Safety + Low risk: not flagged", f.length === 0);

console.log(failures === 0 ? "\nALL ASSERTIONS PASSED" : `\n${failures} ASSERTION(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
