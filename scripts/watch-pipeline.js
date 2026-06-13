// Polls the Scaffold admin API and logs pipeline status transitions.
const URL = "https://scaffold-hazel.vercel.app/api/submissions?code=SCAFFOLD1216";
const TERMINAL = new Set(["completed", "review_failed", "cancelled", "failed"]);
const POLL_MS = 30000;
const MAX_POLLS = 90; // 45 min

let last = "";
let polls = 0;

async function poll() {
  polls++;
  try {
    const res = await fetch(URL);
    const j = await res.json();
    const IGNORE = process.env.IGNORE_ID || ""; // optionally skip a known old submission
    const sub = (j.submissions || []).find((s) => s.id !== IGNORE);
    if (!sub) {
      if (polls === 1) console.log("waiting for new submission to appear...");
    }
    if (sub && sub.status && sub.status !== last) {
      const t = new Date().toLocaleTimeString("en-US", { hour12: false });
      console.log(`[${t}] status: ${sub.status} (id: ${sub.id}, review: ${sub.review_status || "n/a"})`);
      last = sub.status;
    }
    if (sub && TERMINAL.has(sub.status)) {
      console.log(`TERMINAL: ${sub.status} after ${polls} polls (~${Math.round((polls * POLL_MS) / 60000)} min)`);
      process.exit(0);
    }
  } catch (e) {
    console.log(`poll error: ${e.message}`);
  }
  if (polls >= MAX_POLLS) {
    console.log(`TIMEOUT (last status: ${last})`);
    process.exit(1);
  }
  setTimeout(poll, POLL_MS);
}
poll();
