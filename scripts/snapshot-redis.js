#!/usr/bin/env node
// Snapshot every submission + the interest list via the admin APIs into
// data/backups/redis-latest.json (overwritten; git history keeps versions).
// This is the CLAUDE.md "Documentation Discipline" step 5 as one command.
//
// Usage:
//   SCAFFOLD_ADMIN_CODE=... node scripts/snapshot-redis.js "note about why"
//
// Env: SCAFFOLD_URL to override the base URL (default: production).

const fs = require("fs");
const path = require("path");

const BASE = process.env.SCAFFOLD_URL || "https://scaffold-hazel.vercel.app";
const CODE = process.env.SCAFFOLD_ADMIN_CODE;
const OUT = path.join(__dirname, "..", "data", "backups", "redis-latest.json");

async function getJson(p) {
  const r = await fetch(BASE + p);
  if (!r.ok) throw new Error(`${p.split("?")[0]} returned ${r.status}`);
  return r.json();
}

async function main() {
  if (!CODE) {
    console.error("Set SCAFFOLD_ADMIN_CODE (the admin.html code).");
    process.exit(1);
  }
  const code = encodeURIComponent(CODE);
  const list = await getJson(`/api/submissions?code=${code}`);
  const ids = (list.submissions || list).map((s) => s.id).filter(Boolean);

  const submissions = [];
  for (const id of ids) {
    const full = await getJson(`/api/submission?code=${code}&id=${encodeURIComponent(id)}`);
    submissions.push(full.submission || full);
  }
  const notify = await getJson(`/api/notify-signup?code=${code}`);

  const snapshot = {
    snapshot_date: new Date().toISOString().slice(0, 10),
    note: process.argv[2] || "",
    submissions,
    notify_emails: notify,
  };
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Wrote ${submissions.length} submissions + ${notify.count ?? "?"} interest emails to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error("Snapshot failed:", e.message);
  process.exit(1);
});
