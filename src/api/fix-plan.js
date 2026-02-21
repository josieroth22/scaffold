const Anthropic = require("@anthropic-ai/sdk");
const { Redis } = require("@upstash/redis");

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
    if (!data || !data.output || !data.review) {
      return res.status(404).json({ error: "Submission not found or missing output/review" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to load submission: " + err.message });
  }

  // Check if cancelled before starting
  if (data.status === 'cancelled') {
    return res.status(200).json({ cancelled: true });
  }

  await redis.hset(`submission:${id}`, { status: "fixing" });

  // Parse review results
  let review;
  if (typeof data.review === 'string') {
    try { review = JSON.parse(data.review); } catch (e) {
      return res.status(500).json({ error: "Failed to parse review results" });
    }
  } else {
    review = data.review;
  }

  // Extract failed checks
  const failedChecks = [];
  if (review.checks) {
    for (const [name, check] of Object.entries(review.checks)) {
      if (check.status === 'FAIL') {
        failedChecks.push(`- ${name}: ${check.detail}`);
      }
    }
  }

  if (failedChecks.length === 0) {
    return res.status(200).json({ success: true, skipped: true, reason: "No failed checks to fix" });
  }

  // Parse form data for context
  let formData;
  if (typeof data.form_data === 'string') {
    try { formData = JSON.parse(data.form_data); } catch (e) { formData = {}; }
  } else {
    formData = data.form_data || {};
  }

  // Parse simulation results if available (for cost-related fixes)
  let simSection = '';
  if (data.simulation) {
    let simResults;
    if (typeof data.simulation === 'string') {
      try { simResults = JSON.parse(data.simulation); } catch (e) { /* ignore */ }
    } else {
      simResults = data.simulation;
    }
    if (simResults && simResults.schools) {
      simSection = '\nSIMULATION DATA (use these numbers for any cost corrections):\n';
      for (const s of simResults.schools) {
        const median = s.net_cost?.median;
        const p25 = s.net_cost?.p25;
        const p75 = s.net_cost?.p75;
        if (median != null) {
          const low = Math.round(p25 / 1000) * 1000;
          const high = Math.round(p75 / 1000) * 1000;
          simSection += `- ${s.name}: $${low.toLocaleString()}-$${high.toLocaleString()}/year (median $${median.toLocaleString()}), simulated admit: ${((s.simulated_admit_rate || 0) * 100).toFixed(1)}%\n`;
        }
      }
      if (simResults.family_budget) {
        simSection += `Family budget: $${simResults.family_budget.toLocaleString()}\n`;
      }
    }
  }

  // Strip the JSON simulation params block from output for the prompt
  const cleanOutput = data.output.replace(/```json-simulation-params[\s\S]*?```/g, '');

  const prompt = `You are a copy editor fixing specific issues in a college strategy document. A quality review found the following problems. You must produce a JSON array of find-and-replace operations to fix ONLY these issues.

ISSUES TO FIX:
${failedChecks.join('\n')}

FAMILY DETAILS (for reference, to avoid removing real content):
- Student: ${formData.student_name || formData.student_first_name || 'Unknown'}, ${formData.student_age_grade || ''}
- School: ${formData.school_name || ''}, ${formData.school_type || ''}
- City: ${formData.city || ''}
- Income: ${formData.income || ''}
- College budget: ${formData.college_budget || 'Not specified'}
- Extracurriculars: ${formData.extracurriculars || 'Not specified'}
- Interests: ${formData.interests || 'Not specified'}
- Additional context: ${formData.additional_context || 'None'}
${simSection}
RULES:
- Fix ONLY the issues listed above
- Do NOT change school names, tiers, recommendations, or tone
- Do NOT change admission probabilities (unless flagged above)
- Do NOT remove content that matches the family's actual input
- For cost fixes, use the simulation data above as the source of truth
- For date fixes, the current year is ${new Date().getFullYear()} and all planning should be forward-looking
- Each replacement must match an EXACT substring of the document (including whitespace and punctuation)
- Use the minimum number of replacements needed. Each one should be short and targeted.
- The "find" string must be unique in the document (include enough surrounding context to be unambiguous)

OUTPUT FORMAT: Return ONLY a JSON array of objects, each with "find" and "replace" keys:
\`\`\`json
[
  {"find": "exact text from document to replace", "replace": "corrected text"},
  {"find": "another exact snippet", "replace": "its replacement"}
]
\`\`\`

Only output the JSON block. No other text.

THE DOCUMENT:

${cleanOutput}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text;

    // Parse the JSON array of replacements
    let replacements;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      try {
        replacements = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse fix replacements:", e.message, "Raw:", text.slice(0, 500));
        return res.status(500).json({ error: "Failed to parse fix instructions" });
      }
    } else {
      console.error("No JSON found in fix response:", text.slice(0, 500));
      return res.status(500).json({ error: "Fix response did not contain valid JSON" });
    }

    if (!Array.isArray(replacements) || replacements.length === 0) {
      return res.status(200).json({ success: true, skipped: true, reason: "No replacements produced" });
    }

    // Apply replacements to the output with fuzzy whitespace matching
    let fixedOutput = data.output;
    let appliedCount = 0;

    // Normalize whitespace for matching: collapse runs of whitespace to single space
    function normalizeWs(s) {
      return s.replace(/\s+/g, ' ').trim();
    }

    for (const r of replacements) {
      if (!r.find || !r.replace) continue;

      // Try exact match first
      if (fixedOutput.includes(r.find)) {
        fixedOutput = fixedOutput.replace(r.find, r.replace);
        appliedCount++;
        continue;
      }

      // Fuzzy match: normalize whitespace on both sides and search
      const normalizedFind = normalizeWs(r.find);
      if (!normalizedFind) continue;

      // Build a regex that matches the find string with flexible whitespace
      const escaped = normalizedFind
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/ /g, '\\s+');
      const fuzzyRegex = new RegExp(escaped);
      const match = fixedOutput.match(fuzzyRegex);
      if (match) {
        fixedOutput = fixedOutput.replace(match[0], r.replace);
        appliedCount++;
      }
    }

    // Save the fixed output back to Redis
    await redis.hset(`submission:${id}`, {
      output: fixedOutput,
      fix_applied: "true",
    });

    return res.status(200).json({
      success: true,
      fixed: true,
      replacements_requested: replacements.length,
      replacements_applied: appliedCount,
    });
  } catch (err) {
    console.error("Fix-plan error:", err);
    return res.status(500).json({ error: "Fix failed: " + err.message });
  }
};
