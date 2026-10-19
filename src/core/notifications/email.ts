/**
 * Transactional email through Resend's REST API (free tier: 3000/month).
 * Without RESEND_API_KEY the email is only logged, so local dev needs no setup.
 * Never throws: a failed email must not fail the action that triggered it.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.info(`[email:dev] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Glideinbir Gurukul <onboarding@resend.dev>", to, subject, html }),
    });
    if (!res.ok) console.error(`[email] Resend responded ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal branded wrapper. All interpolated text is escaped. */
export function emailLayout(title: string, lines: string[], cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${esc(cta.url)}" style="background:#5b47ff;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#15132b">
<p style="font-weight:800;font-size:18px;margin:0 0 24px">Glideinbir Gurukul</p>
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>
${lines.map((l) => `<p style="line-height:1.6;margin:0 0 10px;color:#5f5b78">${esc(l)}</p>`).join("")}
${button}
<p style="font-size:12px;color:#999;margin-top:32px">Learn. Soar. Grow.</p></div>`;
}
