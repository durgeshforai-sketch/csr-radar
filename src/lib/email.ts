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

  // Dashboard theme, email-safe: tables + inline styles (H-care cards × Loud dark hero, purple + lime)
  const F = `'Plus Jakarta Sans',Helvetica,Arial,sans-serif`;
  const T = { canvas: "#f4f3fb", night: "#0c0b12", ink: "#17151f", ink2: "#4b4858", muted: "#8d8a9b", line: "#ebe9f3", soft: "#f8f7fd", brand: "#7c3aed", brandSoft: "#f1eafe", lime: "#c6f24e", hot: "#f2600c", hotSoft: "#fff0e6" };
  const initials = (n: string) => n.replace(/^(dr|mr|ms|mrs)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const cards = hot
    .map((r) => {
      const e = r.article.extraction!;
      const j = journeyStage(e);
      const where = e.places.length ? e.places.slice(0, 2).join(", ") : e.panIndia ? "Pan-India" : "";
      const poc = r.article.poc;
      return `
<tr><td style="padding:0 0 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${T.line};border-radius:18px">
    <tr><td style="padding:18px 20px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font:700 12px ${F}">
          <span style="display:inline-block;background:${T.hotSoft};color:${T.hot};border-radius:99px;padding:4px 10px">&#9679; Hot</span>
          <span style="display:inline-block;background:${T.soft};color:${T.ink2};border:1px solid ${T.line};border-radius:99px;padding:3px 10px;margin-left:4px;font-weight:600">${esc(SIGNAL_LABEL[e.signalType])}</span>
        </td>
        <td align="right" style="width:44px"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;border:3px solid ${T.hot};text-align:center;font:800 12px/30px ${F};color:${T.ink}">${r.signal.score}</div></td>
      </tr></table>
      <div style="font:800 20px/1.25 ${F};color:${T.ink};letter-spacing:-0.3px;margin-top:10px">${esc(e.company ?? "Company not named")}</div>
      <div style="font:400 14px/1.55 ${F};color:${T.ink2};margin-top:4px">${esc(e.summary)}</div>
      <div style="font:400 13.5px/1.55 ${F};color:${T.ink};margin-top:12px;background:${T.soft};border:1px solid ${T.line};border-radius:12px;padding:10px 12px"><b>Why it matters:</b> ${esc(e.whyItMatters)}</div>
      <div style="font:400 12.5px/1.5 ${F};color:${T.muted};margin-top:10px">${esc([where, e.amountText, e.deadline ? `Deadline ${e.deadline}` : ""].filter(Boolean).join(" · "))}${where || e.amountText || e.deadline ? " · " : ""}<span style="color:${T.brand};font-weight:700">Buyer stage: ${j.stage.replace("_", "-")}</span></div>
      ${
        poc?.name
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px dashed #dcd9e8;width:100%"><tr>
        <td style="padding-top:12px;width:44px"><div style="width:36px;height:36px;line-height:36px;border-radius:50%;background:${T.brandSoft};color:${T.brand};text-align:center;font:800 12px ${F}">${esc(initials(poc.name))}</div></td>
        <td style="padding-top:12px;font:700 13.5px/1.3 ${F};color:${T.ink}">${esc(poc.name)}<div style="font:400 12px/1.4 ${F};color:${T.muted}">${esc(poc.role ?? "")} · ${poc.source === "article" ? "named in story" : "web search — verify"}</div></td>
      </tr></table>`
          : ""
      }
      <div style="margin-top:14px">
        <a href="${url}/story/${r.article.id}" style="display:inline-block;background:${T.brand};color:#ffffff;font:700 13.5px ${F};text-decoration:none;padding:10px 16px;border-radius:12px">Open brief &amp; draft email</a>
        <a href="${esc(r.article.url)}" style="display:inline-block;margin-left:10px;color:${T.brand};font:700 13.5px ${F};text-decoration:underline">Read the source</a>
      </div>
    </td></tr>
  </table>
</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;background:${T.canvas}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.canvas}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
  <tr><td style="padding:0 0 16px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:40px"><div style="width:32px;height:32px;border-radius:10px;background:${T.brand};background-image:linear-gradient(135deg,${T.lime},${T.brand})"></div></td>
      <td style="font:800 19px ${F};color:${T.ink};letter-spacing:-0.3px">CSR Radar <span style="font:500 13px ${F};color:${T.muted};letter-spacing:0">&nbsp;Monday digest · ${fmt(run.windowStart)} – ${fmt(run.windowEnd)}</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 0 16px"><a href="${url}/"><img src="${snap}" width="640" alt="Dashboard snapshot: ${b.call} worth a call, ${b.watch} warm, ${b.fyi} cool, ${b.skip} cold" style="display:block;width:100%;height:auto;border-radius:20px;border:0"></a></td></tr>

  ${
    run.summary?.bullets.length
      ? `<tr><td style="padding:0 0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${T.line};border-radius:18px"><tr><td style="padding:16px 20px">
    <div style="font:700 11.5px ${F};color:${T.muted};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">The week in one minute</div>
    ${run.summary.bullets.map((x) => `<div style="font:400 14px/1.6 ${F};color:${T.ink2};padding:3px 0"><span style="color:${T.brand};font-weight:800">&rarr;</span>&nbsp; ${esc(x)}</div>`).join("")}
  </td></tr></table></td></tr>`
      : ""
  }

  <tr><td style="padding:0 0 12px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:40px"><div style="width:30px;height:30px;line-height:30px;border-radius:10px;background:${T.hotSoft};color:${T.hot};text-align:center;font:800 14px ${F}">&#9650;</div></td>
      <td style="font:800 18px ${F};color:${T.ink};letter-spacing:-0.2px">Worth a call this week <span style="color:${T.muted};font-weight:600">(${hot.length})</span></td>
    </tr></table>
  </td></tr>
  ${cards || `<tr><td style="padding:0 0 14px;font:400 14px ${F};color:${T.ink2}">Nothing cleared the bar this week.</td></tr>`}

  <tr><td style="padding:8px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.night};border-radius:22px"><tr><td style="padding:22px 24px">
      <div style="font:700 19px ${F};color:#ffffff;letter-spacing:-0.3px">Nothing is hidden, <span style="color:rgba(255,255,255,0.5)">Ananya</span></div>
      <div style="font:400 14px/1.6 ${F};color:rgba(255,255,255,0.7);margin-top:6px">Also on your dashboard: <b style="color:#fff">${b.watch} warm</b>, <b style="color:#fff">${b.fyi} cool</b>, <b style="color:#fff">${b.policy} policy</b> and <b style="color:${T.lime}">${b.skip} cold</b> stories, ranked, in case you know someone there.</div>
      <a href="${url}/" style="display:inline-block;margin-top:14px;background:${T.lime};color:#2a3a00;font:800 14px ${F};text-decoration:none;padding:11px 18px;border-radius:99px">Open the full dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 4px 0;font:400 12px/1.6 ${F};color:${T.muted}">Read and ranked by CSR Radar (Gemini Flash + your scoring rules). The dashboard refreshes every morning at 07:30 IST · change sectors, regions and weights in Settings.</td></tr>
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
