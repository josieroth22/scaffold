// Diagnostic: measures the real function timeout ceiling.
// GET /api/duration-probe?seconds=360 sleeps that long, logging a heartbeat
// header flush every 20s, then returns. If the platform kills the function
// first, the client sees the connection die — the effective cap is between
// the last heartbeat and the kill. Delete after platform debugging is done.
module.exports = async function handler(req, res) {
  const seconds = Math.min(parseInt(req.query.seconds) || 360, 780);
  const started = Date.now();
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  res.write(`probe start, target ${seconds}s\n`);
  while ((Date.now() - started) / 1000 < seconds) {
    await new Promise((r) => setTimeout(r, 20000));
    res.write(`alive at ${Math.round((Date.now() - started) / 1000)}s\n`);
  }
  res.write(`survived ${seconds}s — ceiling is at least that\n`);
  res.end();
};
