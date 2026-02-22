const fs = require("fs");
const path = require("path");

// Paths relative to project root (Vercel deploys from project root)
const SCHOOLS_DIR = path.join(__dirname, "..", "..", "data", "schools");
const SCHOOL_LIST_PATH = path.join(__dirname, "..", "..", "data", "school-list.json");
const STATE_AID_PATH = path.join(__dirname, "..", "..", "data", "state-aid-programs.md");

// Load school list once at module level
let schoolListCache = null;
function getSchoolList() {
  if (!schoolListCache) {
    schoolListCache = JSON.parse(fs.readFileSync(SCHOOL_LIST_PATH, "utf8"));
  }
  return schoolListCache;
}

// Load a single school JSON by slug
function loadSchool(slug) {
  const filePath = path.join(SCHOOLS_DIR, slug + ".json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Parse free-text income to bracket key
function getIncomeBracket(incomeStr) {
  if (!incomeStr) return "75_110k";

  // Normalize: strip whitespace, lowercase
  const s = incomeStr.replace(/\s+/g, " ").trim().toLowerCase();

  // Handle divorced/dual income: "$115,000 + $140,000" or "$115K + $140K"
  // Use the sum for bracket determination
  const parts = s.split(/\+|and|&/).map((p) => p.trim());
  let total = 0;
  for (const part of parts) {
    total += parseIncomeNumber(part);
  }

  // If we couldn't parse anything, default to middle bracket
  if (total === 0) return "75_110k";

  if (total <= 30000) return "0_30k";
  if (total <= 48000) return "30_48k";
  if (total <= 75000) return "48_75k";
  if (total <= 110000) return "75_110k";
  return "110k_plus";
}

// Parse a single income number from various formats
function parseIncomeNumber(s) {
  if (!s) return 0;

  // Handle ranges like "$60,000-$80,000" or "$60K-$80K" — use midpoint
  const rangeMatch = s.match(
    /\$?\s*([\d,.]+)\s*k?\s*[-–—to]+\s*\$?\s*([\d,.]+)\s*k?/i
  );
  if (rangeMatch) {
    let low = parseFloat(rangeMatch[1].replace(/,/g, ""));
    let high = parseFloat(rangeMatch[2].replace(/,/g, ""));
    // Detect "K" format
    if (s.includes("k") || s.includes("K")) {
      if (low < 1000) low *= 1000;
      if (high < 1000) high *= 1000;
    }
    return (low + high) / 2;
  }

  // Handle single number: "$72,000" or "$72K" or "72000"
  const numMatch = s.match(/\$?\s*([\d,.]+)\s*(k)?/i);
  if (numMatch) {
    let val = parseFloat(numMatch[1].replace(/,/g, ""));
    if (numMatch[2] || (val > 0 && val < 1000)) {
      val *= 1000;
    }
    return val;
  }

  return 0;
}

// Extract state abbreviation from city string like "Atlanta, GA"
function parseState(cityStr) {
  if (!cityStr) return null;
  // "Atlanta, GA" or "Atlanta,GA"
  const match = cityStr.match(/,\s*([A-Z]{2})\s*$/);
  if (match) return match[1];
  // Case-insensitive: "Atlanta, ga"
  const match2 = cityStr.match(/,\s*([a-zA-Z]{2})\s*$/);
  if (match2) return match2[1].toUpperCase();
  // No comma: "Boca Raton FL" or "Atlanta GA"
  const match3 = cityStr.match(/\s([A-Z]{2})\s*$/);
  if (match3) return match3[1];
  // No comma, lowercase: "Boca Raton fl"
  const match4 = cityStr.match(/\s([a-zA-Z]{2})\s*$/);
  if (match4) return match4[1].toUpperCase();
  return null;
}

// Format dollar amount
function fmt(n) {
  if (n == null || isNaN(n)) return "N/A";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// Format percentage
function pct(n) {
  if (n == null || isNaN(n)) return "N/A";
  // If it's already 0-100 range (like CDS pct_need_met), use as-is
  // If it's 0-1 range (like admit_rate), multiply by 100
  const val = n > 1 ? n : n * 100;
  return val.toFixed(1) + "%";
}

// Format a school in compact format (CDS schools or home-state scorecard schools)
function formatSchoolCompact(school, bracket, isHomeState) {
  const sc = school.scorecard || {};
  const cds = school.cds || {};
  const ref = school.reference || {};
  const hasCDS = !!school.cds;

  let lines = [];

  // Header line: name | city, state | type | tags
  let header = `**${school.name}**`;
  header += ` | ${school.city || "?"}, ${school.state || "?"}`;
  header += ` | ${school.type === "private" ? "Private" : "Public"}`;
  if (ref.questbridge_partner) header += " | QuestBridge";
  lines.push(header);

  // Admission stats
  if (hasCDS) {
    let admitLine = `Admit: ${pct(cds.admit_rate_overall)} overall`;
    if (cds.total_applicants) admitLine += ` | Apps: ${cds.total_applicants.toLocaleString("en-US")}`;
    if (cds.ed_admit_rate) admitLine += ` | ED: ${pct(cds.ed_admit_rate)}`;
    if (cds.ea_admit_rate) admitLine += ` | EA: ${pct(cds.ea_admit_rate)}`;
    lines.push(admitLine);

    // Test scores
    let testLine = "";
    if (cds.sat_composite_25 && cds.sat_composite_75) {
      testLine += `SAT: ${cds.sat_composite_25}–${cds.sat_composite_75}`;
    }
    if (cds.act_composite_25 && cds.act_composite_75) {
      if (testLine) testLine += " | ";
      testLine += `ACT: ${cds.act_composite_25}–${cds.act_composite_75}`;
    }
    if (testLine) lines.push(testLine);
  } else {
    // Scorecard-only admission
    let admitLine = `Admit: ${pct(sc.admit_rate)}`;
    lines.push(admitLine);

    let testLine = "";
    if (sc.sat_reading_25 && sc.sat_math_25) {
      const sat25 = sc.sat_reading_25 + sc.sat_math_25;
      const sat75 = sc.sat_reading_75 + sc.sat_math_75;
      testLine += `SAT: ${sat25}–${sat75}`;
    }
    if (sc.act_25 && sc.act_75) {
      if (testLine) testLine += " | ";
      testLine += `ACT: ${sc.act_25}–${sc.act_75}`;
    }
    if (!testLine) testLine = "SAT/ACT: not reported";
    lines.push(testLine);
  }

  // Cost — prefer CDS breakdown, fall back to Scorecard totals if CDS costs are missing
  const hasCDSCosts = hasCDS && (cds.tuition_in_state || cds.tuition_out_of_state || cds.tuition_private);
  if (hasCDSCosts) {
    if (school.type === "private") {
      const total = (cds.tuition_private || 0) + (cds.required_fees || 0) + (cds.room_board || 0);
      lines.push(
        `Cost: ${fmt(total)} (tuition ${fmt(cds.tuition_private)} + fees ${fmt(cds.required_fees)} + R&B ${fmt(cds.room_board)})`
      );
    } else {
      const totalIn = (cds.tuition_in_state || 0) + (cds.required_fees || 0) + (cds.room_board || 0);
      const totalOut = (cds.tuition_out_of_state || 0) + (cds.required_fees || 0) + (cds.room_board || 0);
      lines.push(
        `Cost: ${fmt(totalIn)} in-state / ${fmt(totalOut)} OOS (fees ${fmt(cds.required_fees)} + R&B ${fmt(cds.room_board)})`
      );
    }
  } else {
    // Scorecard costs (or CDS school with missing cost fields)
    if (school.type === "public") {
      lines.push(
        `Cost: ${fmt(sc.total_cost_in_state)} in-state / ${fmt(sc.total_cost_out_of_state)} OOS`
      );
    } else {
      lines.push(`Cost: ${fmt(sc.total_cost_out_of_state)}`);
    }
  }

  // Net price by income bracket
  if (sc.net_price) {
    const np = sc.net_price;
    lines.push(
      `Net price: ${fmt(np["0_30k"])} (≤$30K) · ${fmt(np["48_75k"])} ($48-75K) · ${fmt(np["75_110k"])} ($75-110K) · ${fmt(np["110k_plus"])} ($110K+)`
    );
  }

  // Aid stats (CDS only)
  if (hasCDS) {
    let aidLine = "";
    if (cds.pct_need_met) aidLine += `Aid: ${cds.pct_need_met}% need met`;
    if (cds.meets_full_need != null) aidLine += ` | Full need: ${cds.meets_full_need ? "Yes" : "No"}`;
    if (cds.avg_need_grant) aidLine += ` | Avg grant: ${fmt(cds.avg_need_grant)}`;
    if (aidLine) lines.push(aidLine);

    // Merit
    if (cds.pct_freshmen_receiving_merit_aid != null && cds.pct_freshmen_receiving_merit_aid > 0) {
      lines.push(
        `Merit: ${cds.pct_freshmen_receiving_merit_aid}% receive, avg ${fmt(cds.avg_merit_award)}`
      );
    } else if (cds.pct_freshmen_receiving_merit_aid === 0) {
      lines.push("Merit: None (need-based aid only)");
    }
  }

  // Reference data: scholarships
  if (ref.merit_scholarships && ref.merit_scholarships.length > 0) {
    for (const s of ref.merit_scholarships) {
      lines.push(`Scholarships: ${s.name} — ${s.amount}`);
    }
  }

  // Reference data: National Merit
  if (ref.national_merit) {
    const nm = ref.national_merit;
    let nmLine = "National Merit: ";
    if (nm.finalist_award && nm.finalist_award !== "None") {
      nmLine += `${nm.finalist_award} finalist`;
      if (nm.first_choice_required) nmLine += " (first choice required)";
    } else if (nm.semifinalist_award && nm.semifinalist_award !== "None") {
      nmLine += `${nm.semifinalist_award} semifinalist`;
    } else {
      nmLine = null;
    }
    if (nmLine) lines.push(nmLine);
  }

  // Reference data: Honors program
  if (ref.honors_program) {
    const hp = ref.honors_program;
    let hLine = `Honors: ${hp.name}`;
    if (hp.admit_rate) hLine += ` (${pct(hp.admit_rate)} admit)`;
    else if (hp.avg_sat) hLine += ` (avg SAT: ${hp.avg_sat})`;
    if (hp.separate_application != null) hLine += ` | Separate app: ${hp.separate_application ? "Yes" : "No"}`;
    lines.push(hLine);
  }

  return lines.join("\n");
}

// Format a school in full radar format (adds ★ marker + honors + app notes)
function formatSchoolRadar(school, bracket) {
  let lines = ["★ ON YOUR RADAR"];

  // Use compact format as base
  const compact = formatSchoolCompact(school, bracket, false);
  lines.push(compact);

  const ref = school.reference || {};

  // Honors program (expanded detail for radar schools)
  if (ref.honors_program) {
    const hp = ref.honors_program;
    let hLine = `Honors: ${hp.name}`;
    if (hp.admit_rate) hLine += ` (${pct(hp.admit_rate)} admit)`;
    else if (hp.avg_sat) hLine += ` (avg SAT: ${hp.avg_sat})`;
    if (hp.separate_application != null) hLine += ` | Separate app: ${hp.separate_application ? "Yes" : "No"}`;
    if (hp.description) hLine += `\n  ${hp.description}`;
    lines.push(hLine);
  }

  return lines.join("\n");
}

// Main function: load and format all relevant school data for the prompt
function loadSchoolsForPrompt(formData) {
  const state = formData.state || parseState(formData.city);
  const bracket = getIncomeBracket(formData.income);
  const schoolList = getSchoolList();

  // Parse radar schools from free text
  const radarNames = parseRadarSchools(formData.schools_on_radar);

  // Build lookup: slug -> school list entry
  const slugMap = {};
  for (const entry of schoolList) {
    slugMap[entry.slug] = entry;
  }

  // Track which slugs are radar schools (for dedup)
  const radarSlugs = new Set();
  for (const name of radarNames) {
    const slug = findSchoolSlug(name, schoolList);
    if (slug) radarSlugs.add(slug);
  }

  // Collect schools by category
  const radarSchools = []; // Full detail
  const cdsSchools = []; // Compact (CDS data)
  const homeStateSchools = []; // Compact (scorecard, home state)

  // 1. Load radar schools (full detail)
  for (const name of radarNames) {
    const slug = findSchoolSlug(name, schoolList);
    if (!slug) continue;
    const school = loadSchool(slug);
    if (!school) continue;
    radarSchools.push(school);
  }

  // 2. Load ALL schools with CDS data (compact format), excluding radar schools
  const allFiles = fs.readdirSync(SCHOOLS_DIR).filter((f) => f.endsWith(".json"));
  const cdsLoaded = new Set();

  for (const file of allFiles) {
    const slug = file.replace(".json", "");
    if (radarSlugs.has(slug)) continue; // Skip radar schools (shown in full)

    const school = loadSchool(slug);
    if (!school || !school.cds) continue;
    cdsSchools.push(school);
    cdsLoaded.add(slug);
  }

  // 3. Load home-state schools with scorecard data (not already loaded)
  if (state) {
    for (const entry of schoolList) {
      if (entry.state !== state) continue;
      if (radarSlugs.has(entry.slug)) continue;
      if (cdsLoaded.has(entry.slug)) continue;

      const school = loadSchool(entry.slug);
      if (!school || !school.scorecard) continue;
      homeStateSchools.push(school);
    }
  }

  // Format output
  let sections = [];

  sections.push(
    `### VERIFIED SCHOOL DATA (CDS 2024-25 & College Scorecard)\n` +
    `Source: Common Data Set reports and U.S. Department of Education College Scorecard.\n` +
    `Income bracket for net price display: ${bracketLabel(bracket)}\n` +
    `Home state: ${state || "Unknown"}\n`
  );

  // Radar schools first
  if (radarSchools.length > 0) {
    sections.push("--- SCHOOLS ON YOUR RADAR ---\n");
    for (const school of radarSchools) {
      sections.push(formatSchoolRadar(school, bracket));
      sections.push(""); // blank line separator
    }
  }

  // CDS schools
  if (cdsSchools.length > 0) {
    // Sort alphabetically
    cdsSchools.sort((a, b) => a.name.localeCompare(b.name));
    sections.push(`--- SCHOOLS WITH CDS DATA (${cdsSchools.length} schools) ---\n`);
    for (const school of cdsSchools) {
      sections.push(formatSchoolCompact(school, bracket, false));
      sections.push(""); // blank line separator
    }
  }

  // Home state schools (scorecard only)
  if (homeStateSchools.length > 0) {
    homeStateSchools.sort((a, b) => a.name.localeCompare(b.name));
    sections.push(
      `--- ${state} SCHOOLS (scorecard data, ${homeStateSchools.length} schools) ---\n`
    );
    for (const school of homeStateSchools) {
      sections.push(formatSchoolCompact(school, bracket, true));
      sections.push(""); // blank line separator
    }
  }

  return sections.join("\n");
}

// Find a school slug by fuzzy matching on name
function findSchoolSlug(name, schoolList) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();

  // Exact match on name
  for (const entry of schoolList) {
    if (entry.name.toLowerCase() === normalized) return entry.slug;
  }

  // Common abbreviations (check BEFORE partial match to avoid false positives like "uga" in "Tougaloo")
  const abbrevs = {
    uga: "university-of-georgia",
    gt: "georgia-institute-of-technology",
    "georgia tech": "georgia-institute-of-technology",
    mit: "massachusetts-institute-of-technology",
    uva: "university-of-virginia",
    unc: "university-of-north-carolina-at-chapel-hill",
    ucla: "university-of-california-los-angeles",
    ucb: "university-of-california-berkeley",
    "uc berkeley": "university-of-california-berkeley",
    usc: "university-of-southern-california",
    nyu: "new-york-university",
    washu: "washington-university-in-st-louis",
    "wash u": "washington-university-in-st-louis",
    umd: "university-of-maryland-college-park",
    osu: "ohio-state-university-main-campus",
    "ohio state": "ohio-state-university-main-campus",
    umich: "university-of-michigan-ann-arbor",
    "u of m": "university-of-michigan-ann-arbor",
    upenn: "university-of-pennsylvania",
    penn: "university-of-pennsylvania",
    gmu: "george-mason-university",
    gwu: "george-washington-university",
    "gw": "george-washington-university",
    umd: "university-of-maryland-college-park",
    ufl: "university-of-florida",
    ut: "university-of-texas-at-austin",
    "ut austin": "university-of-texas-at-austin",
    tamu: "texas-a-m-university-college-station",
    "texas a&m": "texas-a-m-university-college-station",
    "a&m": "texas-a-m-university-college-station",
    caltech: "california-institute-of-technology",
    "johns hopkins": "johns-hopkins-university",
    "jhu": "johns-hopkins-university",
    uab: "university-of-alabama-at-birmingham",
    "u of a": "university-of-alabama",
    auburn: "auburn-university",
  };

  if (abbrevs[normalized]) return abbrevs[normalized];

  // Partial match: input contains full school name or school name contains full input
  // Only match if the input is at least 4 chars to avoid false positives
  if (normalized.length >= 4) {
    for (const entry of schoolList) {
      const entryLower = entry.name.toLowerCase();
      if (entryLower.includes(normalized) || normalized.includes(entryLower)) {
        return entry.slug;
      }
    }
  }

  // Slug-style match: "emory" matches "emory-university"
  const slugified = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (slugified.length >= 4) {
    for (const entry of schoolList) {
      if (entry.slug.includes(slugified) || slugified.includes(entry.slug)) {
        return entry.slug;
      }
    }
  }

  return null;
}

// Parse radar school names from free text
function parseRadarSchools(text) {
  if (!text || text.toLowerCase() === "none specified") return [];
  // Split on commas, semicolons, or newlines
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Human-readable bracket label
function bracketLabel(bracket) {
  const labels = {
    "0_30k": "≤$30,000",
    "30_48k": "$30,001–$48,000",
    "48_75k": "$48,001–$75,000",
    "75_110k": "$75,001–$110,000",
    "110k_plus": "$110,001+",
  };
  return labels[bracket] || bracket;
}

// Load state aid sections relevant to the family's state
function loadStateAid(state) {
  if (!state) return "";

  let content;
  try {
    content = fs.readFileSync(STATE_AID_PATH, "utf8");
  } catch (e) {
    return "";
  }

  const sections = [];
  const upperState = state.toUpperCase();

  // State name mapping for header matching
  const stateNames = {
    AL: "ALABAMA", AK: "ALASKA", AZ: "ARIZONA", AR: "ARKANSAS", CA: "CALIFORNIA",
    CO: "COLORADO", CT: "CONNECTICUT", DE: "DELAWARE", DC: "DC", FL: "FLORIDA",
    GA: "GEORGIA", HI: "HAWAII", ID: "IDAHO", IL: "ILLINOIS", IN: "INDIANA",
    IA: "IOWA", KS: "KANSAS", KY: "KENTUCKY", LA: "LOUISIANA", ME: "MAINE",
    MD: "MARYLAND", MA: "MASSACHUSETTS", MI: "MICHIGAN", MN: "MINNESOTA",
    MS: "MISSISSIPPI", MO: "MISSOURI", MT: "MONTANA", NE: "NEBRASKA",
    NV: "NEVADA", NH: "NEW HAMPSHIRE", NJ: "NEW JERSEY", NM: "NEW MEXICO",
    NY: "NEW YORK", NC: "NORTH CAROLINA", ND: "NORTH DAKOTA", OH: "OHIO",
    OK: "OKLAHOMA", OR: "OREGON", PA: "PENNSYLVANIA", RI: "RHODE ISLAND",
    SC: "SOUTH CAROLINA", SD: "SOUTH DAKOTA", TN: "TENNESSEE", TX: "TEXAS",
    UT: "UTAH", VT: "VERMONT", VA: "VIRGINIA", WA: "WASHINGTON",
    WV: "WEST VIRGINIA", WI: "WISCONSIN", WY: "WYOMING",
  };

  const stateName = stateNames[upperState];
  if (!stateName && upperState !== "DC") return "";

  // Extract sections matching this state's name
  // Sections are delimited by "### STATE_NAME --" headers
  const headerPattern = stateName === "DC"
    ? /^### DC TAG/m
    : new RegExp(`^### ${stateName}\\s*[-–—]`, "m");

  const allHeaders = [...content.matchAll(/^### [A-Z][A-Z ]+[-–—]/gm)];

  // Find all matching section starts
  const lines = content.split("\n");
  let currentSection = null;
  let capturing = false;
  let sectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a section header (### STATE_NAME --)
    const isHeader = /^### [A-Z]/.test(line);
    const isSectionDivider = line.trim() === "---" && i > 0;

    if (isHeader) {
      // Save previous captured section
      if (capturing && sectionLines.length > 0) {
        sections.push(sectionLines.join("\n"));
        sectionLines = [];
      }

      // Check if this header matches our state
      const matchesState = stateName === "DC"
        ? line.startsWith("### DC TAG")
        : line.includes(stateName + " ") || line.includes(stateName + " --") || line.includes(stateName + " —");

      if (matchesState) {
        capturing = true;
        sectionLines = [line];
      } else {
        capturing = false;
      }
    } else if (capturing) {
      // Stop at the next --- that precedes a new ### header
      if (isSectionDivider) {
        // Look ahead to see if next non-empty line is a header
        let nextLine = "";
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            nextLine = lines[j];
            break;
          }
        }
        if (/^### [A-Z]/.test(nextLine) || /^## \d/.test(nextLine)) {
          sections.push(sectionLines.join("\n"));
          sectionLines = [];
          capturing = false;
        } else {
          sectionLines.push(line);
        }
      } else {
        sectionLines.push(line);
      }
    }
  }

  // Don't forget the last section
  if (capturing && sectionLines.length > 0) {
    sections.push(sectionLines.join("\n"));
  }

  // Also include Section 5 regional programs if the student's state is eligible
  const regionalSections = extractRegionalPrograms(content, upperState);
  if (regionalSections) {
    sections.push(regionalSections);
  }

  // Include the 17 prompt rules from the NOTES section
  const notesStart = content.indexOf("## NOTES FOR THE SCAFFOLD PROMPT");
  if (notesStart !== -1) {
    sections.push(content.substring(notesStart));
  }

  if (sections.length === 0) return "";

  return (
    "### STATE AID PROGRAMS FOR " +
    (stateName || upperState) +
    "\n\n" +
    sections.join("\n\n---\n\n")
  );
}

// Extract regional programs relevant to a state
function extractRegionalPrograms(content, stateAbbrev) {
  const regional = [];

  // DC TAG
  if (stateAbbrev === "DC") {
    const dcSection = extractSection(content, "### DC TAG");
    if (dcSection) regional.push(dcSection);
  }

  // WUE (Western states)
  const wueStates = ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "ND", "OR", "SD", "UT", "WA", "WY"];
  if (wueStates.includes(stateAbbrev)) {
    const wueSection = extractSection(content, "### Western Undergraduate Exchange");
    if (wueSection) regional.push(wueSection);
  }

  // Academic Common Market (SREB states)
  const srebStates = ["AL", "AR", "DE", "FL", "GA", "KY", "LA", "MD", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"];
  if (srebStates.includes(stateAbbrev)) {
    const acmSection = extractSection(content, "### Academic Common Market");
    if (acmSection) regional.push(acmSection);
  }

  // MSEP (Midwest states)
  const msepStates = ["IN", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "WI"];
  if (msepStates.includes(stateAbbrev)) {
    const msepSection = extractSection(content, "### Midwest Student Exchange");
    if (msepSection) regional.push(msepSection);
  }

  // New England RSP
  const neStates = ["CT", "ME", "MA", "NH", "RI", "VT"];
  if (neStates.includes(stateAbbrev)) {
    const neSection = extractSection(content, "### New England Regional Student Program");
    if (neSection) regional.push(neSection);
  }

  if (regional.length === 0) return null;
  return "REGIONAL PROGRAMS:\n\n" + regional.join("\n\n---\n\n");
}

// Extract a section from the markdown by its ### header prefix
function extractSection(content, headerPrefix) {
  const startIdx = content.indexOf(headerPrefix);
  if (startIdx === -1) return null;

  // Find the end: next "---" followed by a "###" or "##" header, or EOF
  const afterHeader = content.substring(startIdx);
  const lines = afterHeader.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0) {
      result.push(line);
      continue;
    }

    // Stop at "---" if the next non-empty line is a new section header
    if (line.trim() === "---") {
      let nextLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          nextLine = lines[j];
          break;
        }
      }
      if (/^###? [A-Z]/.test(nextLine)) break;
      result.push(line);
    } else {
      result.push(line);
    }
  }

  return result.join("\n").trim();
}

// Build a compact cheat sheet with just the numbers that matter most
// This goes at the END of the prompt for maximum recency effect
function buildCheatSheet(formData) {
  const bracket = getIncomeBracket(formData.income);
  const state = formData.state || parseState(formData.city);
  const schoolList = getSchoolList();

  // Collect: radar schools + in-state + CDS schools
  const radarNames = (formData.schools_on_radar || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Common abbreviations
  const abbrevMap = {
    "uf": "university of florida", "uga": "university of georgia", "fsu": "florida state",
    "ucf": "university of central florida", "mit": "massachusetts institute",
    "gt": "georgia tech", "gatech": "georgia tech", "usc": "university of southern california",
    "ucla": "university of california, los angeles", "ucb": "university of california, berkeley",
    "unc": "university of north carolina", "uva": "university of virginia",
    "osu": "ohio state", "psu": "penn state", "umd": "university of maryland",
    "bu": "boston university", "bc": "boston college", "nyu": "new york university",
    "gw": "george washington", "gwu": "george washington", "washu": "washington university in st. louis",
    "cmu": "carnegie mellon", "jhu": "johns hopkins", "wm": "william & mary",
    "vt": "virginia tech", "umich": "university of michigan", "wisc": "university of wisconsin",
    "uiuc": "university of illinois", "utk": "university of tennessee",
    "lsu": "louisiana state", "tamu": "texas a&m", "ut": "university of texas",
    "cwru": "case western", "rice": "rice university", "duke": "duke university",
    "wake": "wake forest", "tulane": "tulane university", "howard": "howard university",
  };

  // Expand abbreviations
  const expandedRadar = radarNames.map((r) => abbrevMap[r] || r);

  // Build school data rows, categorized by priority
  const radarRows = [];
  const inStateRows = [];
  const cdsRows = [];
  const seen = new Set();

  function buildRow(school, marker) {
    const hasCDS = school.cds && school.cds.admit_rate_overall != null;
    const admitRate = hasCDS ? school.cds.admit_rate_overall : school.scorecard?.admit_rate;
    const schoolState = school.state || "";
    const isInState = schoolState === state;
    const isPublic = (school.type || "").toLowerCase() === "public";

    let sticker = null;
    const hasCDSCosts = hasCDS && (school.cds.tuition_in_state || school.cds.tuition_out_of_state || school.cds.tuition_private);
    if (hasCDSCosts) {
      let tuition;
      if (isPublic && isInState) {
        tuition = school.cds.tuition_in_state || 0;
      } else {
        tuition = school.cds.tuition_private || school.cds.tuition_out_of_state || school.cds.tuition_in_state || 0;
      }
      sticker = tuition + (school.cds.required_fees || 0) + (school.cds.room_board || 0);
    } else {
      // Fall back to Scorecard costs (handles CDS schools with null cost fields)
      sticker = (isPublic && isInState)
        ? (school.scorecard?.total_cost_in_state || school.scorecard?.total_cost_out_of_state)
        : (school.scorecard?.total_cost_out_of_state || school.scorecard?.total_cost_in_state);
    }

    let netPrice = null;
    const np = school.scorecard?.net_price;
    if (np && typeof np === "object") netPrice = np[bracket];
    else if (typeof np === "number") netPrice = np;

    if (admitRate == null && sticker == null) return null;

    const admitStr = admitRate != null ? (admitRate * 100).toFixed(1) + "%" : "N/A";
    const stickerStr = sticker != null && sticker > 0 ? "$" + sticker.toLocaleString() : "N/A";
    const netStr = netPrice != null ? "$" + netPrice.toLocaleString() : "N/A";
    const residency = isPublic && isInState ? "in-state" : isPublic ? "OOS" : "private";

    return `${marker}${school.name} | ${admitStr} | ${stickerStr} | ${netStr} | ${residency}`;
  }

  for (const entry of schoolList) {
    const school = loadSchool(entry.slug);
    if (!school) continue;

    const hasCDS = school.cds && school.cds.admit_rate_overall != null;
    const hasScorecard = school.scorecard && school.scorecard.admit_rate != null;
    if (!hasCDS && !hasScorecard) continue;

    const nameLC = (school.name || "").toLowerCase();
    const isRadar = expandedRadar.some((r) => nameLC.includes(r))
      || radarNames.some((r) => r.length >= 4 && nameLC.includes(r));
    const schoolState = school.state || "";
    const isInState = schoolState === state;

    // Skip online-only campuses
    if (nameLC.includes("-online") || nameLC.includes("online campus")) continue;

    if (isRadar && !seen.has(entry.slug)) {
      const row = buildRow(school, "* ");
      if (row) { radarRows.push(row); seen.add(entry.slug); }
    } else if (isInState && !seen.has(entry.slug)) {
      const row = buildRow(school, "  ");
      if (row) { inStateRows.push(row); seen.add(entry.slug); }
    } else if (hasCDS && !seen.has(entry.slug)) {
      const row = buildRow(school, "  ");
      if (row) { cdsRows.push(row); seen.add(entry.slug); }
    }
  }

  // Combine: all radar + in-state (up to 10) + CDS (fill to 30)
  const cheatRows = [
    ...radarRows,
    ...inStateRows.slice(0, 10),
    ...cdsRows.slice(0, Math.max(0, 30 - radarRows.length - Math.min(inStateRows.length, 10))),
  ];

  if (cheatRows.length === 0) return "";

  return `**QUICK REFERENCE: KEY NUMBERS FOR YOUR JSON PARAMS**
(* = school the family named. Use these EXACT numbers.)

School | Admit Rate | Sticker Cost | Net Price (${bracket}) | Type
${cheatRows.join("\n")}

For EVERY school on your list that appears above, your JSON admit_pct and sticker_cost MUST match these numbers.`;
}

module.exports = {
  loadSchoolsForPrompt,
  loadStateAid,
  getIncomeBracket,
  parseState,
  buildCheatSheet,
};
