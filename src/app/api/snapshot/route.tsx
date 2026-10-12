import { ImageResponse } from "next/og";
import { validRunSig } from "@/lib/auth";
import { getRun, signalsForRun } from "@/lib/data";
import { SIGNAL_LABEL } from "@/lib/extract";

// The dashboard snapshot embedded at the top of the Monday email. Signed URL: loads in Gmail without a login.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const runId = u.searchParams.get("run") ?? "";
  if (!validRunSig(runId, u.searchParams.get("sig"))) return new Response("forbidden", { status: 403 });
  const run = await getRun(runId);
  if (!run?.stats) return new Response("not found", { status: 404 });
  const rows = await signalsForRun(runId);
  const hot = rows.filter((r) => r.signal.bucket === "call").slice(0, 4);
  const b = run.stats.buckets;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
  const tiles: [string, string | number, string][] = [
    ["Worth a call", b.call, "#c2410c"],
    ["Warm", b.watch, "#a16207"],
    ["Cool", b.fyi, "#2b5fb3"],
    ["Cold, still listed", b.skip, "#66707f"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f6f4ee", padding: 44, fontFamily: "sans-serif", color: "#15171c" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0d4d47", display: "flex", alignItems: "center", justifyContent: "center", }}><div style={{ width: 22, height: 22, borderRadius: 99, border: "3px solid #fff", display: "flex" }} /></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>CSR Radar</div>
              <div style={{ fontSize: 17, color: "#858a93" }}>{`Week of ${fmt(run.windowStart)} – ${fmt(run.windowEnd)}`}</div>
            </div>
          </div>
          <div style={{ fontSize: 17, color: "#858a93" }}>{`${run.stats.collected} stories scanned · ${run.stats.extracted + run.stats.cached} read`}</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 36, lineHeight: 1.2, fontWeight: 600, display: "flex" }}>{run.summary?.headline ?? "Your week, ranked."}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
          {tiles.map(([l, v, c]) => (
            <div key={l} style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e6e2d8", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: c }}>{String(v)}</div>
              <div style={{ fontSize: 17, color: "#858a93" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, background: "#fff", border: "1px solid #e6e2d8", borderRadius: 14, padding: "8px 20px" }}>
          {hot.map((r, i) => (
            <div key={r.signal.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderTop: i ? "1px solid #eee9de" : "none" }}>
              <div style={{ display: "flex", background: "#fdebe1", color: "#c2410c", borderRadius: 99, padding: "4px 12px", fontSize: 16, fontWeight: 700 }}>{r.signal.score}</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{r.article.extraction?.company ?? "—"}</div>
                <div style={{ fontSize: 16, color: "#464b55" }}>{((s: string) => (s.length > 92 ? `${s.slice(0, 90)}…` : s))(r.article.extraction?.summary ?? "")}</div>
              </div>
              <div style={{ fontSize: 15, color: "#0d4d47", fontWeight: 600 }}>{r.article.extraction ? SIGNAL_LABEL[r.article.extraction.signalType] : ""}</div>
            </div>
          ))}
          {!hot.length && <div style={{ display: "flex", padding: "16px 0", fontSize: 18, color: "#858a93" }}>Nothing cleared the bar this week — Warm and Cold are on the dashboard.</div>}
        </div>
      </div>
    ),
    { width: 1200, height: 760 },
  );
}
