#!/usr/bin/env node

/**
 * Bulk fetch ALL 4-year, public/private nonprofit schools (500+ students)
 * from the College Scorecard API. Paginates through results and saves each
 * school as a JSON file.
 *
 * Usage:
 *   SCORECARD_API_KEY=xxx node scripts/fetch-all-scorecard.js
 */

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.SCORECARD_API_KEY || "DEMO_KEY";
const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const PER_PAGE = 100;
const DELAY_MS = 500; // ms between paginated requests

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function transformResult(raw) {
  const isPublic = raw["school.ownership"] === 1;
  const npPrefix = isPublic
    ? "latest.cost.net_price.public.by_income_level"
    : "latest.cost.net_price.private.by_income_level";

  const tuitionInState = raw["latest.cost.tuition.in_state"];
  const tuitionOOS = raw["latest.cost.tuition.out_of_state"];
  const roomBoard = raw["latest.cost.roomboard.oncampus"];
  const coaReported = raw["latest.cost.attendance.academic_year"];

  const feesEstimate = 2000;
  const totalInState =
    tuitionInState && roomBoard
      ? tuitionInState + roomBoard + feesEstimate
      : coaReported;
  const totalOOS =
    tuitionOOS && roomBoard ? tuitionOOS + roomBoard + feesEstimate : null;

  const name = raw["school.name"];
  const slug = slugify(name);

  return {
    slug,
    name,
    ipeds_id: raw["id"],
    state: raw["school.state"],
    city: raw["school.city"],
    type: isPublic ? "public" : "private",
    scorecard: {
      source: "College Scorecard",
      retrieved: new Date().toISOString().split("T")[0],
      admit_rate: raw["latest.admissions.admission_rate.overall"],
      sat_reading_25:
        raw["latest.admissions.sat_scores.25th_percentile.critical_reading"],
      sat_reading_75:
        raw["latest.admissions.sat_scores.75th_percentile.critical_reading"],
      sat_math_25:
        raw["latest.admissions.sat_scores.25th_percentile.math"],
      sat_math_75:
        raw["latest.admissions.sat_scores.75th_percentile.math"],
      act_25:
        raw["latest.admissions.act_scores.25th_percentile.cumulative"],
      act_75:
        raw["latest.admissions.act_scores.75th_percentile.cumulative"],
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
    cds: null,
    reference: null,
  };
}

async function main() {
  const schoolsDir = path.join(__dirname, "..", "data", "schools");
  fs.mkdirSync(schoolsDir, { recursive: true });

  // Load existing school-list.json to preserve tier info
  const listPath = path.join(__dirname, "..", "data", "school-list.json");
  const existingList = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const tierMap = {};
  for (const s of existingList) {
    tierMap[s.slug] = s.tier;
  }

  let page = 0;
  let totalFetched = 0;
  let totalSchools = null;
  let newSchools = 0;
  let updatedSchools = 0;
  const allSchools = [];

  console.log("Fetching all 4-year public/private nonprofit schools (500+ students)...\n");

  while (true) {
    const url =
      `${BASE_URL}?school.degrees_awarded.predominant=3` +
      `&school.ownership__range=1..2` +
      `&latest.student.size__range=500..` +
      `&fields=${FIELDS}` +
      `&per_page=${PER_PAGE}` +
      `&page=${page}` +
      `&api_key=${API_KEY}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`API error on page ${page}: ${resp.status} ${resp.statusText}`);
      // Retry once after delay
      await sleep(2000);
      const retry = await fetch(url);
      if (!retry.ok) {
        console.error(`Retry failed on page ${page}, stopping.`);
        break;
      }
      var data = await retry.json();
    } else {
      var data = await resp.json();
    }

    if (totalSchools === null) {
      totalSchools = data.metadata.total;
      console.log(`Total schools to fetch: ${totalSchools}\n`);
    }

    if (!data.results || data.results.length === 0) break;

    for (const raw of data.results) {
      const transformed = transformResult(raw);
      const slug = transformed.slug;

      // Preserve tier if this school was in our original 150
      if (tierMap[slug]) {
        transformed.tier = tierMap[slug];
      }

      const schoolFile = path.join(schoolsDir, `${slug}.json`);

      // If file exists, merge (preserve CDS/reference data)
      if (fs.existsSync(schoolFile)) {
        const existing = JSON.parse(fs.readFileSync(schoolFile, "utf8"));
        existing.scorecard = transformed.scorecard;
        existing.ipeds_id = transformed.ipeds_id;
        existing.city = transformed.city;
        if (!existing.type) existing.type = transformed.type;
        fs.writeFileSync(schoolFile, JSON.stringify(existing, null, 2));
        updatedSchools++;
      } else {
        fs.writeFileSync(schoolFile, JSON.stringify(transformed, null, 2));
        newSchools++;
      }

      allSchools.push({
        name: transformed.name,
        slug: slug,
        state: transformed.state,
        type: transformed.type,
        tier: transformed.tier || null,
        ipeds_id: transformed.ipeds_id,
      });

      totalFetched++;
    }

    const pct = Math.round((totalFetched / totalSchools) * 100);
    console.log(
      `  Page ${page + 1}: ${data.results.length} schools (${totalFetched}/${totalSchools}, ${pct}%)`
    );

    page++;
    if (totalFetched >= totalSchools) break;
    await sleep(DELAY_MS);
  }

  // Update school-list.json with all schools
  // Sort: tiered schools first (A, B, C), then the rest alphabetically
  allSchools.sort((a, b) => {
    const tierOrder = { A: 0, B: 1, C: 2 };
    const aOrder = a.tier ? tierOrder[a.tier] : 3;
    const bOrder = b.tier ? tierOrder[b.tier] : 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  fs.writeFileSync(
    path.join(__dirname, "..", "data", "school-list.json"),
    JSON.stringify(allSchools, null, 2)
  );

  console.log(`\n--- Done ---`);
  console.log(`Total fetched: ${totalFetched}`);
  console.log(`New school files: ${newSchools}`);
  console.log(`Updated existing: ${updatedSchools}`);
  console.log(`school-list.json updated with ${allSchools.length} schools`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
