import { Resend } from "resend";
import { signRun } from "./auth";
import { getRun, signalsForRun } from "./data";
import { SIGNAL_LABEL } from "./extract";
import { journeyStage } from "./outreach";
import type { Settings } from "./settings";

// Monday digest: a dashboard snapshot + ONLY the companies that pass (Hot). Everything else lives on the site.

const esc = (s: string | null | undefined) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const base = () => (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function buildDigest(runId: string) {
  const run = await getRun(runId);
  if (!run?.stats) throw new Error("Run not found");
  const rows = await signalsForRun(runId);
  const hot = rows.filter((r) => r.signal.bucket === "call");
  const b = run.stats.buckets;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
  const url = base();
  const snap = `${url}/api/snapshot?run=${runId}&sig=${signRun(runId)}`;
  const subject = `CSR Radar · ${hot.length ? `${hot.length} worth a call` : "quiet week"} · week of ${fmt(run.windowStart)}`;

  const cards = hot
    .map((r) => {
      const e = r.article.extraction!;
      const j = journeyStage(e);
      const where = e.places.length ? e.places.slice(0, 2).join(", ") : e.panIndia ? "Pan-India" : "";
      return `
<tr><td style="padding:0 0 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6e2d8;border-radius:12px;border-left:4px solid #c2410c">
    <tr><td style="padding:16px 18px">
      <div style="font:600 12px/1.4 Arial,sans-serif;color:#c2410c;text-transform:uppercase;letter-spacing:.06em">Hot · ${esc(SIGNAL_LABEL[e.signalType])} · score ${r.signal.score}</div>
      <div style="font:700 20px/1.3 Georgia,serif;color:#15171c;margin-top:4px">${esc(e.company)}</div>
      <div style="font:15px/1.5 Arial,sans-serif;color:#464b55;margin-top:6px">${esc(e.summary)}</div>
      <div style="font:14px/1.5 Arial,sans-serif;color:#15171c;margin-top:10px;background:#fbfaf6;border:1px solid #eee9de;border-radius:8px;padding:9px 11px"><b>Why it matters:</b> ${esc(e.whyItMatters)}</div>
      <div style="font:13px/1.5 Arial,sans-serif;color:#858a93;margin-top:10px">${esc([where, e.amountText, e.deadline ? `Deadline ${e.deadline}` : "", `Buyer stage: ${j.stage.replace("_", "-")}`].filter(Boolean).join(" · "))}</div>
      ${r.article.poc?.name ? `<div style="font:14px/1.5 Arial,sans-serif;color:#15171c;margin-top:8px"><b>Contact:</b> ${esc(r.article.poc.name)}${r.article.poc.role ? `, ${esc(r.article.poc.role)}` : ""} <span style="color:#858a93">(${r.article.poc.source === "article" ? "named in story" : "web search — verify"})</span></div>` : ""}
      <div style="margin-top:12px">
        <a href="${url}/story/${r.article.id}" style="display:inline-block;background:#0d4d47;color:#ffffff;font:600 14px Arial,sans-serif;text-decoration:none;padding:9px 14px;border-radius:8px">Open brief &amp; draft email</a>
        <a href="${esc(r.article.url)}" style="display:inline-block;margin-left:8px;color:#0d4d47;font:600 14px Arial,sans-serif;text-decoration:underline">Read the source</a>
      </div>
    </td></tr>
  </table>
</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f4ee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
  <tr><td style="padding:0 0 14px;font:700 22px Georgia,serif;color:#15171c">CSR Radar <span style="font:14px Arial,sans-serif;color:#858a93">· Monday digest, week of ${fmt(run.windowStart)} – ${fmt(run.windowEnd)}</span></td></tr>
  <tr><td style="padding:0 0 18px"><a href="${url}/"><img src="${snap}" width="640" alt="Dashboard snapshot: ${b.call} worth a call, ${b.watch} warm" style="display:block;width:100%;height:auto;border-radius:12px;border:1px solid #e6e2d8"></a></td></tr>
  ${run.summary?.bullets.length ? `<tr><td style="padding:0 0 18px;font:15px/1.6 Arial,sans-serif;color:#464b55">${run.summary.bullets.map((x) => `→ ${esc(x)}`).join("<br>")}</td></tr>` : ""}
  <tr><td style="padding:0 0 10px;font:700 18px Georgia,serif;color:#15171c">Worth a call this week (${hot.length})</td></tr>
  ${cards || `<tr><td style="padding:0 0 14px;font:15px Arial,sans-serif;color:#464b55">Nothing cleared the bar this week.</td></tr>`}
  <tr><td style="padding:6px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d4d47;border-radius:12px"><tr><td style="padding:18px 20px;font:15px/1.5 Arial,sans-serif;color:#ffffff">
      Also on your dashboard: <b>${b.watch} warm</b>, <b>${b.fyi} cool</b>, <b>${b.policy} policy</b> and <b>${b.skip} cold</b> stories — nothing is hidden.<br>
      <a href="${url}/" style="display:inline-block;margin-top:10px;background:#ffffff;color:#0d4d47;font:700 14px Arial,sans-serif;text-decoration:none;padding:9px 14px;border-radius:8px">Open the full dashboard →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 0 0;font:12px/1.5 Arial,sans-serif;color:#858a93">Read and ranked by CSR Radar (Gemini Flash + your scoring rules). The dashboard refreshes every morning at 07:30 IST. Change sectors, regions and weights in Settings.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `CSR Radar — week of ${fmt(run.windowStart)}`,
    run.summary?.headline ?? "",
    "",
    `Worth a call (${hot.length}):`,
    ...hot.map((r) => `• ${r.article.extraction?.company}: ${r.article.extraction?.summary} — ${url}/story/${r.article.id}`),
    "",
    `Everything else (${b.watch} warm, ${b.fyi} cool, ${b.skip} cold): ${url}/`,
  ].join("\n");
  return { subject, html, text };
}

export async function sendDigest(runId: string, s: Settings): Promise<{ ok: boolean; to: string[]; error?: string }> {
  const to = s.recipients.length ? s.recipients : (process.env.DIGEST_RECIPIENT ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!to.length) return { ok: false, to, error: "No recipients set" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, to, error: "RESEND_API_KEY is not set" };
  try {
    const d = await buildDigest(runId);
    const r = await new Resend(key).emails.send({ from: process.env.EMAIL_FROM ?? "CSR Radar <onboarding@resend.dev>", to, subject: d.subject, html: d.html, text: d.text });
    if (r.error) return { ok: false, to, error: r.error.message };
    return { ok: true, to };
  } catch (e) {
    return { ok: false, to, error: String(e).slice(0, 200) };
  }
}
