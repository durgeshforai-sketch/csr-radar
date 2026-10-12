import Link from "next/link";
import { connection } from "next/server";
import { listRuns, runningRun } from "@/lib/data";
import { RunNow } from "@/components/run-now";
import { fmtDateTime } from "@/components/ui";

export default async function Runs() {
  await connection();
  const [runs, running] = await Promise.all([listRuns(), runningRun()]);
  const done = runs.filter((r) => r.status !== "running" && r.finishedAt);
  const avgSec = done.length ? Math.round(done.reduce((a, r) => a + (r.finishedAt!.getTime() - r.startedAt.getTime()), 0) / done.length / 1000) : 0;
  const delivered = done.filter((r) => r.status !== "failed").length;
  const clean = done.filter((r) => r.status === "done").length;
  const cost = done.reduce((a, r) => a + r.costUsd, 0);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Reliability</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Runs</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>Every run of the pipeline: daily at 07:30 IST, Mondays with the email, or on demand. Each stage is counted so nothing disappears silently.</p>
        </div>
        <RunNow activeId={running?.id} />
      </div>
      <div className="row" style={{ gap: 10, marginBottom: 18 }}>
        <div className="kpi"><div className="v">{runs.length}</div><div className="l">Runs logged</div></div>
        <div className="kpi"><div className="v">{done.length ? `${Math.round((delivered / done.length) * 100)}%` : "—"}</div><div className="l">Runs delivered a digest · {clean} with every source up</div></div>
        <div className="kpi"><div className="v">{avgSec}s</div><div className="l">Average duration</div></div>
        <div className="kpi"><div className="v">${cost.toFixed(3)}</div><div className="l">Gemini cost, all runs</div></div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Started</th><th>Trigger</th><th>Status</th><th>Sources</th><th>Scanned → read</th><th>Hot / Warm / Cool / Cold</th><th>Time</th><th>Cost</th><th>Email</th></tr></thead>
          <tbody>
            {runs.map((r) => {
              const s = r.stats;
              return (
                <tr key={r.id}>
                  <td><Link className="link" href={`/runs/${r.id}`}>{fmtDateTime(r.startedAt)}</Link></td>
                  <td><span className="chip">{r.trigger}</span></td>
                  <td>{r.status === "done" ? <span className="chip ok">✓ done</span> : r.status === "partial" ? <span className="chip" style={{ color: "var(--warm)" }}>◐ partial</span> : r.status === "running" ? <span className="chip pulse">running · {r.stage}</span> : <span className="chip warn">✕ failed</span>}</td>
                  <td className="num">{s ? `${s.sources.filter((x) => x.ok && !x.skipped).length}/${s.sources.filter((x) => !x.skipped).length}` : "—"}</td>
                  <td className="num">{s ? `${s.collected} → ${s.extracted + s.cached}` : "—"}</td>
                  <td className="num">{s ? `${s.buckets.call} / ${s.buckets.watch} / ${s.buckets.fyi} / ${s.buckets.skip}` : "—"}</td>
                  <td className="num">{r.finishedAt ? `${Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)}s` : "—"}</td>
                  <td className="num">${r.costUsd.toFixed(4)}</td>
                  <td className="small">{r.emailedAt ? <span className="chip ok">sent</span> : r.emailError ? <span className="chip warn" title={r.emailError}>failed</span> : <span className="muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
