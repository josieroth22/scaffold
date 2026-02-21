#!/usr/bin/env node

/**
 * Parses scholarship and honors college PDFs from College Transitions,
 * extracts structured data via Claude API, and merges into school JSON files
 * under the "reference" key.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default();

const CONTEXT_DIR = path.join(__dirname, "..", "Other Context- Scholarships and Honors");
const SCHOOLS_DIR = path.join(__dirname, "..", "data", "schools");
const PDFTOTEXT = "/opt/homebrew/bin/pdftotext";
const MODEL = "claude-opus-4-20250514";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Load all school JSON files for matching
function loadSchoolIndex() {
  const files = fs.readdirSync(SCHOOLS_DIR).filter((f) => f.endsWith(".json"));
  const schools = [];
  for (const file of files) {
    const filePath = path.join(SCHOOLS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    schools.push({ filePath, slug: data.slug, name: data.name, data });
  }
  return schools;
}

// Special-case mappings for school names that don't match via normalization
const SCHOOL_NAME_ALIASES = {
  "college of william and mary": "william & mary",
  "william and mary": "william & mary",
  "brandeis college": "brandeis university",
};

function findSchool(schoolName, schools) {
  const norm = normalize(schoolName);

  // Check aliases first
  const aliasTarget = SCHOOL_NAME_ALIASES[norm];
  if (aliasTarget) {
    const aliasNorm = normalize(aliasTarget);
    const aliasMatch = schools.find((s) => normalize(s.name) === aliasNorm);
    if (aliasMatch) return aliasMatch;
  }

  // Exact match
  let match = schools.find((s) => normalize(s.name) === norm);
  if (match) return match;

  // Word overlap (threshold >= 0.5 to catch borderline cases)
  const words = new Set(norm.split(" ").filter((w) => w.length > 2));
  let best = null;
  let bestScore = 0;
  for (const s of schools) {
    const sWords = new Set(normalize(s.name).split(" ").filter((w) => w.length > 2));
    let overlap = 0;
    for (const w of words) if (sWords.has(w)) overlap++;
    const score = overlap / Math.max(words.size, sWords.size);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

async function parseScholarshipPDFs() {
  const schools = loadSchoolIndex();
  console.log(`Loaded ${schools.length} school files\n`);

  // --- 1. Generous Scholarships ---
  console.log("=== Parsing: Selective Colleges with Generous Scholarships ===");
  const schol1 = execSync(
    `${PDFTOTEXT} -layout "${CONTEXT_DIR}/Selective Colleges with Generous Scholarships.pdf" - 2>/dev/null`
  ).toString();
  const schol2 = execSync(
    `${PDFTOTEXT} -layout "${CONTEXT_DIR}/Selective Colleges with Generous Scholarships part 2.pdf" - 2>/dev/null`
  ).toString();
  const scholText = schol1 + "\n\n" + schol2;

  const scholPrompt = `Extract all scholarship data from this College Transitions "Selective Colleges with Generous Scholarships" document.

Return a JSON array where each element has:
{
  "school": "Institution name exactly as listed",
  "scholarships": [
    {
      "name": "The name/title of the scholarship program (e.g., 'Paul Tulane Award', 'Presidential Scholarship', 'Dean's Merit Award')",
      "amount": "The dollar value or tuition coverage of the award, NOT the scholarship name. Examples: 'Full tuition', '$25,000/year', 'Half tuition', '$10,000 renewable'. This must describe how much money the student receives.",
      "deadline": "Application deadline if listed",
      "requirements": "Additional requirements beyond the application (e.g., 'Essay', 'Interview', 'Audition')"
    }
  ]
}

IMPORTANT: The "name" field is the scholarship's title/label. The "amount" field is the monetary value or tuition coverage. Do NOT put the scholarship name in the amount field.

Include ALL schools and ALL scholarships from the tables. Return ONLY valid JSON, no other text.

Document text:
${scholText}`;

  console.log("  Sending to Claude API...");
  const scholResp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: scholPrompt }],
  });
  const scholJson = extractJson(scholResp);
  console.log(`  Extracted ${scholJson.length} schools with scholarship data`);

  await sleep(1000);

  // --- 2. National Merit Scholarships ---
  console.log("\n=== Parsing: National Merit Scholarships ===");
  const merit1 = execSync(
    `${PDFTOTEXT} -layout "${CONTEXT_DIR}/Selective Colleges Offering National Merit Scholarships.pdf" - 2>/dev/null`
  ).toString();
  const merit2 = execSync(
    `${PDFTOTEXT} -layout "${CONTEXT_DIR}/Selective Colleges Offering National Merit Scholarships part 2.pdf" - 2>/dev/null`
  ).toString();
  const meritText = merit1 + "\n\n" + merit2;

  const meritPrompt = `Extract all National Merit Scholarship data from this College Transitions document.

Return a JSON array where each element has:
{
  "school": "Institution name exactly as listed",
  "national_merit": {
    "semifinalist_award": "Annual award for semi-finalists (or 'None')",
    "finalist_award": "Annual award for finalists",
    "first_choice_required": true/false,
    "guaranteed": true/false
  }
}

Include ALL schools from the tables. Return ONLY valid JSON, no other text.

Document text:
${meritText}`;

  console.log("  Sending to Claude API...");
  const meritResp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: meritPrompt }],
  });
  const meritJson = extractJson(meritResp);
  console.log(`  Extracted ${meritJson.length} schools with National Merit data`);

  await sleep(1000);

  // --- 3. Honors Colleges ---
  console.log("\n=== Parsing: 50 Best Honors Colleges ===");
  const honorsRaw = execSync(
    `${PDFTOTEXT} -layout "${CONTEXT_DIR}/50 Best Honors Colleges - 2026 - College Transitions.pdf" - 2>/dev/null`
  ).toString();
  // Truncate to keep under token limits — focus on the school listings
  const honorsText = honorsRaw.substring(0, 80000);

  const honorsPrompt = `Extract all honors college/program data from this College Transitions "50 Best Honors Colleges" document.

Return a JSON array where each element has:
{
  "school": "University name",
  "honors_program": {
    "name": "Name of the honors college/program",
    "description": "Brief description (1-2 sentences) of what makes it notable",
    "separate_application": true/false if mentioned,
    "avg_sat": average SAT if mentioned (number or null),
    "acceptance_rate": acceptance rate if mentioned (string or null),
    "size": number of students if mentioned (number or null)
  }
}

Include ALL schools mentioned. Return ONLY valid JSON, no other text.

Document text:
${honorsText}`;

  console.log("  Sending to Claude API...");
  const honorsResp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: honorsPrompt }],
  });
  const honorsJson = extractJson(honorsResp);
  console.log(`  Extracted ${honorsJson.length} schools with honors data`);

  // --- Merge into school JSONs ---
  console.log("\n=== Merging into school JSON files ===");

  let updated = 0;
  let notFound = [];

  // Build a map of school name -> data from all three sources
  const refMap = new Map();

  for (const s of scholJson) {
    const key = normalize(s.school);
    if (!refMap.has(key)) refMap.set(key, { name: s.school });
    refMap.get(key).scholarships = s.scholarships;
  }

  for (const s of meritJson) {
    const key = normalize(s.school);
    if (!refMap.has(key)) refMap.set(key, { name: s.school });
    refMap.get(key).national_merit = s.national_merit;
  }

  for (const s of honorsJson) {
    const key = normalize(s.school);
    if (!refMap.has(key)) refMap.set(key, { name: s.school });
    refMap.get(key).honors_program = s.honors_program;
  }

  for (const [key, refData] of refMap) {
    const match = findSchool(refData.name, schools);
    if (!match) {
      notFound.push(refData.name);
      continue;
    }

    // Initialize reference section if null
    if (!match.data.reference) {
      match.data.reference = {};
    }

    // Merge scholarship data
    if (refData.scholarships) {
      match.data.reference.merit_scholarships = refData.scholarships;
    }

    // Merge National Merit data
    if (refData.national_merit) {
      match.data.reference.national_merit = refData.national_merit;
    }

    // Merge honors data
    if (refData.honors_program) {
      match.data.reference.honors_program = refData.honors_program;
    }

    fs.writeFileSync(match.filePath, JSON.stringify(match.data, null, 2) + "\n");
    updated++;
    console.log(`  Updated: ${match.name}`);
  }

  console.log(`\n=== Done ===`);
  console.log(`  Schools updated: ${updated}`);
  console.log(`  Not found in database: ${notFound.length}`);
  if (notFound.length > 0) {
    console.log(`  Missing: ${notFound.join(", ")}`);
  }
}

function extractJson(response) {
  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let jsonStr = content.trim();

  // Strip markdown fences
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Find array brackets
  if (!jsonStr.startsWith("[")) {
    const firstBracket = jsonStr.indexOf("[");
    const lastBracket = jsonStr.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
    }
  }

  return JSON.parse(jsonStr);
}

parseScholarshipPDFs().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
