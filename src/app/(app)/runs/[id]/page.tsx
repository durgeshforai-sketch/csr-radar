import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getRun } from "@/lib/data";
import { fmtDateTime } from "@/components/ui";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const run = await getRun((await params).id);
  if (!run) notFound();
  const s = run.stats;
  const steps = s
    ? [
        { l: "Collected from sources", n: s.collected },
        { l: "Inside the 7-day window", n: s.inWindow },
        { l: "Unique URLs", n: s.unique },
        { l: "Passed free pre-filter", n: s.unique - s.prefilteredOut },
        { l: "Read by Gemini (new + cached)", n: s.extracted + s.cached },
        { l: "Cards after same-story merge", n: s.scored - s.buckets.skip + (s.buckets.skip) },
        { l: "Hot + Warm", n: s.buckets.call + s.buckets.watch },
        { l: "Hot — worth a call", n: s.buckets.call },
      ]
    : [];
  const max = Math.max(1, ...steps.map((x) => x.n));
  return (
    <>
      <div className="row small muted" style={{ marginBottom: 14 }}><Link href="/runs" className="link">Runs</Link> <span>/</span> <span>{fmtDateTime(run.startedAt)}</span></div>
      <div className="page-head">
        <div>
          <div className="eyebrow">{run.trigger} run · {run.status}</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Run of {fmtDateTime(run.startedAt)}</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            Window {fmtDateTime(run.windowStart)} → {fmtDateTime(run.windowEnd)} · {run.tokensIn.toLocaleString()} tokens in, {run.tokensOut.toLocaleString()} out · ${run.costUsd.toFixed(4)}
          </p>
        </div>
        <Link className="btn" href="/">Open digest</Link>
      </div>
      {s && (
        <div className="grid-2">
          <div className="card pad-lg">
            <h2 className="h3" style={{ marginBottom: 14 }}>Funnel</h2>
            <div className="funnel">
              {steps.map((x) => (
                <div className="funnel-row" key={x.l}>
                  <span className="small ink2">{x.l}</span>
                  <div className="funnel-bar"><div style={{ width: `${(x.n / max) * 100}%` }} /></div>
                  <span className="num small" style={{ fontWeight: 700, textAlign: "right" }}>{x.n}</span>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 12 }}>
              Pre-filter saved {s.prefilteredOut} Gemini reads. {s.sameStoryMerged} duplicate stories merged. {s.cached} stories reused from earlier runs (cached, not paid twice).
              Evidence quotes verified: {s.verified}/{s.verified + s.unverified}. Every filtered story is still listed under Cold.
            </p>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <div className="card pad-lg">
              <h2 className="h3" style={{ marginBottom: 10 }}>Sources</h2>
              <table className="tbl">
                <thead><tr><th>Source</th><th>Status</th><th>Items</th><th>Queries</th><th>Time</th></tr></thead>
                <tbody>
                  {s.sources.map((x) => (
                    <tr key={x.source}>
                      <td><b>{x.source}</b>{x.error && <div className="tiny muted">{x.error}</div>}</td>
                      <td>{x.skipped ? <span className="chip">– skipped</span> : x.ok ? <span className="chip ok">✓ ok</span> : <span className="chip warn">✕ failed</span>}</td>
                      <td className="num">{x.items}</td>
                      <td className="num">{x.queries}</td>
                      <td className="num">{(x.ms / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card pad-lg">
              <h2 className="h3" style={{ marginBottom: 10 }}>Stage timings</h2>
              <div className="breakdown">
                {Object.entries(s.stageMs).map(([k, v]) => (
                  <div className="breakdown-row" key={k}><span>{k}</span><span className="p">{(v / 1000).toFixed(1)}s</span></div>
                ))}
              </div>
            </div>
            <div className="card pad-lg">
              <h2 className="h3" style={{ marginBottom: 10 }}>Errors & recoveries</h2>
              {run.errors.length ? (
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{run.errors.map((e, i) => <li key={i}><b>{e.stage}:</b> {e.message}</li>)}</ul>
              ) : <p className="small muted" style={{ margin: 0 }}>None — every stage completed.</p>}
              {run.emailError && <p className="small error">Email: {run.emailError}</p>}
              {run.emailedAt && <p className="small">Email sent to {run.emailedTo?.join(", ")} at {fmtDateTime(run.emailedAt)}.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
