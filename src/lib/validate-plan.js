// Programmatic plan validator. Runs deterministic code checks on a generated
// plan before the Claude quality review. Auto-fixes what is mechanically safe
// (JSON-block-only changes that cannot contradict the narrative) and flags
// everything else so the Claude review + fix-plan loop corrects narrative and
// JSON together.
//
// Flags map to review.js check keys so review.js can force-fail the matching
// check and fix-plan can build find/replace operations from the detail text.

const schoolData = require("./school-data");

// Keep in sync with prompts/financial-aid-facts.md section 1.
// Matching is case-insensitive substring against the JSON school name.
const NO_MERIT_SCHOOLS = [
  "harvard", "yale", "princeton", "columbia", "university of pennsylvania",
  "upenn", "brown", "dartmouth", "cornell",
  "stanford", "massachusetts institute of technology", "mit", "caltech",
  "california institute of technology", "georgetown",
  "amherst", "barnard", "bowdoin", "colby", "haverford", "middlebury",
  "pomona", "reed", "swarthmore", "wellesley", "williams college",
];

// Fallback for schools not in the data directory. Matches the explicit list
// in the generation prompt's REA/SCEA rule.
const KNOWN_PRIVATE_SCHOOLS = [
  "harvard", "yale", "princeton", "columbia", "pennsylvania", "upenn", "brown",
  "dartmouth", "cornell", "stanford", "massachusetts institute of technology",
  "mit", "caltech", "georgetown", "duke", "emory", "rice", "vanderbilt",
  "northwestern", "johns hopkins", "washington university in st", "washu",
  "carnegie mellon", "university of southern california", "usc",
  "new york university", "nyu", "boston university", "boston college",
  "northeastern", "tulane", "wake forest", "lehigh", "villanova",
  "case western", "university of chicago", "notre dame", "university of miami",
  "university of rochester", "syracuse", "fordham", "american university",
  "george washington", "tufts", "brandeis", "rensselaer", "rochester institute",
  "worcester polytechnic", "santa clara", "pepperdine", "southern methodist",
  "texas christian", "baylor", "elon", "drexel", "depaul", "marquette",
  "loyola", "gonzaga", "creighton", "dayton", "denison", "oberlin", "kenyon",
  "grinnell", "macalester", "carleton", "davidson", "colgate", "hamilton",
  "bates", "bucknell", "richmond", "skidmore", "vassar", "wesleyan",
];

const MONEY_TOLERANCE = 3000;

// ---------------------------------------------------------------------------
// JSON params block helpers
// ---------------------------------------------------------------------------

const PARAMS_BLOCK_RE = /```json-simulation-params\s*([\s\S]*?)```/;

function extractParamsBlock(output) {
  const match = output.match(PARAMS_BLOCK_RE);
  if (!match) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch (e) {
    return { raw: match[1], parsed: null, parseError: e.message };
  }
  return { raw: match[1], parsed, parseError: null };
}

// Pad/trim admit_pct values to exactly 3 decimal places in the raw block text.
// String surgery, not re-serialization: JSON.stringify would strip the
// trailing zeros this rule requires (0.450 -> 0.45).
function fixAdmitPctDecimals(rawBlock, autoFixes) {
  return rawBlock.replace(
    /("admit_pct"\s*:\s*)([0-9]*\.?[0-9]+)/g,
    (full, prefix, num) => {
      const decimals = (num.split(".")[1] || "").length;
      if (decimals === 3) return full;
      const fixed = Number(num).toFixed(3);
      autoFixes.push({
        check: "admit_rates",
        detail: `admit_pct ${num} rewritten as ${fixed} (3-decimal rule)`,
      });
      return prefix + fixed;
    }
  );
}

// Zero out merit fields for no-merit schools inside the raw block text.
// School objects in the params block are flat, so each {...} is one school.
function fixNoMeritSchools(rawBlock, autoFixes) {
  return rawBlock.replace(/\{[^{}]*\}/g, (objText) => {
    let school;
    try {
      school = JSON.parse(objText);
    } catch (e) {
      return objText;
    }
    if (!school.name || !isNoMeritSchool(school.name)) return objText;
    if (!school.merit_pct && !school.merit_low && !school.merit_high) {
      return objText;
    }
    autoFixes.push({
      check: "no_merit_schools",
      school: school.name,
      detail: `${school.name} is need-based-aid-only; JSON merit_pct/merit_low/merit_high zeroed (was ${school.merit_pct}/${school.merit_low}/${school.merit_high})`,
    });
    return objText
      .replace(/("merit_pct"\s*:\s*)[0-9.]+/, "$10.0")
      .replace(/("merit_low"\s*:\s*)[0-9.]+/, "$10")
      .replace(/("merit_high"\s*:\s*)[0-9.]+/, "$10");
  });
}

function isNoMeritSchool(name) {
  const n = name.toLowerCase();
  return NO_MERIT_SCHOOLS.some((s) => n.includes(s));
}

// ---------------------------------------------------------------------------
// School type lookup (public vs private)
// ---------------------------------------------------------------------------

function isPrivateSchool(name) {
  try {
    const slug = schoolData.findSchoolSlug(name, schoolData.getSchoolList());
    if (slug) {
      const school = schoolData.loadSchool(slug);
      if (school && school.type) return school.type === "private";
    }
  } catch (e) {
    // fall through to the static list
  }
  const n = name.toLowerCase();
  if (KNOWN_PRIVATE_SCHOOLS.some((s) => n.includes(s))) return true;
  return null; // unknown
}

// ---------------------------------------------------------------------------
// Check: REA/SCEA constraint
// ---------------------------------------------------------------------------

function checkReaScea(params, flags) {
  const schools = params.schools || [];
  const reaSchool = schools.find((s) =>
    /\b(REA|SCEA)\b/i.test(String(s.round || ""))
  );
  if (!reaSchool) return;

  for (const s of schools) {
    if (s === reaSchool) continue;
    const round = String(s.round || "").toUpperCase().trim();
    // ED2/ED II in January is allowed alongside REA/SCEA; EA and ED1 are not.
    const isEarlyRound =
      round === "EA" || round === "ED" || round === "ED1" || round === "ED I";
    if (!isEarlyRound) continue;
    const isPrivate = isPrivateSchool(s.name);
    if (isPrivate === true) {
      flags.push({
        check: "rea_scea_constraint",
        school: s.name,
        severity: "fix",
        detail: `${reaSchool.name} is ${reaSchool.round}, so ${s.name} (private) cannot be ${s.round}. Change ${s.name} to RD (or ED2) in the JSON round field, the executive summary table, the per-school writeup, and anywhere else its application round appears.`,
      });
    } else if (isPrivate === null) {
      flags.push({
        check: "rea_scea_constraint",
        school: s.name,
        severity: "review",
        detail: `${reaSchool.name} is ${reaSchool.round} and ${s.name} is marked ${s.round}. Could not determine from data whether ${s.name} is private. If it is private, it must move to RD (or ED2).`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check: tier consistency between JSON and markdown tables
// ---------------------------------------------------------------------------

function nameVariants(name) {
  const variants = [name];
  const stripped = name
    .replace(/\s+(university|college|institute of technology)$/i, "")
    .trim();
  if (stripped.length >= 4 && stripped !== name) variants.push(stripped);
  return variants.map((v) => v.toLowerCase());
}

function checkTierConsistency(output, params, flags) {
  const narrative = output.replace(PARAMS_BLOCK_RE, "");
  // Only table rows and explicit "Tier:" lines. Prose mentions of
  // "reach"/"safety" are too noisy for code; the Claude review covers those.
  const candidateLines = narrative
    .split("\n")
    .filter((l) => l.trim().startsWith("|") || /\btier\b\s*[:*]/i.test(l));

  for (const school of params.schools || []) {
    if (!school.name || !school.tier) continue;
    const variants = nameVariants(school.name);
    const jsonTier = String(school.tier).toLowerCase();
    const seen = new Map(); // tier -> example line

    for (const line of candidateLines) {
      const lineLC = line.toLowerCase();
      if (!variants.some((v) => lineLC.includes(v))) continue;
      const tierMatch = lineLC.match(/\b(reach|target|safety)\b/);
      if (tierMatch && !seen.has(tierMatch[1])) {
        seen.set(tierMatch[1], line.trim().slice(0, 160));
      }
    }

    const tiersFound = [...seen.keys()];
    if (tiersFound.length === 0) continue;
    const conflicts = tiersFound.filter((t) => t !== jsonTier);
    if (conflicts.length === 0 && tiersFound.length <= 1) continue;
    if (conflicts.length > 0 || tiersFound.length > 1) {
      const evidence = [...seen.entries()]
        .map(([t, line]) => `"${t}" in: ${line}`)
        .join(" | ");
      flags.push({
        check: "cost_consistency",
        school: school.name,
        severity: "fix",
        detail: `Tier mismatch for ${school.name}: JSON params say "${school.tier}" but the document tables show ${evidence}. Pick the correct tier and make it identical everywhere.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check: sticker cost vs verified data (and residency rate)
// ---------------------------------------------------------------------------

function expectedStickerCosts(school) {
  // Prefer CDS (private tuition + fees + room/board), fall back to Scorecard.
  const out = {};
  const cds = school.cds || {};
  const sc = school.scorecard || {};
  if (cds.tuition_private) {
    const total =
      cds.tuition_private + (cds.required_fees || 0) + (cds.room_board || 0);
    out.in_state = total;
    out.out_of_state = total;
  } else if (cds.tuition_in_state || cds.tuition_out_of_state) {
    const fees = (cds.required_fees || 0) + (cds.room_board || 0);
    if (cds.tuition_in_state) out.in_state = cds.tuition_in_state + fees;
    if (cds.tuition_out_of_state)
      out.out_of_state = cds.tuition_out_of_state + fees;
  }
  if (out.in_state == null && sc.total_cost_in_state)
    out.in_state = sc.total_cost_in_state;
  if (out.out_of_state == null && sc.total_cost_out_of_state)
    out.out_of_state = sc.total_cost_out_of_state;
  return out;
}

// Auto-fixes wrong JSON sticker_cost values to the verified number (the
// validator computes the correct figure itself, so LLM involvement is
// unnecessary). Leaves a review-severity flag so the reviewer verifies the
// narrative agrees with the corrected number.
function fixStickerCosts(rawBlock, formData, autoFixes, flags) {
  const familyState = (
    formData.state || schoolData.parseState(formData.city) || ""
  )
    .toUpperCase()
    .slice(0, 2);

  return rawBlock.replace(/\{[^{}]*\}/g, (objText) => {
    let s;
    try {
      s = JSON.parse(objText);
    } catch (e) {
      return objText;
    }
    if (!s.name || s.sticker_cost == null) return objText;
    let school = null;
    try {
      const slug = schoolData.findSchoolSlug(s.name, schoolData.getSchoolList());
      if (slug) school = schoolData.loadSchool(slug);
    } catch (e) {
      return objText;
    }
    if (!school) return objText;

    const expected = expectedStickerCosts(school);
    const inState = familyState && school.state === familyState;
    const correct = inState ? expected.in_state : expected.out_of_state;
    const wrong = inState ? expected.out_of_state : expected.in_state;
    if (correct == null) return objText;
    if (Math.abs(s.sticker_cost - correct) <= MONEY_TOLERANCE) return objText;

    const rounded = Math.round(correct);
    const wrongResidency =
      wrong != null && wrong !== correct && Math.abs(s.sticker_cost - wrong) <= MONEY_TOLERANCE;

    autoFixes.push({
      check: "verified_data_usage",
      school: s.name,
      detail: `${s.name}: JSON sticker_cost $${s.sticker_cost} auto-corrected to verified $${rounded} (${inState ? "in-state" : "out-of-state"}${wrongResidency ? "; the old value matched the wrong residency rate" : ""})`,
    });
    flags.push({
      check: wrongResidency ? "residency" : "cost_consistency",
      school: s.name,
      severity: "review",
      detail: `${s.name}: JSON sticker_cost was auto-corrected from $${s.sticker_cost} to the verified $${rounded} (${inState ? "in-state" : "out-of-state"}). Verify the narrative sticker and net-cost estimates for ${s.name} use $${rounded}; if any section still shows $${s.sticker_cost} or derives net costs from it, FAIL with the exact text to change.`,
    });
    return objText.replace(/("sticker_cost"\s*:\s*)[0-9]+/, `$1${rounded}`);
  });
}

// ---------------------------------------------------------------------------
// Check: JSON-derived net cost vs narrative table cost
// ---------------------------------------------------------------------------

function parseMoneyRange(text) {
  // "$18-22K", "$18K-$22K", "$18,000-$22,000", "$45K", "$45,000"
  const range = text.match(
    /\$\s*([\d,.]+)\s*[Kk]?\s*[-–—]\s*\$?\s*([\d,.]+)\s*([Kk])?/
  );
  const toNum = (str, hasK) => {
    let v = parseFloat(str.replace(/,/g, ""));
    if (hasK || v < 1000) v *= 1000;
    return v;
  };
  if (range) {
    const hasK = !!range[3] || /[Kk]/.test(text);
    return { low: toNum(range[1], hasK), high: toNum(range[2], hasK) };
  }
  const single = text.match(/\$\s*([\d,.]+)\s*([Kk])?/);
  if (single) {
    const v = toNum(single[1], !!single[2]);
    return { low: v, high: v };
  }
  return null;
}

function checkNetCostConsistency(output, params, flags) {
  const narrative = output.replace(PARAMS_BLOCK_RE, "");
  const tableRows = narrative
    .split("\n")
    .filter((l) => l.trim().startsWith("|"));

  for (const s of params.schools || []) {
    if (
      !s.name ||
      s.sticker_cost == null ||
      s.need_aid_low == null ||
      s.need_aid_high == null
    )
      continue;
    const meritMid =
      (s.merit_pct || 0) * (((s.merit_low || 0) + (s.merit_high || 0)) / 2);
    const needMid = (s.need_aid_low + s.need_aid_high) / 2;
    const derivedNet = Math.max(0, s.sticker_cost - needMid - meritMid);

    const variants = nameVariants(s.name);
    const row = tableRows.find((l) =>
      variants.some((v) => l.toLowerCase().includes(v))
    );
    if (!row) continue;
    const money = parseMoneyRange(row);
    // Skip ambiguous rows (more than one money token pair is hard to attribute).
    if (!money || money.low > 120000) continue;

    if (
      derivedNet < money.low - MONEY_TOLERANCE ||
      derivedNet > money.high + MONEY_TOLERANCE
    ) {
      flags.push({
        check: "cost_consistency",
        school: s.name,
        severity: "fix",
        detail: `${s.name}: the JSON params imply a median net cost of ~$${Math.round(derivedNet)} (sticker $${s.sticker_cost} minus need-aid midpoint $${Math.round(needMid)} minus expected merit $${Math.round(meritMid)}), but the document table shows "${row.trim().slice(0, 160)}". These differ by more than $${MONEY_TOLERANCE}. Adjust the narrative estimate or the JSON aid ranges so they agree.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check: parameter sanity
// ---------------------------------------------------------------------------

function checkParamSanity(params, flags) {
  for (const s of params.schools || []) {
    const problems = [];
    if (s.admit_pct == null || s.admit_pct <= 0 || s.admit_pct > 1) {
      problems.push(`admit_pct ${s.admit_pct} must be a decimal between 0 and 1`);
    }
    if (s.sticker_cost != null && (s.sticker_cost < 5000 || s.sticker_cost > 100000)) {
      problems.push(`sticker_cost $${s.sticker_cost} is outside a plausible range`);
    }
    if (
      s.need_aid_high != null &&
      s.sticker_cost != null &&
      s.need_aid_high > s.sticker_cost
    ) {
      problems.push(`need_aid_high $${s.need_aid_high} exceeds sticker_cost $${s.sticker_cost}`);
    }
    if (s.merit_low != null && s.merit_high != null && s.merit_low > s.merit_high) {
      problems.push(`merit_low $${s.merit_low} exceeds merit_high $${s.merit_high}`);
    }
    if (problems.length > 0) {
      flags.push({
        check: "simulation_params",
        school: s.name || "(unnamed school)",
        severity: "fix",
        detail: `${s.name || "Unnamed school"}: ${problems.join("; ")}.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function validatePlan(output, formData) {
  const autoFixes = [];
  const flags = [];
  let fixedOutput = null;

  const block = extractParamsBlock(output || "");
  if (!block) {
    flags.push({
      check: "simulation_params",
      severity: "regen",
      detail:
        "The json-simulation-params block is missing from the document. The simulation cannot run. This requires regeneration.",
    });
    return { fixedOutput, autoFixes, flags };
  }
  if (!block.parsed) {
    flags.push({
      check: "simulation_params",
      severity: "regen",
      detail: `The json-simulation-params block does not parse as JSON (${block.parseError}). This requires regeneration or a targeted fix to the block.`,
    });
    return { fixedOutput, autoFixes, flags };
  }

  // Auto-fixes (JSON block string surgery). Collected separately so a broken
  // reparse can discard fixes AND their companion flags together.
  const rawFixes = [];
  const rawFlags = [];
  let fixedRaw = fixAdmitPctDecimals(block.raw, rawFixes);
  fixedRaw = fixNoMeritSchools(fixedRaw, rawFixes);
  fixedRaw = fixStickerCosts(fixedRaw, formData || {}, rawFixes, rawFlags);

  let params = block.parsed;
  if (fixedRaw !== block.raw) {
    try {
      params = JSON.parse(fixedRaw.trim());
      fixedOutput = output.replace(
        PARAMS_BLOCK_RE,
        "```json-simulation-params\n" + fixedRaw.trim() + "\n```"
      );
      autoFixes.push(...rawFixes);
      flags.push(...rawFlags);
    } catch (e) {
      // Auto-fix broke the JSON somehow: discard it, validate the original.
      params = block.parsed;
      fixedOutput = null;
    }
  }

  // Flag-only checks
  checkReaScea(params, flags);
  checkTierConsistency(output, params, flags);
  checkNetCostConsistency(output, params, flags);
  checkParamSanity(params, flags);

  return { fixedOutput, autoFixes, flags };
}

module.exports = { validatePlan };
