#!/usr/bin/env node

/**
 * Parses CDS (Common Data Set) PDF and XLSX files, extracts key admissions,
 * cost, and financial aid data via Claude API, and merges into school JSON files.
 *
 * Usage:
 *   node scripts/parse-cds.js                          # parse all files
 *   node scripts/parse-cds.js --skip-existing           # skip schools that already have cds data
 *   node scripts/parse-cds.js --school "Amherst College" # parse only one school
 *   node scripts/parse-cds.js --dry-run                 # extract text only, no API call
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const XLSX = require("xlsx");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic.default();

const CDS_DIR = path.join(__dirname, "..", "CDS Data");
const SCHOOLS_DIR = path.join(__dirname, "..", "data", "schools");
const ERRORS_FILE = path.join(__dirname, "..", "data", "cds-parse-errors.json");
const PDFTOTEXT = "/opt/homebrew/bin/pdftotext";
const DELAY_MS = 500;
const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 4000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize a name for fuzzy matching: lowercase, convert hyphens/punctuation to spaces, collapse spaces */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[-–—]/g, " ")      // convert hyphens/dashes to spaces (preserves word boundaries)
    .replace(/[^a-z0-9\s]/g, "") // strip remaining punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/** Count shared words between two normalized strings */
function wordOverlap(a, b) {
  const wordsA = new Set(normalize(a).split(" "));
  const wordsB = new Set(normalize(b).split(" "));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  // Jaccard-style: overlap / union size
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : overlap / union;
}

/**
 * Extract the school name from a CDS filename.
 * Strips year prefix like "2024-25 " and file extension.
 */
function schoolNameFromFilename(filename) {
  // Remove extension
  let name = filename.replace(/\.(pdf|xlsx)$/i, "");
  // Remove year prefix (e.g., "2024-25 ", "2022-23 ")
  name = name.replace(/^\d{4}-\d{2}\s+/, "");
  // Remove duplicate markers like " (1)"
  name = name.replace(/\s*\(\d+\)\s*$/, "");
  return name.trim();
}

/**
 * Extract the source year from a CDS filename.
 * Returns e.g. "2024-2025" from "2024-25 Some School.pdf"
 */
function sourceYearFromFilename(filename) {
  const match = filename.match(/^(\d{4})-(\d{2})\s/);
  if (!match) return "unknown";
  const startYear = parseInt(match[1], 10);
  const endSuffix = match[2];
  const endYear = Math.floor(startYear / 100) * 100 + parseInt(endSuffix, 10);
  return `${startYear}-${endYear}`;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/** Extract text from a PDF using pdftotext CLI */
function extractPdfText(filePath) {
  const result = execSync(`"${PDFTOTEXT}" -layout "${filePath}" -`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return result;
}

/** Extract text from an XLSX file by reading all sheets */
function extractXlsxText(filePath) {
  const wb = XLSX.readFile(filePath);
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    parts.push(`\n=== Sheet: ${sheetName} ===\n`);
    for (const row of rows) {
      const nonEmpty = row.filter((x) => x !== "");
      if (nonEmpty.length > 0) {
        parts.push(nonEmpty.join(" | "));
      }
    }
  }
  return parts.join("\n");
}

/**
 * Extract only sections C, G, and H from the full CDS text.
 * This keeps the prompt token count manageable.
 *
 * Strategy:
 * 1. For XLSX files (detected by "=== Sheet:" markers), extract sheets named
 *    "C", "CDS-C", "G", "CDS-G", "H", "CDS-H" (case-insensitive).
 * 2. For PDF files, look for major section header lines like:
 *    "C. FIRST-TIME, FIRST-YEAR ADMISSION" or "C1-C2: Applications"
 *    and capture until the next major section header (D., I., etc.).
 */
function extractSections(text) {
  const lines = text.split("\n");

  // --- XLSX path: extract by sheet name ---
  const isXlsx = text.includes("=== Sheet:");
  if (isXlsx) {
    return extractSectionsFromXlsx(lines);
  }

  // --- PDF path: detect section header lines ---
  return extractSectionsFromPdf(lines);
}

/**
 * XLSX: extract content from sheets whose names start with C, G, or H.
 *
 * Sheet names vary across institutions:
 *   - Simple: "C", "G", "H"
 *   - Prefixed: "CDS-C", "CDS-G", "CDS-H"
 *   - Descriptive: "C First Time", "G Annual Expenses", "H Financial Aid"
 *   - Full: "C. First-Time, First-Year (Fres...", "G. Annual Expenses", etc.
 *
 * Strategy: match sheets whose name starts with C, G, or H (after trimming),
 * but exclude sheets starting with unrelated letters.
 */
function extractSectionsFromXlsx(lines) {
  const sections = [];
  let inTargetSheet = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const sheetMatch = trimmed.match(/^=== Sheet:\s*(.+?)\s*===$/);
    if (sheetMatch) {
      const sheetName = sheetMatch[1].trim();
      // Check if the sheet name corresponds to section C, G, or H
      // Matches: "C", "CDS-C", "C First Time", "C. FIRST-TIME...", "G", "G. Annual...", "H", "H1", etc.
      inTargetSheet = isTargetSheet(sheetName);
      if (inTargetSheet) {
        sections.push(line);
      }
      continue;
    }
    if (inTargetSheet) {
      sections.push(line);
    }
  }

  return sections.join("\n");
}

/** Check if an XLSX sheet name corresponds to CDS section C, G, or H */
function isTargetSheet(sheetName) {
  const name = sheetName.toLowerCase().trim();
  // Exact matches
  if (name === "c" || name === "g" || name === "h") return true;
  // CDS-prefixed
  if (name === "cds-c" || name === "cds-g" || name === "cds-h") return true;
  // Starts with the letter followed by a space, dot, or digit
  if (/^c[\s.\d]/.test(name)) return true;
  if (/^g[\s.\d]/.test(name)) return true;
  if (/^h[\s.\d]/.test(name)) return true;
  return false;
}

/**
 * PDF: detect major section headers and capture sections C, G, and H.
 *
 * Major section headers in CDS PDFs look like:
 *   "C. FIRST-TIME, FIRST-YEAR ADMISSION"
 *   "G. ANNUAL EXPENSES"
 *   "H. FINANCIAL AID"
 *   "D. TRANSFER ADMISSION"
 *
 * Sub-section headers look like:
 *   "C1-C2: Applications"   "C1  First-time..."
 *   "C8: SAT and ACT..."    "G1  ..."
 *   "H1  ..."               "H2  ..."
 *
 * IMPORTANT: Inside the graduation rates table (section B), rows are labeled
 * with single letters A-H followed by spaces and data. For example:
 *   "C   Final 2018 cohort, after adjusting..."
 *   "G   Total graduating within six years..."
 *   "H   Six-year graduation rate..."
 * These are NOT section headers. We distinguish them by requiring:
 *   (a) Letter followed by a DOT and space: /^[A-Z]\.\s/ (definitive section header)
 *   (b) Letter followed immediately by a DIGIT: /^[A-Z]\d/ (sub-section like C1, H2)
 * Single letter followed by spaces+text (no dot, no digit) is a data row, not a header.
 */
function extractSectionsFromPdf(lines) {
  const sections = [];
  let capturing = false;

  // Target section: starts with C, G, or H followed by dot+space or digit
  const targetSectionHeader = /^[CGH]\.\s/;
  const targetSubSection = /^[CGH]\d/;

  // Non-target section: any other letter followed by dot+space or digit
  const otherSectionHeader = /^[ABDEFIJKLMN]\.\s/;
  const otherSubSection = /^[ABDEFIJKLMN]\d/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (capturing) sections.push(line);
      continue;
    }

    // Check if this is a target section start
    if (targetSectionHeader.test(trimmed) || targetSubSection.test(trimmed)) {
      capturing = true;
      sections.push(line);
      continue;
    }

    // Check if this is a non-target section header (signals end of our section)
    if (otherSectionHeader.test(trimmed) || otherSubSection.test(trimmed)) {
      if (capturing) {
        capturing = false;
      }
      continue;
    }

    if (capturing) {
      sections.push(line);
    }
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Claude API extraction
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `Extract the following data from this Common Data Set document. Return ONLY a JSON object with the fields listed below. Use null for any field where data is not available.

Fields to extract:
- school_name: string — official name of the institution
- source_year: string — academic year of the CDS (e.g., "2024-2025")
- total_applicants: number — total first-time first-year applicants (C1 men + women)
- total_admitted: number — total admitted (C1 men + women)
- admit_rate_overall: number (0.xxx) — overall admission rate
- ed_applicants: number or null — Early Decision applicants
- ed_admitted: number or null — Early Decision admitted
- ed_admit_rate: number (0.xxx) or null — Early Decision admission rate
- ea_applicants: number or null — Early Action applicants
- ea_admitted: number or null — Early Action admitted
- ea_admit_rate: number (0.xxx) or null — Early Action admission rate
- sat_reading_25: number or null — SAT Evidence-Based Reading & Writing 25th percentile
- sat_reading_75: number or null — SAT Evidence-Based Reading & Writing 75th percentile
- sat_math_25: number or null — SAT Math 25th percentile
- sat_math_75: number or null — SAT Math 75th percentile
- sat_composite_25: number or null — SAT composite 25th percentile (sum of reading + math 25ths, or if reported)
- sat_composite_75: number or null — SAT composite 75th percentile (sum of reading + math 75ths, or if reported)
- act_composite_25: number or null — ACT Composite 25th percentile
- act_composite_75: number or null — ACT Composite 75th percentile
- tuition_in_state: number or null — annual tuition for in-state students (G1)
- tuition_out_of_state: number or null — annual tuition for out-of-state students (G1)
- tuition_private: number or null — annual tuition if private institution (G1)
- required_fees: number or null — required fees (G1)
- room_board: number or null — room and board (G1)
- pct_need_met: number (0-100) or null — average percent of need met (H2 line I or H1)
- avg_need_grant: number or null — average need-based scholarship/grant award (H2 line C)
- avg_financial_aid_package: number or null — average financial aid package (H2 line B)
- meets_full_need: true/false/null — true if Section H2 line I shows 100% of need met AND line H shows all students had need fully met
- pct_freshmen_receiving_need_aid: number (0-100) or null — percent of freshmen receiving need-based aid (H2 line A / total freshmen, or as reported)
- pct_freshmen_receiving_merit_aid: number (0-100) or null — use H2 line G (non-need-based scholarship/grant recipients) divided by line A (total need-based aid recipients) or total freshmen count
- avg_merit_award: number or null — average non-need-based scholarship/grant (H2 or H1)

For admit rates, calculate from applicant/admitted numbers if not stated directly.
For ED/EA data, look in sections C21 or the early decision/early action subsections of C1.
For meets_full_need, set to true if Section H2 line I shows 100% of need met AND line H shows all students had need fully met.
For pct_freshmen_receiving_merit_aid, use H2 line G (non-need-based scholarship/grant) divided by line A.
For avg_merit_award, look in H2 or H1.

CDS Document Text:
`;

async function extractWithClaude(text, sourceYear) {
  const prompt = EXTRACTION_PROMPT + text;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract the text content from the response
  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse JSON from the response — handle markdown code fences and preamble text
  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // If Claude added preamble text before the JSON, find the first { and last }
  if (!jsonStr.startsWith("{")) {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // Debug: log first 500 chars of what we tried to parse
    console.log(`    DEBUG raw response (first 500 chars): ${content.substring(0, 500)}`);
    throw e;
  }

  // Override source_year from filename if not present
  if (!parsed.source_year || parsed.source_year === "unknown") {
    parsed.source_year = sourceYear;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// School file matching
// ---------------------------------------------------------------------------

/**
 * Load all school JSON files and build an index for matching.
 */
function loadSchoolIndex() {
  const files = fs.readdirSync(SCHOOLS_DIR).filter((f) => f.endsWith(".json"));
  const schools = [];
  for (const file of files) {
    const filePath = path.join(SCHOOLS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    schools.push({
      filePath,
      slug: data.slug || file.replace(".json", ""),
      name: data.name || "",
      data,
    });
  }
  return schools;
}

/**
 * Hardcoded overrides for CDS filename -> school slug, for tricky matches.
 */
const MATCH_OVERRIDES = {
  "Princeton": "princeton-university",
  "College of William and Mary": "william-mary",
  "Pennsylvania State University - University Park": "penn-state-university-park",
  "University of Virginia-Main Campus": "university-of-virginia",
  "University of Washington (Seattle Campus)": "university-of-washington",
  "University of Illinois at Urbana-Champaign": "university-of-illinois-urbana-champaign",
  "University of Nebraska - Lincoln": "university-of-nebraska-lincoln",
  "University of Minnesota-Twin Cities": "university-of-minnesota-twin-cities",
  "University of California, Berkeley": "university-of-california-berkeley",
  "University of California, Davis": "university-of-california-davis",
  "University of California, Irvine": "university-of-california-irvine",
  "University of California, Los Angeles": "university-of-california-los-angeles",
  "University of California, San Diego": "university-of-california-san-diego",
  "University of California, Santa Barbara": "university-of-california-santa-barbara",
  "University of Nevada-Reno": "university-of-nevada-reno",
  "University of Michigan": "university-of-michigan-ann-arbor",
};

/**
 * Find the best matching school file for a given CDS filename-derived school name.
 */
function findMatchingSchool(cdsName, schoolIndex) {
  // Check hardcoded overrides first
  if (MATCH_OVERRIDES[cdsName]) {
    const override = schoolIndex.find((s) => s.slug === MATCH_OVERRIDES[cdsName]);
    if (override) return override;
  }

  // Fuzzy match by word overlap
  let bestMatch = null;
  let bestScore = 0;

  for (const school of schoolIndex) {
    const score = wordOverlap(cdsName, school.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = school;
    }
  }

  // Require a minimum overlap threshold
  if (bestScore < 0.4) {
    return null;
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// Deduplication: pick the best file per school (prefer latest year, skip "(1)" dupes)
// ---------------------------------------------------------------------------

function deduplicateFiles(files) {
  const bySchool = {};
  for (const file of files) {
    const name = schoolNameFromFilename(file);
    // Skip duplicates with (1) suffix if the original exists
    if (/\(\d+\)/.test(file.replace(/\.\w+$/, ""))) {
      const baseName = file.replace(/\s*\(\d+\)/, "");
      if (files.includes(baseName)) continue;
    }
    if (!bySchool[name]) {
      bySchool[name] = file;
    } else {
      // Keep the one with the later year
      const existingYear = sourceYearFromFilename(bySchool[name]);
      const newYear = sourceYearFromFilename(file);
      if (newYear > existingYear) {
        bySchool[name] = file;
      }
    }
  }
  return Object.values(bySchool);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const skipExisting = args.includes("--skip-existing");
  const dryRun = args.includes("--dry-run");
  const singleSchoolIdx = args.indexOf("--school");
  const singleSchool = singleSchoolIdx !== -1 ? args[singleSchoolIdx + 1] : null;

  // Load all school files
  const schoolIndex = loadSchoolIndex();
  console.log(`Loaded ${schoolIndex.length} school files from ${SCHOOLS_DIR}`);

  // List CDS files
  let cdsFiles = fs.readdirSync(CDS_DIR).filter((f) => /\.(pdf|xlsx)$/i.test(f));
  console.log(`Found ${cdsFiles.length} CDS files in ${CDS_DIR}`);

  // Deduplicate (prefer latest year, skip "(1)" copies)
  cdsFiles = deduplicateFiles(cdsFiles);
  console.log(`After deduplication: ${cdsFiles.length} files to process`);

  // Filter to single school if requested
  if (singleSchool) {
    cdsFiles = cdsFiles.filter((f) => {
      const name = schoolNameFromFilename(f);
      return normalize(name).includes(normalize(singleSchool));
    });
    console.log(`Filtered to ${cdsFiles.length} file(s) matching "${singleSchool}"`);
  }

  // Sort alphabetically for consistent output
  cdsFiles.sort();

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Processing ${cdsFiles.length} CDS files...`);
  if (dryRun) console.log("(DRY RUN — no API calls will be made)\n");
  else console.log("");

  for (const file of cdsFiles) {
    const cdsName = schoolNameFromFilename(file);
    const sourceYear = sourceYearFromFilename(file);
    const filePath = path.join(CDS_DIR, file);
    const isPdf = /\.pdf$/i.test(file);
    const fileType = isPdf ? "PDF" : "XLSX";

    // Match to a school file
    const match = findMatchingSchool(cdsName, schoolIndex);
    if (!match) {
      console.log(`  WARNING: No match for "${cdsName}" (${file})`);
      errors.push({ file, school: cdsName, error: "No matching school file found" });
      failed++;
      continue;
    }

    // Skip if already has CDS data
    if (skipExisting && match.data.cds && match.data.cds !== null) {
      console.log(`  SKIP: ${match.name} (already has CDS data)`);
      skipped++;
      continue;
    }

    console.log(`  [${processed + skipped + failed + 1}/${cdsFiles.length}] ${cdsName} (${fileType}) -> ${match.name}`);

    try {
      // Extract text
      let fullText;
      if (isPdf) {
        fullText = extractPdfText(filePath);
      } else {
        fullText = extractXlsxText(filePath);
      }

      // Extract relevant sections
      const sectionText = extractSections(fullText);

      if (sectionText.trim().length < 100) {
        console.log(`    WARNING: Very little section text extracted (${sectionText.length} chars). Using full text.`);
        // Fall back to full text if section extraction found almost nothing
      }

      const textToSend = sectionText.trim().length >= 100 ? sectionText : fullText;

      if (dryRun) {
        console.log(`    Text length: ${textToSend.length} chars`);
        console.log(`    First 500 chars:\n${textToSend.substring(0, 500)}\n`);
        processed++;
        continue;
      }

      // Call Claude API
      const cdsData = await extractWithClaude(textToSend, sourceYear);

      // Log key values
      const admitRate = cdsData.admit_rate_overall
        ? (cdsData.admit_rate_overall * 100).toFixed(1) + "%"
        : "N/A";
      const tuition = cdsData.tuition_out_of_state || cdsData.tuition_private || cdsData.tuition_in_state;
      const tuitionStr = tuition ? "$" + tuition.toLocaleString() : "N/A";
      const needMet = cdsData.pct_need_met !== null ? cdsData.pct_need_met + "%" : "N/A";
      console.log(`    Admit: ${admitRate} | Tuition: ${tuitionStr} | Need met: ${needMet}`);

      // Merge into school JSON
      match.data.cds = cdsData;
      fs.writeFileSync(match.filePath, JSON.stringify(match.data, null, 2) + "\n");
      console.log(`    Saved to ${path.basename(match.filePath)}`);

      processed++;
    } catch (err) {
      console.log(`    ERROR: ${err.message}`);
      errors.push({ file, school: cdsName, matchedTo: match.name, error: err.message });
      failed++;
    }

    // Rate limiting
    if (!dryRun) {
      await sleep(DELAY_MS);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Done.`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);

  // Save errors
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) {
      console.log(`  - ${e.file}: ${e.error}`);
    }
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2) + "\n");
    console.log(`\nErrors saved to ${ERRORS_FILE}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
