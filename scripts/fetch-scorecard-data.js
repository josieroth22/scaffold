#!/usr/bin/env node

/**
 * Fetches College Scorecard data for all schools in data/school-list.json.
 *
 * Usage:
 *   node scripts/fetch-scorecard-data.js                # fetch all schools
 *   node scripts/fetch-scorecard-data.js --tier A       # fetch only Tier A
 *   node scripts/fetch-scorecard-data.js --skip-existing # skip schools that already have data
 *   node scripts/fetch-scorecard-data.js --school "Emory University"  # fetch one school
 *
 * API key: Uses SCORECARD_API_KEY env var, falls back to DEMO_KEY.
 * Rate limiting: 300ms delay between requests (~200/min, well under 1000/hr limit).
 */

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.SCORECARD_API_KEY || "DEMO_KEY";
const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const DELAY_MS = 350; // ms between requests

const FIELDS = [
  "id",
  "school.name",
  "school.state",
  "school.city",
  "school.ownership",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.roomboard.oncampus",
  "latest.cost.attendance.academic_year",
  "latest.cost.net_price.public.by_income_level.0-30000",
  "latest.cost.net_price.public.by_income_level.30001-48000",
  "latest.cost.net_price.public.by_income_level.48001-75000",
  "latest.cost.net_price.public.by_income_level.75001-110000",
  "latest.cost.net_price.public.by_income_level.110001-plus",
  "latest.cost.net_price.private.by_income_level.0-30000",
  "latest.cost.net_price.private.by_income_level.30001-48000",
  "latest.cost.net_price.private.by_income_level.48001-75000",
  "latest.cost.net_price.private.by_income_level.75001-110000",
  "latest.cost.net_price.private.by_income_level.110001-plus",
  "latest.aid.pell_grant_rate",
  "latest.aid.federal_loan_rate",
  "latest.student.size",
].join(",");

// Name overrides: our name -> API search name
// The Scorecard API uses specific naming conventions that differ from common names
const NAME_OVERRIDES = {
  // Tier A — state flagships with naming quirks
  "University of Alabama": "The University of Alabama",
  "University of Maryland, College Park": "University of Maryland-College Park",
  "University of Michigan, Ann Arbor": "University of Michigan-Ann Arbor",
  "University of Minnesota, Twin Cities": "University of Minnesota-Twin Cities",
  "University of Illinois Urbana-Champaign": "University of Illinois Urbana-Champaign",
  "University of California, Berkeley": "University of California-Berkeley",
  "University at Buffalo": "University at Buffalo",
  "Penn State University Park": "Pennsylvania State University-Main Campus",
  "Rutgers University-New Brunswick": "Rutgers University-New Brunswick",
  "University of Tennessee, Knoxville": "The University of Tennessee-Knoxville",
  "Indiana University Bloomington": "Indiana University-Bloomington",
  "Louisiana State University": "Louisiana State University and Agricultural & Mechanical College",
  "University of New Hampshire": "University of New Hampshire-Main Campus",
  "University of New Mexico": "University of New Mexico-Main Campus",
  "Ohio State University": "Ohio State University-Main Campus",
  "University of South Carolina": "University of South Carolina-Columbia",
  "University of Washington": "University of Washington-Seattle Campus",
  "University of Montana": "The University of Montana",
  "University of Missouri": "University of Missouri-Columbia",
  "University of Nevada, Reno": "University of Nevada-Reno",
  "Arizona State University": "Arizona State University-Tempe",
  // Tier B — privates
  "Georgia Institute of Technology": "Georgia Institute of Technology-Main Campus",
  "Purdue University": "Purdue University-Main Campus",
  "Virginia Polytechnic Institute and State University": "Virginia Polytechnic Institute and State University",
  "University of Pittsburgh": "University of Pittsburgh-Pittsburgh Campus",
  "Texas A&M University": "Texas A&M University-College Station",
  "Massachusetts Institute of Technology": "Massachusetts Institute of Technology",
  "California Institute of Technology": "California Institute of Technology",
  "Washington University in St. Louis": "Washington University in St Louis",
  "Rensselaer Polytechnic Institute": "Rensselaer Polytechnic Institute",

  // Tier C
  "North Carolina A&T State University": "North Carolina A & T State University",
  "Prairie View A&M University": "Prairie View A & M University",
  "Florida A&M University": "Florida Agricultural and Mechanical University",
};

// Schools where name search fails — use IPEDS ID directly
const ID_OVERRIDES = {
  "American University": 131159,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSchool(school) {
  // Use IPEDS ID if we have one (most reliable)
  if (ID_OVERRIDES[school.name]) {
    const url = `${BASE_URL}?id=${ID_OVERRIDES[school.name]}&fields=${FIELDS}&api_key=${API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API error ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    return data.results && data.results.length > 0 ? data.results[0] : null;
  }

  const searchName = NAME_OVERRIDES[school.name] || school.name;
  const encoded = encodeURIComponent(searchName);
  const url = `${BASE_URL}?school.name=${encoded}&fields=${FIELDS}&api_key=${API_KEY}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${resp.statusText}`);
  }

  const data = await resp.json();
  if (!data.results || data.results.length === 0) {
    return null;
  }

  // Find the best match: prefer exact state match, then closest name
  let best = null;
  const normSearch = normalize(searchName);

  for (const r of data.results) {
    const normResult = normalize(r["school.name"]);
    const stateMatch = r["school.state"] === school.state;

    if (!best) {
      best = { result: r, stateMatch, nameMatch: normResult === normSearch };
    } else {
      const isBetter =
        (stateMatch && !best.stateMatch) ||
        (stateMatch === best.stateMatch &&
          normResult === normSearch &&
          !best.nameMatch);
      if (isBetter) {
        best = { result: r, stateMatch, nameMatch: normResult === normSearch };
      }
    }
  }

  return best ? best.result : data.results[0];
}

function transformResult(school, raw) {
  const isPublic = raw["school.ownership"] === 1;

  // For public schools, net_price is under public; for private, under private
  const npPrefix = isPublic
    ? "latest.cost.net_price.public.by_income_level"
    : "latest.cost.net_price.private.by_income_level";

  // Calculate sticker cost (total COA)
  // For public schools, attendance.academic_year is often in-state COA
  // Out-of-state sticker = tuition_oos + room_board + ~$2K fees estimate
  const tuitionInState = raw["latest.cost.tuition.in_state"];
  const tuitionOOS = raw["latest.cost.tuition.out_of_state"];
  const roomBoard = raw["latest.cost.roomboard.oncampus"];
  const coaReported = raw["latest.cost.attendance.academic_year"];

  // Estimate total costs
  const feesEstimate = 2000; // books, personal, etc.
  const totalInState =
    tuitionInState && roomBoard
      ? tuitionInState + roomBoard + feesEstimate
      : coaReported;
  const totalOOS =
    tuitionOOS && roomBoard ? tuitionOOS + roomBoard + feesEstimate : null;

  return {
    slug: school.slug,
    name: school.name,
    api_name: raw["school.name"],
    ipeds_id: raw["id"],
    state: raw["school.state"],
    city: raw["school.city"],
    type: isPublic ? "public" : "private",
    tier: school.tier,
    scorecard: {
      source: "College Scorecard",
      retrieved: new Date().toISOString().split("T")[0],
      admit_rate: raw["latest.admissions.admission_rate.overall"],
      sat_reading_25: raw["latest.admissions.sat_scores.25th_percentile.critical_reading"],
      sat_reading_75: raw["latest.admissions.sat_scores.75th_percentile.critical_reading"],
      sat_math_25: raw["latest.admissions.sat_scores.25th_percentile.math"],
      sat_math_75: raw["latest.admissions.sat_scores.75th_percentile.math"],
      act_25: raw["latest.admissions.act_scores.25th_percentile.cumulative"],
      act_75: raw["latest.admissions.act_scores.75th_percentile.cumulative"],
      tuition_in_state: tuitionInState,
      tuition_out_of_state: tuitionOOS,
      room_board: roomBoard,
      total_cost_in_state: totalInState,
      total_cost_out_of_state: totalOOS,
      net_price: {
        "0_30k": raw[`${npPrefix}.0-30000`],
        "30_48k": raw[`${npPrefix}.30001-48000`],
        "48_75k": raw[`${npPrefix}.48001-75000`],
        "75_110k": raw[`${npPrefix}.75001-110000`],
        "110k_plus": raw[`${npPrefix}.110001-plus`],
      },
      pell_rate: raw["latest.aid.pell_grant_rate"],
      federal_loan_rate: raw["latest.aid.federal_loan_rate"],
      enrollment: raw["latest.student.size"],
    },
    cds: null, // To be filled by CDS PDF parser
    reference: null, // To be filled manually
  };
}

async function main() {
  const args = process.argv.slice(2);
  const tierFilter = args.includes("--tier")
    ? args[args.indexOf("--tier") + 1]
    : null;
  const skipExisting = args.includes("--skip-existing");
  const singleSchool = args.includes("--school")
    ? args[args.indexOf("--school") + 1]
    : null;

  const listPath = path.join(__dirname, "..", "data", "school-list.json");
  const schoolsDir = path.join(__dirname, "..", "data", "schools");
  const rawDir = path.join(__dirname, "..", "data", "scorecard-raw");

  // Ensure directories exist
  fs.mkdirSync(schoolsDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });

  let schools = JSON.parse(fs.readFileSync(listPath, "utf8"));

  if (tierFilter) {
    schools = schools.filter(
      (s) => s.tier.toUpperCase() === tierFilter.toUpperCase()
    );
    console.log(`Filtering to Tier ${tierFilter}: ${schools.length} schools`);
  }

  if (singleSchool) {
    schools = schools.filter((s) =>
      s.name.toLowerCase().includes(singleSchool.toLowerCase())
    );
    console.log(`Filtering to: ${schools.map((s) => s.name).join(", ")}`);
  }

  let fetched = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  console.log(`\nFetching Scorecard data for ${schools.length} schools...\n`);

  for (const school of schools) {
    const schoolFile = path.join(schoolsDir, `${school.slug}.json`);

    if (skipExisting && fs.existsSync(schoolFile)) {
      const existing = JSON.parse(fs.readFileSync(schoolFile, "utf8"));
      if (existing.scorecard) {
        skipped++;
        continue;
      }
    }

    try {
      const raw = await fetchSchool(school);
      if (!raw) {
        console.log(`  NOT FOUND: ${school.name}`);
        failures.push({ name: school.name, error: "Not found in API" });
        failed++;
        await sleep(DELAY_MS);
        continue;
      }

      // Save raw response
      fs.writeFileSync(
        path.join(rawDir, `${school.slug}.json`),
        JSON.stringify(raw, null, 2)
      );

      // Transform and save
      const transformed = transformResult(school, raw);

      // If school file already exists (e.g., has CDS/reference data), merge
      if (fs.existsSync(schoolFile)) {
        const existing = JSON.parse(fs.readFileSync(schoolFile, "utf8"));
        existing.scorecard = transformed.scorecard;
        existing.api_name = transformed.api_name;
        existing.ipeds_id = transformed.ipeds_id;
        existing.city = transformed.city;
        fs.writeFileSync(schoolFile, JSON.stringify(existing, null, 2));
      } else {
        fs.writeFileSync(schoolFile, JSON.stringify(transformed, null, 2));
      }

      // Verify name match
      const apiName = raw["school.name"];
      const nameMatch =
        normalize(apiName) === normalize(school.name) ||
        normalize(apiName) === normalize(NAME_OVERRIDES[school.name] || "");

      fetched++;
      const matchTag = nameMatch ? "" : ` [API: "${apiName}"]`;
      console.log(
        `  [${fetched}/${schools.length}] ${school.name}${matchTag} — admit: ${(raw["latest.admissions.admission_rate.overall"] * 100).toFixed(1)}%, tuition: $${raw["latest.cost.tuition.out_of_state"] || raw["latest.cost.tuition.in_state"]}`
      );
    } catch (err) {
      console.log(`  ERROR: ${school.name} — ${err.message}`);
      failures.push({ name: school.name, error: err.message });
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n--- Done ---`);
  console.log(`Fetched: ${fetched}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
    // Save failures list
    fs.writeFileSync(
      path.join(__dirname, "..", "data", "scorecard-failures.json"),
      JSON.stringify(failures, null, 2)
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
