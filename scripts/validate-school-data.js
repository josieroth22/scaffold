#!/usr/bin/env node

/**
 * Validates school JSON data in data/schools/.
 *
 * Checks each school file for:
 *   - Presence of scorecard, cds, and reference layers
 *   - Scorecard: admit_rate, SAT scores, tuition values are present and reasonable
 *   - CDS: admit_rate_overall between 0-1, positive tuition, SAT within bounds
 *   - Reference: merit_scholarships entries have name and amount fields
 *   - No obviously bad values (negative costs, admit rates > 1, SAT > 800 per section, etc.)
 *
 * Usage:
 *   node scripts/validate-school-data.js
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data", "schools");

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPositiveNumber(v) {
  return typeof v === "number" && v > 0 && isFinite(v);
}

function isBetween(v, lo, hi) {
  return typeof v === "number" && v >= lo && v <= hi;
}

// ── Per-school validation ────────────────────────────────────────────────────

function validateScorecard(school, errors, warnings) {
  const sc = school.scorecard;
  const name = school.name;

  // admit_rate
  if (sc.admit_rate == null) {
    warnings.push(`${name}: scorecard.admit_rate is missing`);
  } else if (!isBetween(sc.admit_rate, 0, 1)) {
    errors.push(`${name}: scorecard.admit_rate out of range: ${sc.admit_rate}`);
  }

  // SAT reading 25th
  if (sc.sat_reading_25 == null) {
    warnings.push(`${name}: scorecard.sat_reading_25 is missing`);
  } else if (!isBetween(sc.sat_reading_25, 200, 800)) {
    errors.push(`${name}: scorecard.sat_reading_25 out of range: ${sc.sat_reading_25}`);
  }

  // SAT math 25th
  if (sc.sat_math_25 == null) {
    warnings.push(`${name}: scorecard.sat_math_25 is missing`);
  } else if (!isBetween(sc.sat_math_25, 200, 800)) {
    errors.push(`${name}: scorecard.sat_math_25 out of range: ${sc.sat_math_25}`);
  }

  // SAT reading 75th
  if (sc.sat_reading_75 != null && !isBetween(sc.sat_reading_75, 200, 800)) {
    errors.push(`${name}: scorecard.sat_reading_75 out of range: ${sc.sat_reading_75}`);
  }

  // SAT math 75th
  if (sc.sat_math_75 != null && !isBetween(sc.sat_math_75, 200, 800)) {
    errors.push(`${name}: scorecard.sat_math_75 out of range: ${sc.sat_math_75}`);
  }

  // ACT bounds (optional)
  if (sc.act_25 != null && !isBetween(sc.act_25, 1, 36)) {
    errors.push(`${name}: scorecard.act_25 out of range: ${sc.act_25}`);
  }
  if (sc.act_75 != null && !isBetween(sc.act_75, 1, 36)) {
    errors.push(`${name}: scorecard.act_75 out of range: ${sc.act_75}`);
  }

  // Tuition: at least one should be present and positive
  const hasInState = isPositiveNumber(sc.tuition_in_state);
  const hasOutState = isPositiveNumber(sc.tuition_out_of_state);
  if (!hasInState && !hasOutState) {
    warnings.push(`${name}: scorecard has no positive tuition values`);
  }
  if (sc.tuition_in_state != null && sc.tuition_in_state < 0) {
    errors.push(`${name}: scorecard.tuition_in_state is negative: ${sc.tuition_in_state}`);
  }
  if (sc.tuition_out_of_state != null && sc.tuition_out_of_state < 0) {
    errors.push(`${name}: scorecard.tuition_out_of_state is negative: ${sc.tuition_out_of_state}`);
  }

  // Room & board (optional, but should be positive if present)
  if (sc.room_board != null && sc.room_board < 0) {
    errors.push(`${name}: scorecard.room_board is negative: ${sc.room_board}`);
  }

  // Total cost sanity (should not be negative)
  if (sc.total_cost_in_state != null && sc.total_cost_in_state < 0) {
    errors.push(`${name}: scorecard.total_cost_in_state is negative: ${sc.total_cost_in_state}`);
  }
  if (sc.total_cost_out_of_state != null && sc.total_cost_out_of_state < 0) {
    errors.push(`${name}: scorecard.total_cost_out_of_state is negative: ${sc.total_cost_out_of_state}`);
  }

  // Net price values should not be negative
  if (sc.net_price && typeof sc.net_price === "object") {
    for (const [bracket, val] of Object.entries(sc.net_price)) {
      if (val != null && typeof val === "number" && val < 0) {
        errors.push(`${name}: scorecard.net_price.${bracket} is negative: ${val}`);
      }
    }
  }

  // pell_rate and federal_loan_rate should be 0-1
  if (sc.pell_rate != null && !isBetween(sc.pell_rate, 0, 1)) {
    errors.push(`${name}: scorecard.pell_rate out of range: ${sc.pell_rate}`);
  }
  if (sc.federal_loan_rate != null && !isBetween(sc.federal_loan_rate, 0, 1)) {
    errors.push(`${name}: scorecard.federal_loan_rate out of range: ${sc.federal_loan_rate}`);
  }

  // enrollment should be positive
  if (sc.enrollment != null && sc.enrollment <= 0) {
    errors.push(`${name}: scorecard.enrollment is non-positive: ${sc.enrollment}`);
  }
}

function validateCds(school, errors, warnings, cdsMissingFields) {
  const cds = school.cds;
  const name = school.name;
  const missing = [];

  // admit_rate_overall
  if (cds.admit_rate_overall == null) {
    missing.push("admit_rate_overall");
    warnings.push(`${name}: cds.admit_rate_overall is missing`);
  } else if (!isBetween(cds.admit_rate_overall, 0, 1)) {
    errors.push(`${name}: cds.admit_rate_overall out of range: ${cds.admit_rate_overall}`);
  }

  // ED/EA admit rates (optional but if present should be 0-1)
  if (cds.ed_admit_rate != null && !isBetween(cds.ed_admit_rate, 0, 1)) {
    errors.push(`${name}: cds.ed_admit_rate out of range: ${cds.ed_admit_rate}`);
  }
  if (cds.ea_admit_rate != null && !isBetween(cds.ea_admit_rate, 0, 1)) {
    errors.push(`${name}: cds.ea_admit_rate out of range: ${cds.ea_admit_rate}`);
  }

  // SAT section scores (25th/75th) should be 200-800
  for (const field of ["sat_reading_25", "sat_reading_75", "sat_math_25", "sat_math_75"]) {
    if (cds[field] != null && !isBetween(cds[field], 200, 800)) {
      errors.push(`${name}: cds.${field} out of range: ${cds[field]}`);
    }
  }

  // SAT composite should be 400-1600
  for (const field of ["sat_composite_25", "sat_composite_75"]) {
    if (cds[field] != null && !isBetween(cds[field], 400, 1600)) {
      errors.push(`${name}: cds.${field} out of range: ${cds[field]}`);
    }
  }

  // Check if any SAT data at all
  const hasSatData = ["sat_reading_25", "sat_math_25", "sat_composite_25"].some(
    (f) => cds[f] != null
  );
  if (!hasSatData) {
    missing.push("SAT scores");
    warnings.push(`${name}: cds has no SAT score data`);
  }

  // ACT composite
  if (cds.act_composite_25 != null && !isBetween(cds.act_composite_25, 1, 36)) {
    errors.push(`${name}: cds.act_composite_25 out of range: ${cds.act_composite_25}`);
  }
  if (cds.act_composite_75 != null && !isBetween(cds.act_composite_75, 1, 36)) {
    errors.push(`${name}: cds.act_composite_75 out of range: ${cds.act_composite_75}`);
  }

  // Tuition: check all three possible fields, at least one should be positive
  const tuitionFields = ["tuition_in_state", "tuition_out_of_state", "tuition_private"];
  const hasTuition = tuitionFields.some((f) => isPositiveNumber(cds[f]));
  if (!hasTuition) {
    missing.push("tuition");
    warnings.push(`${name}: cds has no positive tuition values`);
  }
  for (const f of tuitionFields) {
    if (cds[f] != null && cds[f] < 0) {
      errors.push(`${name}: cds.${f} is negative: ${cds[f]}`);
    }
  }

  // Financial aid fields (should be non-negative if present)
  if (cds.pct_need_met != null && (cds.pct_need_met < 0 || cds.pct_need_met > 100)) {
    errors.push(`${name}: cds.pct_need_met out of range: ${cds.pct_need_met}`);
  }
  if (cds.avg_need_grant != null && cds.avg_need_grant < 0) {
    errors.push(`${name}: cds.avg_need_grant is negative: ${cds.avg_need_grant}`);
  }
  if (cds.avg_financial_aid_package != null && cds.avg_financial_aid_package < 0) {
    errors.push(`${name}: cds.avg_financial_aid_package is negative: ${cds.avg_financial_aid_package}`);
  }
  if (cds.avg_merit_award != null && cds.avg_merit_award < 0) {
    errors.push(`${name}: cds.avg_merit_award is negative: ${cds.avg_merit_award}`);
  }

  // Applicant counts should be non-negative
  if (cds.total_applicants != null && cds.total_applicants < 0) {
    errors.push(`${name}: cds.total_applicants is negative: ${cds.total_applicants}`);
  }
  if (cds.total_admitted != null && cds.total_admitted < 0) {
    errors.push(`${name}: cds.total_admitted is negative: ${cds.total_admitted}`);
  }

  // Admitted should not exceed applicants
  if (
    cds.total_applicants != null &&
    cds.total_admitted != null &&
    cds.total_admitted > cds.total_applicants
  ) {
    errors.push(
      `${name}: cds.total_admitted (${cds.total_admitted}) > total_applicants (${cds.total_applicants})`
    );
  }

  if (missing.length > 0) {
    cdsMissingFields.push({ name, missing });
  }
}

function validateReference(school, errors, warnings) {
  const ref = school.reference;
  const name = school.name;

  // merit_scholarships
  if (ref.merit_scholarships != null) {
    if (!Array.isArray(ref.merit_scholarships)) {
      errors.push(`${name}: reference.merit_scholarships is not an array`);
    } else {
      ref.merit_scholarships.forEach((entry, i) => {
        if (!entry.name) {
          errors.push(`${name}: reference.merit_scholarships[${i}] missing 'name'`);
        }
        if (!entry.amount && entry.amount !== 0) {
          errors.push(`${name}: reference.merit_scholarships[${i}] missing 'amount'`);
        }
      });
    }
  }

  // honors_program (optional, but if present validate structure)
  if (ref.honors_program != null) {
    if (typeof ref.honors_program !== "object" || Array.isArray(ref.honors_program)) {
      errors.push(`${name}: reference.honors_program is not an object`);
    } else if (!ref.honors_program.name) {
      warnings.push(`${name}: reference.honors_program is missing 'name'`);
    }
  }

  // national_merit (optional, validate if present)
  if (ref.national_merit != null) {
    if (typeof ref.national_merit !== "object" || Array.isArray(ref.national_merit)) {
      errors.push(`${name}: reference.national_merit is not an object`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

  let totalSchools = 0;
  let withScorecard = 0;
  let withCds = 0;
  let withReference = 0;
  let withAllThree = 0;

  const errors = [];
  const warnings = [];
  const cdsMissingFields = [];

  for (const file of files) {
    totalSchools++;
    const filePath = path.join(DATA_DIR, file);
    let school;
    try {
      school = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      errors.push(`${file}: failed to parse JSON: ${e.message}`);
      continue;
    }

    // Basic structure checks
    if (!school.slug) {
      warnings.push(`${file}: missing 'slug'`);
    }
    if (!school.name) {
      errors.push(`${file}: missing 'name'`);
      continue; // can't produce useful messages without a name
    }

    const hasScorecard = school.scorecard != null;
    const hasCds = school.cds != null;
    const hasReference = school.reference != null;

    if (hasScorecard) withScorecard++;
    if (hasCds) withCds++;
    if (hasReference) withReference++;
    if (hasScorecard && hasCds && hasReference) withAllThree++;

    if (!hasScorecard) {
      warnings.push(`${school.name}: scorecard is null`);
    }

    // Validate each layer
    if (hasScorecard) {
      validateScorecard(school, errors, warnings);
    }
    if (hasCds) {
      validateCds(school, errors, warnings, cdsMissingFields);
    }
    if (hasReference) {
      validateReference(school, errors, warnings);
    }
  }

  // ── Print summary ────────────────────────────────────────────────────────

  console.log("=".repeat(70));
  console.log("  SCHOOL DATA VALIDATION REPORT");
  console.log("=".repeat(70));
  console.log();
  console.log(`  Total school files:         ${totalSchools}`);
  console.log(`  With scorecard data:        ${withScorecard}`);
  console.log(`  With CDS data:              ${withCds}`);
  console.log(`  With reference data:        ${withReference}`);
  console.log(`  With all three layers:      ${withAllThree}`);
  console.log();

  // Coverage percentages
  console.log("  Coverage:");
  console.log(`    Scorecard:  ${((withScorecard / totalSchools) * 100).toFixed(1)}%`);
  console.log(`    CDS:        ${((withCds / totalSchools) * 100).toFixed(1)}%`);
  console.log(`    Reference:  ${((withReference / totalSchools) * 100).toFixed(1)}%`);
  console.log();

  // Errors
  console.log("-".repeat(70));
  console.log(`  ERRORS (${errors.length})`);
  console.log("-".repeat(70));
  if (errors.length === 0) {
    console.log("  None.");
  } else {
    for (const e of errors) {
      console.log(`  [ERROR] ${e}`);
    }
  }
  console.log();

  // Warnings -- group by category for readable output
  console.log("-".repeat(70));
  console.log(`  WARNINGS (${warnings.length} total)`);
  console.log("-".repeat(70));
  if (warnings.length === 0) {
    console.log("  None.");
  } else {
    // Categorize warnings
    const warnCategories = {};
    const warnExamples = {};
    for (const w of warnings) {
      // Extract the part after the school name (after first ": ")
      const colonIdx = w.indexOf(": ");
      const category = colonIdx >= 0 ? w.slice(colonIdx + 2) : w;
      if (!warnCategories[category]) {
        warnCategories[category] = 0;
        warnExamples[category] = [];
      }
      warnCategories[category]++;
      if (warnExamples[category].length < 3) {
        const schoolName = colonIdx >= 0 ? w.slice(0, colonIdx) : "(unknown)";
        warnExamples[category].push(schoolName);
      }
    }
    // Sort by count descending
    const sorted = Object.entries(warnCategories).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sorted) {
      console.log(`  [${count} schools] ${category}`);
      console.log(`      e.g.: ${warnExamples[category].join(", ")}`);
    }
  }
  console.log();

  // CDS missing key fields
  console.log("-".repeat(70));
  console.log(`  CDS SCHOOLS MISSING KEY FIELDS (${cdsMissingFields.length})`);
  console.log("-".repeat(70));
  if (cdsMissingFields.length === 0) {
    console.log("  None.");
  } else {
    for (const entry of cdsMissingFields) {
      console.log(`  ${entry.name}: missing [${entry.missing.join(", ")}]`);
    }
  }
  console.log();
  console.log("=".repeat(70));
  console.log("  Validation complete.");
  console.log("=".repeat(70));

  // Exit with error code if any errors found
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
