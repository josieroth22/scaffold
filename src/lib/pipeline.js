// Server-side pipeline conductor (Launch Plan chunk 1).
//
// Each submission carries its own state in its Redis hash (pipeline_* fields).
// api/advance.js runs ONE step per invocation, records the next step, then
// triggers itself again for the next one (self-chaining). A Vercel cron hits
// the same endpoint every minute and re-kicks any chain that broke (dead
// function, lost trigger). A per-submission Redis lock guarantees a step never
// runs twice at once: a duplicate Tier 1 costs ~$3.
//
// The step ladder mirrors scripts/run-pipeline.js and intake.html's PHASE 1-7
// (Tier 1 -> review -> up to 2 fixes -> 1 regen -> simulate -> reconcile ->
// Tier 2 -> final review -> 1 final fix -> completion status + emails).
// Keep all three in sync until the browser conductors are retired.

const crypto = require("crypto");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ACTIVE_SET = "pipeline:active";
const MAX_FIX_ATTEMPTS = 2;
const MAX_REGEN_ATTEMPTS = 1;
// A step that dies (function killed, crash) is retried this many times in
// total before the conductor moves on (or fails the plan, for Tier 1)
const MAX_STEP_TRIES = 2;
// Longer than maxDuration (800s), so a lock only outlives a dead function
const LOCK_TTL_S = 900;
// The sweep re-kicks a chain that has been idle (no lock) this long
const STALL_MS = 90 * 1000;

const lockKey = (id) => `pipeline_lock:${id}`;

function initialFields() {
  return {
    pipeline: "server",
    pipeline_step: "tier1",
    pipeline_step_tries: 0,
    pipeline_fix_attempts: 0,
    pipeline_regen_attempts: 0,
    pipeline_updated: Date.now(),
  };
}

// ---- Triggering -----------------------------------------------------------

// Always call back on the production domain. Deriving it from the incoming
// request broke the chain: cron invocations arrive on the deployment-specific
// URL, which sits behind Vercel's deployment protection, so callbacks there
// bounce with a 401 before reaching our code.
function baseUrl() {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "https://scaffoldcollegestrategy.com";
}

function authHeaders() {
  return process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
}

// advance.js answers 202 immediately and does the work in waitUntil, so
// awaiting this fetch only waits for the hand-off, not the step itself.
async function trigger(id, base) {
  try {
    const r = await fetch(`${base}/api/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) console.error(`pipeline trigger for ${id} returned ${r.status}`);
    await noteTrigger(id, `${r.status} ${base}`);
  } catch (e) {
    // The cron sweep picks it up within ~2 minutes
    console.error(`pipeline trigger for ${id} failed:`, e.message);
    await noteTrigger(id, `error ${e.message} ${base}`);
  }
}

// Last trigger outcome on the submission itself, so a broken chain is
// diagnosable from /api/plan?light=1 without digging through Vercel logs
async function noteTrigger(id, result) {
  try {
    await redis.hset(`submission:${id}`, { pipeline_last_trigger: `${new Date().toISOString()} ${result}`.slice(0, 300) });
  } catch (e) {}
  await logEvent(id, `trigger ${result}`);
}

// Capped per-plan event log (newest first): every hand-off and every tick's
// outcome, for diagnosing dropped chains. Read via /api/submission (admin).
async function logEvent(id, msg) {
  try {
    const key = `pipeline_log:${id}`;
    await redis.lpush(key, `${new Date().toISOString()} ${msg}`.slice(0, 300));
    await redis.ltrim(key, 0, 99);
    await redis.expire(key, 60 * 60 * 24 * 30);
  } catch (e) {}
}

async function start(id, req) {
  await redis.sadd(ACTIVE_SET, id);
  await trigger(id, baseUrl());
}

// ---- Running a step handler in-process ------------------------------------

// The step endpoints are Vercel (req, res) handlers. Calling them in-process
// with a minimal res keeps one implementation per step for both conductors.
// Resolves to { status, json, events } where events are parsed SSE payloads
// (text deltas dropped).
function invoke(handler, body) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let json = null;
    const events = [];
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve({ status: statusCode, json, events });
    };
    const res = {
      headersSent: false,
      setHeader() {},
      status(c) { statusCode = c; return res; },
      json(o) { json = o; res.headersSent = true; done(); return res; },
      end() { done(); return res; },
      write(chunk) {
        res.headersSent = true;
        for (const line of String(chunk).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (!ev.text) events.push(ev);
          } catch (e) {}
        }
        return true;
      },
    };
    Promise.resolve()
      .then(() => handler({ method: "POST", body, headers: {}, query: {} }, res))
      .then(done, (err) => {
        if (!settled) { statusCode = 500; json = { error: err.message }; }
        done();
      });
  });
}

const okStatus = (r) => r.status >= 200 && r.status < 300;
const wasCancelled = (r) =>
  !!(r.json && r.json.cancelled) ||
  r.events.some((e) => e.error && /cancel/i.test(e.error));
const sseFinished = (r) => okStatus(r) && r.events.some((e) => e.done || e.tier1_done) && !r.events.some((e) => e.error);

// Mirrors intake.html: a broken review call does not block the pipeline
function reviewOutcome(r) {
  if (!okStatus(r) || !r.json || !r.json.overall) return { passed: true, needsRegen: false, errored: true };
  const flags = (r.json.validator && r.json.validator.flags) || [];
  return {
    passed: r.json.overall === "PASS",
    needsRegen: flags.some((f) => f.severity === "regen"),
    errored: false,
  };
}

// ---- The ladder ------------------------------------------------------------

// Each step runs its work and returns { next, set?, cancelled? }.
// `s` is the submission hash (pipeline_* counters are strings from Redis).
const STEPS = {
  async tier1(id, s) {
    const { runTier1 } = require("../api/generate");
    let formData = s.form_data;
    if (typeof formData === "string") formData = JSON.parse(formData);
    const r = await runTier1(id, formData);
    if (r.cancelled) return { cancelled: true };
    return { next: "review_t1" };
  },

  async review_t1(id, s) {
    const r = await invoke(require("../api/review"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    const o = reviewOutcome(r);
    if (o.passed) return { next: "simulate" };
    return afterFailedT1Review(s, o.needsRegen);
  },

  async fix_t1(id, s) {
    const fixes = num(s.pipeline_fix_attempts) + 1;
    const r = await invoke(require("../api/fix-plan"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!okStatus(r)) {
      // A broken fix call ends the fix loop; fall through to regen
      return { ...afterFailedT1Review({ ...s, pipeline_fix_attempts: MAX_FIX_ATTEMPTS }, true), set: { pipeline_fix_attempts: fixes } };
    }
    return { next: "review_t1", set: { pipeline_fix_attempts: fixes } };
  },

  async regen(id, s) {
    const set = { pipeline_regen_attempts: num(s.pipeline_regen_attempts) + 1 };
    const r = await invoke(require("../api/regenerate"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!sseFinished(r)) return { next: "simulate", set, reviewFailed: true };
    return { next: "review_regen", set };
  },

  async review_regen(id) {
    const r = await invoke(require("../api/review"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    const o = reviewOutcome(r);
    // Unlike other reviews, a broken call here counts as not passed (intake.html)
    if (o.passed && !o.errored) return { next: "simulate" };
    return { next: "simulate", reviewFailed: true };
  },

  async simulate(id) {
    const r = await invoke(require("../api/simulate"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!okStatus(r)) console.warn(`pipeline ${id}: simulate failed (${r.status}), continuing`);
    return { next: "reconcile" };
  },

  async reconcile(id) {
    const r = await invoke(require("../api/reconcile-costs"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!okStatus(r)) console.warn(`pipeline ${id}: reconcile failed (${r.status}), continuing`);
    return { next: "tier2" };
  },

  async tier2(id) {
    const r = await invoke(require("../api/generate-tier2"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!sseFinished(r)) console.warn(`pipeline ${id}: tier 2 did not finish (${r.status}), continuing`);
    return { next: "review_final" };
  },

  async review_final(id) {
    const r = await invoke(require("../api/review"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    const o = reviewOutcome(r);
    if (o.passed) return { next: "finish", set: { pipeline_final_passed: 1 } };
    return { next: "fix_final" };
  },

  async fix_final(id) {
    const r = await invoke(require("../api/fix-plan"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    if (!okStatus(r)) return { next: "finish", set: { pipeline_final_passed: 0 } };
    return { next: "review_after_final_fix" };
  },

  async review_after_final_fix(id) {
    const r = await invoke(require("../api/review"), { id });
    if (wasCancelled(r)) return { cancelled: true };
    const o = reviewOutcome(r);
    return { next: "finish", set: { pipeline_final_passed: o.passed && !o.errored ? 1 : 0 } };
  },

  // Honest completion: update-status sends the plan email (and Josie's alert
  // on completed_with_issues), each guarded by its own once-only flag
  async finish(id, s) {
    const status = String(s.pipeline_final_passed) === "1" ? "completed" : "completed_with_issues";
    const r = await invoke(require("../api/update-status"), { id, status });
    if (!okStatus(r)) throw new Error(`update-status returned ${r.status}`);
    return { next: "done" };
  },
};

function num(v) {
  return parseInt(v, 10) || 0;
}

// Where to go after a failing Tier 1 review: fix (up to 2), else regen (1),
// else ship the best version marked review_failed
function afterFailedT1Review(s, needsRegen) {
  if (!needsRegen && num(s.pipeline_fix_attempts) < MAX_FIX_ATTEMPTS) return { next: "fix_t1" };
  if (num(s.pipeline_regen_attempts) < MAX_REGEN_ATTEMPTS) return { next: "regen" };
  return { next: "simulate", reviewFailed: true };
}

// What happens when a step has died MAX_STEP_TRIES times. Tier 1 has nothing
// to fall back on; every other step skips ahead the same way it would on an
// error response.
const ON_GIVE_UP = {
  tier1: null,
  review_t1: "simulate",
  fix_t1: "regen",
  regen: "simulate",
  review_regen: "simulate",
  simulate: "reconcile",
  reconcile: "tier2",
  tier2: "review_final",
  review_final: "finish",
  fix_final: "finish",
  review_after_final_fix: "finish",
  finish: null,
};

// ---- One conductor tick ----------------------------------------------------

async function advance(id, base) {
  const result = await advanceInner(id, base);
  await logEvent(id, `tick ${JSON.stringify(result)}`);
  return result;
}

async function advanceInner(id, base) {
  // "t" prefix keeps the token a string: Upstash JSON-parses stored values,
  // so an all-digit hex token would come back as a number and never match
  const token = "t" + crypto.randomBytes(8).toString("hex");
  const got = await redis.set(lockKey(id), token, { nx: true, ex: LOCK_TTL_S });
  if (!got) return { skipped: "locked", lock_ttl: await redis.ttl(lockKey(id)).catch(() => null) };

  let chain = false;
  try {
    const s = await redis.hgetall(`submission:${id}`);
    if (!s || s.pipeline !== "server") {
      await redis.srem(ACTIVE_SET, id);
      return { skipped: "not a server pipeline" };
    }
    const step = s.pipeline_step;
    if (s.status === "cancelled" || step === "done" || step === "failed") {
      await redis.srem(ACTIVE_SET, id);
      return { skipped: step === "done" ? "done" : s.status };
    }
    if (!STEPS[step]) throw new Error(`unknown pipeline step: ${step}`);

    // Count the attempt BEFORE running, so a step that kills its function
    // is visible to the next tick as a retry
    const tries = num(s.pipeline_step_tries) + 1;
    if (tries > MAX_STEP_TRIES) {
      const fallback = ON_GIVE_UP[step];
      if (!fallback) {
        await failPlan(id, `step ${step} died ${MAX_STEP_TRIES} times`);
        return { failed: step };
      }
      console.error(`pipeline ${id}: giving up on ${step} after ${MAX_STEP_TRIES} tries, moving to ${fallback}`);
      await redis.hset(`submission:${id}`, { pipeline_step: fallback, pipeline_step_tries: 0, pipeline_updated: Date.now() });
      chain = true;
      return { gaveUp: step, next: fallback };
    }
    await redis.hset(`submission:${id}`, { pipeline_step_tries: tries, pipeline_updated: Date.now() });

    let out;
    try {
      out = await STEPS[step](id, s);
    } catch (err) {
      // Leave pipeline_step as is: the sweep retries it (counted above)
      console.error(`pipeline ${id}: step ${step} threw:`, err);
      await redis.hset(`submission:${id}`, { pipeline_error: `${step}: ${err.message}`.slice(0, 500), pipeline_updated: 0 });
      return { error: err.message };
    }

    if (out.cancelled) {
      await redis.hset(`submission:${id}`, { pipeline_step: "done", pipeline_updated: Date.now() });
      await redis.srem(ACTIVE_SET, id);
      return { cancelled: true };
    }

    const fields = { ...(out.set || {}), pipeline_step: out.next, pipeline_step_tries: 0, pipeline_updated: Date.now() };
    // Same marker the browser conductors write when T1 ships unpassed
    if (out.reviewFailed) fields.status = "review_failed";
    await redis.hset(`submission:${id}`, fields);
    if (out.next === "done") {
      await redis.srem(ACTIVE_SET, id);
    } else {
      chain = true;
    }
    return { ran: step, next: out.next };
  } finally {
    // Release only our own lock
    try {
      if ((await redis.get(lockKey(id))) === token) await redis.del(lockKey(id));
    } catch (e) {}
    if (chain) await trigger(id, base);
  }
}

async function failPlan(id, reason) {
  await redis.hset(`submission:${id}`, {
    pipeline_step: "failed",
    status: "generation_failed",
    pipeline_error: reason,
    pipeline_updated: Date.now(),
  });
  await redis.srem(ACTIVE_SET, id);
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Scaffold <notifications@scaffoldcollegestrategy.com>",
        to: "josieroth22@gmail.com",
        subject: `Scaffold plan FAILED: ${id}`,
        html: `<p style="font-family:Arial,sans-serif;">Plan <strong>${id}</strong> could not be generated: ${reason}.</p><p style="font-family:Arial,sans-serif;">The family has no plan. Check <a href="https://scaffoldcollegestrategy.com/admin.html">admin</a> and Vercel logs.</p>`,
      }),
    }).catch((e) => console.error("Failure alert email failed:", e.message));
  }
}

// ---- Cron sweep ------------------------------------------------------------

// Re-kick every active pipeline that is idle (no lock) and hasn't moved in
// STALL_MS. Normal chaining triggers instantly, so anything idle that long
// has lost its chain.
async function sweep(base) {
  const ids = (await redis.smembers(ACTIVE_SET)) || [];
  await redis.set("pipeline:last_sweep", `${new Date().toISOString()} active=${ids.length}`);
  const kicked = [];
  for (const id of ids) {
    if (await redis.exists(lockKey(id))) continue;
    const updated = num(await redis.hget(`submission:${id}`, "pipeline_updated"));
    if (Date.now() - updated < STALL_MS) continue;
    kicked.push(id);
    await trigger(id, base);
  }
  return { active: ids.length, kicked };
}

module.exports = { initialFields, start, advance, sweep, baseUrl, invoke };
