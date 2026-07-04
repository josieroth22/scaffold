#!/usr/bin/env node
// Backend pipeline driver. Replicates intake.html's client-side orchestration
// so test profiles can be submitted without filling out the form.
//
// Usage:
//   node scripts/run-pipeline.js brett            (scripts/profiles/brett-roth.json)
//   node scripts/run-pipeline.js sofia            (scripts/profiles/sofia-martinez.json)
//   node scripts/run-pipeline.js path/to/profile.json
//
// Env: SCAFFOLD_URL to override the base URL (default: production).
//
// Keep the phase logic in sync with intake.html (PHASE 1-7 comments there).

const fs = require("fs");
const path = require("path");

const BASE = process.env.SCAFFOLD_URL || "https://scaffold-hazel.vercel.app";
const MAX_FIX_ATTEMPTS = 2;
const MAX_REGEN_ATTEMPTS = 1;

const ALIASES = {
  brett: "profiles/brett-roth.json",
  sofia: "profiles/sofia-martinez.json",
};

function log(msg) {
  const t = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`[${t}] ${msg}`);
}

function loadProfile(arg) {
  const candidates = ALIASES[arg]
    ? [path.join(__dirname, ALIASES[arg])]
    : [path.resolve(arg), path.join(__dirname, arg)];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error("profile not found: " + arg);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function post(pathname, body) {
  // One retry on network-level failures (transient resets killed a run on 7/2)
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(BASE + pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt >= 2) throw e;
      log(`${pathname} network error (${e.message}), retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function postJson(pathname, body) {
  const res = await post(pathname, body);
  if (!res.ok) throw new Error(pathname + " returned " + res.status);
  return res.json();
}

// Milliseconds of total stream silence before we declare the connection dead.
// Must exceed Fable's silent thinking phase (~3 min before first text).
const STALL_MS = 6 * 60 * 1000;

// Consume an SSE stream from generate/regenerate/generate-tier2.
// Returns { id, chars } when the server signals done/tier1_done.
// Throws if the stream goes silent for STALL_MS (e.g. the serverless
// function was killed at maxDuration and the socket became a zombie).
async function streamSSE(res, label) {
  const decoder = new TextDecoder();
  let id = null;
  let chars = 0;
  let buf = "";
  let lastLog = Date.now();
  let firstChunk = true;
  let lastByte = Date.now();
  const watchdog = setInterval(() => {
    if (Date.now() - lastByte > STALL_MS) {
      clearInterval(watchdog);
      log(`${label}: no data for ${Math.round(STALL_MS / 60000)} min, aborting (server function likely killed)`);
      res.body.cancel?.();
    }
  }, 15000);
  watchdog.unref?.();
  for await (const chunk of res.body) {
    lastByte = Date.now();
    if (firstChunk) {
      firstChunk = false;
      log(`${label}: stream attached, first bytes received`);
    }
    buf += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data: ")) continue;
      let parsed;
      try {
        parsed = JSON.parse(line.slice(6));
      } catch (e) {
        continue;
      }
      if (parsed.id) id = parsed.id;
      if (parsed.text) {
        chars += parsed.text.length;
        if (Date.now() - lastLog > 30000) {
          log(`${label}: ${chars} chars streamed...`);
          lastLog = Date.now();
        }
      }
      if (parsed.error) {
        clearInterval(watchdog);
        throw new Error(parsed.error);
      }
      if (parsed.done || parsed.tier1_done) {
        clearInterval(watchdog);
        return { id, chars };
      }
    }
  }
  clearInterval(watchdog);
  // Stream ended without a done signal: the server died mid-generation
  throw new Error(`${label} stream ended without completion signal (${chars} chars received; server function likely hit maxDuration)`);
}

async function review(id, label) {
  try {
    const r = await postJson("/api/review", { id });
    const passed = r.overall === "PASS";
    const fails = Object.entries(r.checks || {})
      .filter(([, v]) => v && v.status === "FAIL")
      .map(([k]) => k);
    const flags = (r.validator || {}).flags || [];
    const vFixes = ((r.validator || {}).auto_fixes || []).length;
    const needsRegen = flags.some((f) => f.severity === "regen");
    log(`${label}: ${r.overall} (${fails.length} failed${fails.length ? ": " + fails.join(", ") : ""}; validator: ${vFixes} auto-fixes, ${flags.length} flags${needsRegen ? "; REGEN-SEVERITY FLAG" : ""})`);
    return { passed, needsRegen };
  } catch (e) {
    // Mirror intake.html: a broken review call does not block the pipeline
    log(`${label} request failed (${e.message}), proceeding as passed`);
    return { passed: true, needsRegen: false };
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/run-pipeline.js <brett|sofia|profile.json>");
    process.exit(1);
  }
  const profile = loadProfile(arg);
  log(`Submitting ${profile.student_name} ${profile.student_last_name || ""} to ${BASE}`);

  // PHASE 1: Tier 1 (SSE)
  const genRes = await post("/api/generate", profile);
  if (!genRes.ok) throw new Error("generate returned " + genRes.status);
  const t1 = await streamSSE(genRes, "Tier 1");
  const id = t1.id;
  if (!id) throw new Error("no submission id received");
  log(`Tier 1 complete: ${t1.chars} chars (id: ${id})`);

  // PHASE 2: initial review
  let r = await review(id, "Review T1");
  let reviewPassed = r.passed;

  // PHASE 3: fix loop — skipped when the validator says the document needs
  // regeneration (e.g. missing JSON block: find/replace cannot fix absence)
  let fixAttempt = 0;
  if (r.needsRegen) {
    log("Validator raised a regen-severity flag; skipping fix loop.");
  }
  while (!reviewPassed && !r.needsRegen && fixAttempt < MAX_FIX_ATTEMPTS) {
    fixAttempt++;
    log(`Fix attempt ${fixAttempt}...`);
    const fixRes = await post("/api/fix-plan", { id });
    if (!fixRes.ok) {
      const body = await fixRes.text().catch(() => "");
      log(`fix-plan returned ${fixRes.status}: ${body.slice(0, 300)} — stopping fix loop`);
      break;
    }
    r = await review(id, `Re-review after fix ${fixAttempt}`);
    reviewPassed = r.passed;
  }

  // PHASE 4: regenerate
  let regenAttempt = 0;
  if (!reviewPassed && regenAttempt < MAX_REGEN_ATTEMPTS) {
    regenAttempt++;
    log("Fix attempts exhausted. Regenerating...");
    const regenRes = await post("/api/regenerate", { id });
    if (regenRes.ok) {
      const rg = await streamSSE(regenRes, "Regen");
      log(`Regeneration complete: ${rg.chars} chars`);
      reviewPassed = (await review(id, "Review after regen")).passed;
    } else {
      log(`regenerate returned ${regenRes.status}`);
    }
  }

  if (!reviewPassed) {
    log("All T1 attempts exhausted. Proceeding with best version (review_failed).");
    await post("/api/update-status", { id, status: "review_failed" }).catch(() => {});
  }

  // PHASE 5: simulate + reconcile
  try {
    await postJson("/api/simulate", { id });
    log("Simulation complete");
  } catch (e) {
    log(`Simulation failed: ${e.message}`);
  }
  try {
    await postJson("/api/reconcile-costs", { id });
    log("Reconciliation complete");
  } catch (e) {
    log(`Reconciliation failed: ${e.message}`);
  }

  // PHASE 6: Tier 2 (SSE)
  const t2Res = await post("/api/generate-tier2", { id });
  if (t2Res.ok) {
    const t2 = await streamSSE(t2Res, "Tier 2");
    log(`Tier 2 complete: ${t2.chars} chars`);
  } else {
    log(`Tier 2 failed: ${t2Res.status}`);
  }

  // PHASE 7: final review + one fix
  let finalPassed = (await review(id, "Final review")).passed;
  if (!finalPassed) {
    log("Final fix attempt...");
    const ffRes = await post("/api/fix-plan", { id });
    if (ffRes.ok) {
      finalPassed = (await review(id, "Review after final fix")).passed;
    } else {
      const body = await ffRes.text().catch(() => "");
      log(`final fix-plan returned ${ffRes.status}: ${body.slice(0, 300)}`);
    }
  }
  if (!finalPassed) {
    await post("/api/update-status", { id, status: "review_failed" }).catch(() => {});
  }

  // DONE (intake.html marks completed regardless; mirror that)
  await post("/api/update-status", { id, status: "completed" }).catch(() => {});

  log("================================================");
  log(`RESULT: ${finalPassed ? "PASS" : "REVIEW_FAILED (best version kept)"}`);
  log(`T1 attempts: 1 generation + ${fixAttempt} fix + ${regenAttempt} regen`);
  log(`Plan: ${BASE}/plan.html?id=${id}`);
  log(`Admin detail: ${BASE}/admin.html (submission ${id})`);
  process.exit(finalPassed ? 0 : 2);
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
