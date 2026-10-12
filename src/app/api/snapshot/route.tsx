import { ImageResponse } from "next/og";
import { validRunSig } from "@/lib/auth";
import { getRun, signalsForRun } from "@/lib/data";
import { SIGNAL_LABEL } from "@/lib/extract";

// The dashboard snapshot at the top of the Monday email, in the dashboard's theme
// (Loud-style dark hero + H-care tiles). Signed URL: loads in Gmail without a login.

const C = { night: "#0c0b12", canvas: "#f4f3fb", ink: "#17151f", ink2: "#4b4858", muted: "#8d8a9b", line: "#ebe9f3", brand: "#7c3aed", brandSoft: "#f1eafe", lime: "#c6f24e", hot: "#f2600c", hotSoft: "#fff0e6", warm: "#d99a00", warmSoft: "#fff7dc", cool: "#3b82f6", coolSoft: "#e8f0ff", cold: "#6f7385", coldSoft: "#eef0f4" };

async function font(weight: number) {
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-${weight}-normal.woff`, { cache: "force-cache" });
    return r.ok ? { name: "Jakarta", data: await r.arrayBuffer(), weight: weight as 500 | 700 | 800, style: "normal" as const } : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const runId = u.searchParams.get("run") ?? "";
  if (!validRunSig(runId, u.searchParams.get("sig"))) return new Response("forbidden", { status: 403 });
  const run = await getRun(runId);
  if (!run?.stats) return new Response("not found", { status: 404 });
  const rows = await signalsForRun(runId);
  const hot = rows.filter((r) => r.signal.bucket === "call").slice(0, 4);
  const b = run.stats.buckets;
  const read = run.stats.extracted + run.stats.cached;
  const inSector = rows.filter((r) => r.signal.bucket !== "skip" && r.article.extraction?.sectors.length).length;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
  // The web font subset has no ₹ glyph; write "Rs" in the image (the email text keeps ₹)
  const clip = (s: string, n: number) => {
    const t = s.replace(/₹\s?/g, "Rs ");
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  };
  const fonts = (await Promise.all([font(500), font(700), font(800)])).filter((f): f is NonNullable<typeof f> => !!f);

  const tiles: [string, number, string, string][] = [
    ["Worth a call", b.call, C.hot, C.hotSoft],
    ["Warm", b.watch, C.warm, C.warmSoft],
    ["Cool", b.fyi, C.cool, C.coolSoft],
    ["Cold, still listed", b.skip, C.cold, C.coldSoft],
  ];
  const stripes = Array.from({ length: 24 }, (_, k) => k < Math.round((inSector / Math.max(1, read)) * 24));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.canvas, padding: 36, fontFamily: "Jakarta, sans-serif", color: C.ink }}>
        {/* Hero (Loud) */}
        <div style={{ display: "flex", position: "relative", overflow: "hidden", background: C.night, borderRadius: 28, padding: "30px 34px", color: "#fff" }}>
          <div style={{ position: "absolute", right: 60, top: -160, width: 380, height: 380, borderRadius: 999, background: "radial-gradient(circle at 35% 35%, rgba(198,242,78,0.55), rgba(124,58,237,0.45) 45%, rgba(12,11,18,0) 70%)", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1.1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.lime}, ${C.brand})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, border: "3px solid #fff", display: "flex" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>CSR Radar</div>
              <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>{`Week of ${fmt(run.windowStart)} – ${fmt(run.windowEnd)}`}</div>
            </div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700, marginTop: 22, letterSpacing: -1 }}>
              Good morning,<span style={{ color: "rgba(255,255,255,0.45)", marginLeft: 10 }}>Ananya</span>
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 10, lineHeight: 1.4, maxWidth: 560 }}>{clip(run.summary?.headline ?? "Your week, ranked.", 120)}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 18 }}>
              <div style={{ fontSize: 86, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3 }}>{String(b.call)}</div>
              <div style={{ display: "flex", flexDirection: "column", paddingBottom: 6 }}>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }}>worth a call this week</div>
                <div style={{ fontSize: 16, color: C.lime, fontWeight: 700 }}>{`${b.watch} more warming up`}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 16px", borderLeft: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{String(read)}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "4px 0 12px" }}>stories read</div>
              <div style={{ display: "flex", height: 56, borderRadius: 10, background: `linear-gradient(90deg, ${C.brand}, #9b6bff)` }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1.3, padding: "0 16px", borderLeft: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{String(inSector)}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "4px 0 12px" }}>in her sectors</div>
              <div style={{ display: "flex", gap: 5, height: 56, alignItems: "flex-end" }}>
                {stripes.map((on, k) => <div key={k} style={{ display: "flex", width: 7, height: "100%", borderRadius: 4, background: on ? "#8b5cf6" : "#2a2140" }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* KPI tiles (H-care) */}
        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          {tiles.map(([l, v, c, soft]) => (
            <div key={l} style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 20, padding: "16px 18px" }}>
              <div style={{ width: 46, height: 46, borderRadius: 99, background: soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 14, height: 14, borderRadius: 99, background: c, display: "flex" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{String(v)}</div>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Hot companies */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 20, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 22, padding: "10px 24px" }}>
          {hot.map((r, i) => (
            <div key={r.signal.id} style={{ display: "flex", alignItems: "center", gap: 18, padding: "13px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, border: `4px solid ${C.hot}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{String(r.signal.score)}</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>{r.article.extraction?.company ?? "—"}</div>
                <div style={{ fontSize: 15, color: C.ink2 }}>{clip(r.article.extraction?.summary ?? "", 96)}</div>
              </div>
              <div style={{ display: "flex", fontSize: 13, fontWeight: 700, color: C.hot, background: C.hotSoft, borderRadius: 99, padding: "5px 12px" }}>{r.article.extraction ? SIGNAL_LABEL[r.article.extraction.signalType] : ""}</div>
            </div>
          ))}
          {!hot.length && <div style={{ display: "flex", padding: "16px 0", fontSize: 18, color: C.muted }}>Nothing cleared the bar this week. Warm and Cold are on the dashboard.</div>}
        </div>
      </div>
    ),
    { width: 1200, height: 860, fonts: fonts.length ? fonts : undefined },
  );
}
