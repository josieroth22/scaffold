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
