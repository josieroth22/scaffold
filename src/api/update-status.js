const { Redis } = require("@upstash/redis");

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

  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: "Missing id or status" });

  const allowed = ["review_failed", "generation_failed", "completed", "cancelled", "regenerating", "regenerated"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status not allowed" });
  }

  try {
    await redis.hset(`submission:${id}`, { status });

    // Plan-ready email: fires once, only on completion, only if Resend is
    // configured (RESEND_API_KEY in Vercel env)
    if (status === "completed" && process.env.RESEND_API_KEY) {
      try {
        const sub = await redis.hgetall(`submission:${id}`);
        if (sub && sub.email && !sub.plan_email_sent) {
          const name = sub.student_name || "your student";
          const planUrl = `https://scaffoldcollegestrategy.com/plan.html?id=${id}`;
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Scaffold <plans@scaffoldcollegestrategy.com>",
              to: sub.email,
              subject: `${name}'s college strategy is ready`,
              html: `<p>Your Scaffold plan is ready to read.</p>
                <p><a href="${planUrl}" style="font-weight:bold;">Open ${name}'s College Strategy</a></p>
                <p>Start with the Executive Summary. Three minutes, everything important. The rest is there when you need it.</p>
                <p>This link is private and permanent. Bookmark it, share it with your co-parent or counselor, and come back as things change.</p>
                <p style="color:#6b6860; font-size:13px;">Scaffold is strategic planning, not professional counseling. No guarantee of admission or scholarship outcomes.</p>`,
            }),
          });
          if (resp.ok) await redis.hset(`submission:${id}`, { plan_email_sent: "1" });
          else console.error("Plan email failed:", resp.status, await resp.text().catch(() => ""));
        }
      } catch (e) {
        console.error("Plan email error (non-fatal):", e);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status: " + err.message });
  }
};
