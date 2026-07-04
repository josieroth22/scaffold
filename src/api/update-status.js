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

  const allowed = ["review_failed", "generation_failed", "completed", "completed_with_issues", "cancelled", "regenerating", "regenerated"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status not allowed" });
  }

  try {
    await redis.hset(`submission:${id}`, { status });

    // Plan-ready email: fires once, only on completion, only if Resend is
    // configured (RESEND_API_KEY in Vercel env). completed_with_issues still
    // delivers the plan (best-version-ships is by design); Josie gets a
    // separate alert below.
    const isCompletion = status === "completed" || status === "completed_with_issues";
    if (isCompletion && process.env.RESEND_API_KEY) {
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
              reply_to: "josieroth22@gmail.com",
              to: sub.email,
              subject: `${name}'s Scaffold College Strategy is ready`,
              // Branded to match the site: cream page, warm-white card, sage
              // accents, serif wordmark/headline (Georgia stands in for
              // Newsreader; email clients strip web fonts). Table layout +
              // inline styles for client compatibility.
              html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f5f0; padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#fdfcfa; border:1px solid #d9d4cc; border-radius:12px;">
      <tr><td style="padding:32px 40px 0 40px;">
        <span style="font-family:Georgia,'Times New Roman',serif; font-size:22px; font-weight:600; letter-spacing:-0.02em; color:#1a1a18;"><span style="color:#4a6741;">S</span>caffold</span>
      </td></tr>
      <tr><td style="padding:28px 40px 0 40px;">
        <h1 style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:600; line-height:1.25; color:#1a1a18;">${name}'s College Strategy is ready</h1>
      </td></tr>
      <tr><td style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:#1a1a18;">
        Your <a href="${planUrl}" style="color:#4a6741;">Scaffold plan</a> is ready to read!
      </td></tr>
      <tr><td style="padding:24px 40px 0 40px;">
        <a href="${planUrl}" style="display:inline-block; background-color:#4a6741; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">Open ${name}'s Strategy</a>
      </td></tr>
      <tr><td style="padding:24px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:#1a1a18;">
        Start with the Executive Summary. Three minutes, everything important. The rest is there when you need it.
      </td></tr>
      <tr><td style="padding:16px 40px 28px 40px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:#1a1a18;">
        This link is private and permanent. Bookmark it, share it with your co-parent or counselor, and come back as things change.
      </td></tr>
      <tr><td style="padding:20px 40px 32px 40px; border-top:1px solid #e8ede6; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#6b6860;">
        Scaffold is strategic planning, not professional counseling. No guarantee of admission or scholarship outcomes.
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:16px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#6b6860;" align="center">
        Scaffold &middot; <a href="https://scaffoldcollegestrategy.com" style="color:#6b6860;">scaffoldcollegestrategy.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>`,
            }),
          });
          if (resp.ok) await redis.hset(`submission:${id}`, { plan_email_sent: "1" });
          else console.error("Plan email failed:", resp.status, await resp.text().catch(() => ""));
        }
      } catch (e) {
        console.error("Plan email error (non-fatal):", e);
      }
    }

    // Alert Josie when a plan ships despite a failing final review, so a
    // flawed plan in a customer's hands is never a silent event
    if (status === "completed_with_issues" && process.env.RESEND_API_KEY) {
      try {
        const sub = await redis.hgetall(`submission:${id}`);
        if (sub && !sub.issue_alert_sent) {
          const name = sub.student_name || "unknown";
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Scaffold <plans@scaffoldcollegestrategy.com>",
              to: "josieroth22@gmail.com",
              subject: `ALERT: ${name}'s plan shipped with a failing review (${id})`,
              html: `<p>This plan completed but its final review did not pass. The family received their plan email as usual. Read it before they do.</p>
                <p><a href="https://scaffoldcollegestrategy.com/plan.html?id=${id}">Open the plan</a> &middot; <a href="https://scaffoldcollegestrategy.com/admin.html">Admin dashboard</a></p>`,
            }),
          });
          if (resp.ok) await redis.hset(`submission:${id}`, { issue_alert_sent: "1" });
          else console.error("Issue alert email failed:", resp.status);
        }
      } catch (e) {
        console.error("Issue alert error (non-fatal):", e);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status: " + err.message });
  }
};
