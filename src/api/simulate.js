const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ITERATIONS = 10000;

function extractSimParams(output) {
  const match = output.match(/```json-simulation-params\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error("Failed to parse simulation params:", e);
    return null;
  }
}

function runSimulation(params) {
  const { schools, family_budget } = params;
  const numSchools = schools.length;

  // Per-school accumulators
  const schoolResults = schools.map((s) => ({
    name: s.name,
    tier: s.tier,
    round: s.round,
    sticker_cost: s.sticker_cost,
    admit_count: 0,
    merit_count: 0,
    net_costs: [], // only for admitted scenarios
    merit_amounts: [], // only when merit awarded
    affordable_count: 0, // admitted AND net cost <= budget
  }));

  // Portfolio-level accumulators
  let atLeastOneAdmit = 0;
  let atLeastOneAffordable = 0;
  const cheapestOptions = []; // min net cost per iteration (across admitted schools)

  for (let iter = 0; iter < ITERATIONS; iter++) {
    let hasAdmit = false;
    let hasAffordable = false;
    let minNetCost = Infinity;

    for (let si = 0; si < numSchools; si++) {
      const school = schools[si];
      const result = schoolResults[si];

      // 1. Admission: Bernoulli draw
      const admitted = Math.random() < school.admit_pct;
      if (!admitted) continue;

      result.admit_count++;
      hasAdmit = true;

      // 2. Merit scholarship: Bernoulli draw (if school offers merit)
      let meritAward = 0;
      if (school.merit_pct > 0 && Math.random() < school.merit_pct) {
        // Uniform draw between merit_low and merit_high
        meritAward =
          school.merit_low +
          Math.random() * (school.merit_high - school.merit_low);
        result.merit_count++;
        result.merit_amounts.push(meritAward);
      }

      // 3. Need-based aid: uniform draw between need_aid_low and need_aid_high
      const needAid =
        school.need_aid_low +
        Math.random() * (school.need_aid_high - school.need_aid_low);

      // 4. Net cost
      const netCost = Math.max(0, school.sticker_cost - meritAward - needAid);
      result.net_costs.push(netCost);

      if (netCost <= family_budget) {
        result.affordable_count++;
        hasAffordable = true;
      }

      if (netCost < minNetCost) {
        minNetCost = netCost;
      }
    }

    if (hasAdmit) atLeastOneAdmit++;
    if (hasAffordable) atLeastOneAffordable++;
    if (minNetCost < Infinity) cheapestOptions.push(minNetCost);
  }

  // Compute per-school stats
  const schoolStats = schoolResults.map((r) => {
    const sorted = r.net_costs.slice().sort((a, b) => a - b);
    const meritSorted = r.merit_amounts.slice().sort((a, b) => a - b);

    return {
      name: r.name,
      tier: r.tier,
      round: r.round,
      sticker_cost: r.sticker_cost,
      simulated_admit_rate: r.admit_count / ITERATIONS,
      admit_count: r.admit_count,
      net_cost: {
        min: sorted.length > 0 ? Math.round(percentile(sorted, 0)) : null,
        p25: sorted.length > 0 ? Math.round(percentile(sorted, 0.25)) : null,
        median:
          sorted.length > 0 ? Math.round(percentile(sorted, 0.5)) : null,
        p75: sorted.length > 0 ? Math.round(percentile(sorted, 0.75)) : null,
        max: sorted.length > 0 ? Math.round(percentile(sorted, 1)) : null,
      },
      affordable_rate:
        r.admit_count > 0 ? r.affordable_count / r.admit_count : 0,
      merit: {
        rate: r.admit_count > 0 ? r.merit_count / r.admit_count : 0,
        median:
          meritSorted.length > 0
            ? Math.round(percentile(meritSorted, 0.5))
            : 0,
      },
    };
  });

  // Portfolio stats
  const cheapestSorted = cheapestOptions.slice().sort((a, b) => a - b);

  const portfolio = {
    at_least_one_admit: atLeastOneAdmit / ITERATIONS,
    at_least_one_affordable: atLeastOneAffordable / ITERATIONS,
    expected_cheapest: {
      median:
        cheapestSorted.length > 0
          ? Math.round(percentile(cheapestSorted, 0.5))
          : null,
      p25:
        cheapestSorted.length > 0
          ? Math.round(percentile(cheapestSorted, 0.25))
          : null,
      p75:
        cheapestSorted.length > 0
          ? Math.round(percentile(cheapestSorted, 0.75))
          : null,
    },
    family_budget: family_budget,
  };

  return {
    iterations: ITERATIONS,
    schools: schoolStats,
    portfolio,
  };
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  if (p <= 0) return sortedArr[0];
  if (p >= 1) return sortedArr[sortedArr.length - 1];
  const idx = p * (sortedArr.length - 1);
  const lower = Math.floor(idx);
  const frac = idx - lower;
  if (lower + 1 >= sortedArr.length) return sortedArr[lower];
  return sortedArr[lower] + frac * (sortedArr[lower + 1] - sortedArr[lower]);
}

async function storeSimError(id, message) {
  try {
    await redis.hset(`submission:${id}`, {
      simulation_error: message,
    });
  } catch (e) {
    console.error("Failed to store simulation error:", e);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    const data = await redis.hgetall(`submission:${id}`);
    if (!data || !data.output) {
      await storeSimError(id, "Submission not found or no output yet");
      return res.status(404).json({ error: "Submission not found or no output yet" });
    }

    const params = extractSimParams(data.output);
    if (!params || !params.schools || params.schools.length === 0) {
      await storeSimError(id, "No simulation parameters found in output");
      return res.status(422).json({ error: "No simulation parameters found in output" });
    }

    const results = runSimulation(params);

    // Store results and clear any previous error
    await redis.hset(`submission:${id}`, {
      simulation: JSON.stringify(results),
      simulation_error: "",
    });

    return res.status(200).json(results);
  } catch (err) {
    console.error("Simulation error:", err);
    await storeSimError(id, err.message);
    return res.status(500).json({ error: "Simulation failed: " + err.message });
  }
};
