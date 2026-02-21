const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");
const { MODEL, FIX_TEMPERATURE } = require("../lib/config");

const client = new Anthropic.default();
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing submission id" });

  let data;
  try {
    data = await redis.hgetall(`submission:${id}`);
    if (!data || !data.output || !data.simulation) {
      return res.status(404).json({ error: "Submission not found or missing output/simulation" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to load submission: " + err.message });
  }

  // Parse simulation results
  let simResults;
  if (typeof data.simulation === 'string') {
    try { simResults = JSON.parse(data.simulation); } catch (e) {
      return res.status(500).json({ error: "Failed to parse simulation results" });
    }
  } else {
    simResults = data.simulation;
  }

  // Check if cancelled before starting
  if (data.status === 'cancelled') {
    return res.status(200).json({ cancelled: true });
  }

  // Build cost correction table from simulation
  const schools = simResults.schools || [];
  if (schools.length === 0) {
    return res.status(200).json({ skipped: true, reason: "No simulation schools" });
  }

  // Build cost + tier correction table from simulation
  let costTable = "Here are the ACTUAL simulated results per school (from 10,000 Monte Carlo iterations):\n\n";
  for (const s of schools) {
    const median = s.net_cost?.median;
    const p25 = s.net_cost?.p25;
    const p75 = s.net_cost?.p75;
    const simAdmit = s.simulated_admit_rate;
    // Assign tier based on simulated admit rate
    let tier = 'Target';
    if (simAdmit != null) {
      if (simAdmit < 0.20) tier = 'Reach';
      else if (simAdmit >= 0.50) tier = 'Safety';
    }
    let line = `- ${s.name}: TIER=${tier}`;
    if (simAdmit != null) line += `, simulated admit=${(simAdmit * 100).toFixed(1)}%`;
    if (median != null) {
      const low = Math.round(p25 / 1000) * 1000;
      const high = Math.round(p75 / 1000) * 1000;
      line += `, net cost=$${low.toLocaleString()}-$${high.toLocaleString()}/year (median $${median.toLocaleString()})`;
    }
    costTable += line + '\n';
  }

  // Strip the JSON simulation params block from the narrative for the edit
  const cleanOutput = data.output.replace(/```json-simulation-params[\s\S]*?```/g, '');

  const prompt = `You are editing a college strategy document to incorporate Monte Carlo simulation results. The document was written with estimated costs and initial tier labels, but we've now run a simulation with 10,000 iterations and have better numbers.

Your job: Update TWO things throughout the document:
1. **Net cost estimates** — replace with the simulation's p25-p75 range
2. **Tier labels** (Reach/Target/Safety) — replace with the simulation-derived tier shown below

Do not change anything else: not the tone, not the school list, not the analysis, not the recommendations.

${costTable}

**Rules:**
- For each school, find every place its estimated net cost appears (executive summary table, per-school writeup, probability table, any other mention) and update the number to match the simulation range (p25-p75).
- For each school, find every place its tier label appears (executive summary table, per-school section header, probability table) and update it to match the TIER shown above. If the simulation says TIER=Safety but the document says "Reach," change it to "Safety" everywhere for that school.
- Round costs to the nearest $1,000 for clean numbers (e.g., $24,219 becomes "$24,000" or "$24K").
- Use ranges based on the p25-p75 values (e.g., if p25=$18,000 and p75=$28,000, write "$18-28K/year").
- Keep the same formatting style the document already uses.
- Update the financial floor amount if it changed.
- Do NOT add or remove text beyond cost numbers and tier labels. Do NOT change school names, application rounds, or narrative tone.
- Do NOT change the stated admission probability percentages in the narrative or tables. The tiers are changing, but the probability numbers stay as written.
- Output the COMPLETE updated document. Every word must be included.

**IMPORTANT:** Also re-append the original JSON simulation parameters block at the very end, exactly as it was. Here it is:

${data.output.match(/```json-simulation-params[\s\S]*?```/)?.[0] || ''}

**THE DOCUMENT TO UPDATE:**

${cleanOutput}`;

  await redis.hset(`submission:${id}`, { status: "reconciling" });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      temperature: FIX_TEMPERATURE,
      messages: [{ role: "user", content: prompt }],
    });

    const updatedOutput = response.content[0].text;

    // Save the reconciled output back to Redis
    await redis.hset(`submission:${id}`, {
      output: updatedOutput,
      costs_reconciled: "true",
    });

    return res.status(200).json({ success: true, reconciled: true });
  } catch (err) {
    console.error("Reconciliation error:", err);
    return res.status(500).json({ error: "Reconciliation failed: " + err.message });
  }
};
