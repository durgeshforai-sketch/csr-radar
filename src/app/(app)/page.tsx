import Link from "next/link";
import { connection } from "next/server";
import { latestRun, runningRun, signalsForRun, type SignalRow } from "@/lib/data";
import { dueNextSteps, stagesByKeys, STAGE_LABEL } from "@/lib/crm";
import { loadSettings } from "@/lib/settings-store";
import { SIGNAL_LABEL } from "@/lib/extract";
import { OppCard, StoryRow } from "@/components/opp-card";
import { RunNow } from "@/components/run-now";
import { Bars, Kpi, TEMP, ago, fmtDate, inrCrore } from "@/components/ui";
import { IDownload, IScale, ISnow, IDrop, IFlame, ISun, IClock } from "@/components/icons";

type SP = { sector?: string; region?: string };

export default async function ThisWeek({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const [run, running, settings] = await Promise.all([latestRun(), runningRun(), loadSettings()]);

  if (!run) {
    return (
      <div className="stack" style={{ maxWidth: 560, margin: "80px auto", textAlign: "center" }}>
        <h1 className="h1">No digest yet</h1>
        <p className="muted">Run the radar once to read the past week of CSR news.</p>
        <div className="row" style={{ justifyContent: "center" }}><RunNow activeId={running?.id} /></div>
      </div>
    );
  }

  const all = await signalsForRun(run.id);
  const read = all.filter((r) => r.article.extraction);
  const filtered = (rows: SignalRow[]) =>
    rows.filter((r) => {
      const e = r.article.extraction;
      if (sp.sector && !e?.sectors.includes(sp.sector)) return false;
      if (sp.region && r.signal.breakdown.geoTier !== sp.region) return false;
      return true;
    });
  const by = (b: string) => filtered(all.filter((r) => r.signal.bucket === b));
  const hot = by("call");
  const warm = by("watch");
  const cool = by("fyi");
  const policy = all.filter((r) => r.signal.bucket === "policy");
  const cold = by("skip");

  const keys = [...new Set([...hot, ...warm].map((r) => r.article.companyKey).filter(Boolean))] as string[];
  const [crm, due] = await Promise.all([stagesByKeys(keys), dueNextSteps(7)]);

  const live = read.filter((r) => r.signal.bucket !== "skip");
  const committed = [...all.filter((r) => r.signal.bucket === "call" || r.signal.bucket === "watch")].reduce((a, r) => a + (r.article.extraction?.amountInrCrore ?? 0), 0);
  const partnerSearches = read.filter((r) => r.article.extraction?.partnerSearchExplicit).length;
  const stats = run.stats!;
  const sourcesOk = stats.sources.filter((s) => s.ok).length;

  const sectorCounts = settings.sectors.map((s) => ({ label: s.label, n: live.filter((r) => r.article.extraction?.sectors.includes(s.key)).length }));
  const regionCounts = (["home", "priority", "national", "other", "unknown"] as const).map((t) => ({
    label: { home: "Pune & PCMC", priority: "Maharashtra", national: "Pan-India", other: "Other states", unknown: "Not stated" }[t],
    n: live.filter((r) => r.signal.breakdown.geoTier === t).length,
  }));
  const typeCounts = (["partner_search", "new_initiative", "increased_allocation", "policy_change", "other_csr"] as const).map((t) => ({
    label: SIGNAL_LABEL[t],
    n: live.filter((r) => r.article.extraction?.signalType === t).length,
  }));

  const q = (k: keyof SP, v?: string) => {
    const p = new URLSearchParams(Object.entries({ ...sp, [k]: v }).filter(([, x]) => x) as [string, string][]);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Week of {fmtDate(run.windowStart)} – {fmtDate(run.windowEnd, { day: "numeric", month: "short", year: "numeric" })}</div>
          <h1 className="h1" style={{ marginTop: 6 }}>This week&apos;s CSR radar</h1>
        </div>
        <div className="row">
          <span className="muted small">Updated {ago(run.finishedAt)} · {stats.collected} stories scanned</span>
          <a className="btn" href={`/api/export?run=${run.id}`}><IDownload />CSV</a>
          <RunNow activeId={running?.id} />
        </div>
      </div>

      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow" style={{ color: "var(--brand)" }}>The week in one minute</div>
          <p className="h-display">{run.summary?.headline ?? "Your week, ranked."}</p>
          {!!run.summary?.bullets.length && (
            <ul>
              {run.summary.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="hero-right">
          <Kpi v={stats.buckets.call} l="Worth a call this week" cls="hot" />
          <Kpi v={stats.buckets.watch} l="Warm — watch closely" />
          <Kpi v={partnerSearches} l="Explicit partner searches" />
          <Kpi v={committed ? inrCrore(committed) : "—"} l="CSR money announced (hot + warm)" />
          <Kpi v={stats.extracted + stats.cached} l="Stories read by Gemini" />
          <Kpi v={`${sourcesOk}/${stats.sources.length}`} l="Live sources answered" />
        </div>
      </section>

      {due.length > 0 && (
        <section className="section">
          <div className="card pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="h3 row" style={{ gap: 8 }}><IClock /> Your next steps due this week</span>
              <Link href="/pipeline" className="link small">Open pipeline</Link>
            </div>
            <div className="list">
              {due.map((c) => (
                <Link key={c.key} href={`/companies/${encodeURIComponent(c.key)}`} className="list-row">
                  <span className="chip">{STAGE_LABEL[c.stage]}</span>
                  <span><b>{c.name}</b> · {c.nextStep}</span>
                  <span className={`small ${c.nextStepDue && c.nextStepDue < new Date() ? "error" : "muted"}`}>{fmtDate(c.nextStepDue)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="stack" style={{ gap: 10 }}>
          <div className="filters">
            <span className="lbl">Sector</span>
            <Link href={q("sector")} aria-current={!sp.sector}>All</Link>
            {settings.sectors.filter((s) => s.enabled).map((s) => (
              <Link key={s.key} href={q("sector", s.key)} aria-current={sp.sector === s.key}>{s.label}</Link>
            ))}
          </div>
          <div className="filters">
            <span className="lbl">Region</span>
            <Link href={q("region")} aria-current={!sp.region}>All</Link>
            {[["home", "Pune & PCMC"], ["priority", "Maharashtra"], ["national", "Pan-India"], ["other", "Other states"]].map(([k, l]) => (
              <Link key={k} href={q("region", k)} aria-current={sp.region === k}>{l}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2"><span style={{ color: "var(--hot)", display: "inline-flex", width: 22 }}><IFlame /></span>Worth a call this week</h2>
          <span className="muted small">Score ≥ {settings.thresholds.call}, or an explicit partner search · {hot.length} {hot.length === 1 ? "company" : "companies"}</span>
        </div>
        {hot.length ? (
          <div className="opps">{hot.map((r) => <OppCard key={r.signal.id} row={r} company={crm.get(r.article.companyKey ?? "")} />)}</div>
        ) : (
          <div className="empty">Nothing cleared the bar{sp.sector || sp.region ? " for this filter" : " this week"}. Check Warm and Cold below — you may know someone.</div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2"><span style={{ color: "var(--warm)", display: "inline-flex", width: 22 }}><ISun /></span>Warm — watch closely</h2>
          <span className="muted small">Score {settings.thresholds.watch}–{settings.thresholds.call - 1} · {warm.length}</span>
        </div>
        {warm.length ? (
          <div className="opps">{warm.map((r) => <OppCard key={r.signal.id} row={r} company={crm.get(r.article.companyKey ?? "")} />)}</div>
        ) : (
          <div className="empty">No warm signals{sp.sector || sp.region ? " for this filter" : ""}.</div>
        )}
      </section>

      <section className="section grid-2">
        <div className="card pad-lg">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <h2 className="h2"><span style={{ color: "var(--policy)", display: "inline-flex", width: 22 }}><IScale /></span>Policy watch</h2>
            <span className="muted small">MCA · SEBI · Companies Act</span>
          </div>
          {policy.length ? (
            <div className="list" style={{ margin: "0 -18px" }}>{policy.map((r) => <StoryRow key={r.signal.id} row={r} />)}</div>
          ) : (
            <p className="muted small">No changes to CSR rules found this week. We searched for Schedule VII, CSR rules, unspent-fund and Companies Act amendments.</p>
          )}
        </div>
        <div className="card pad-lg stack" style={{ gap: 18 }}>
          <h2 className="h2">This week at a glance</h2>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>By sector</div><Bars items={sectorCounts} /></div>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>By region</div><Bars items={regionCounts} /></div>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>By signal</div><Bars items={typeCounts} /></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2"><span style={{ color: "var(--cool)", display: "inline-flex", width: 22 }}><IDrop /></span>Cool — for information</h2>
          <span className="muted small">In her sectors, below {settings.thresholds.watch} · {cool.length}</span>
        </div>
        {cool.length ? <div className="card list">{cool.map((r) => <StoryRow key={r.signal.id} row={r} />)}</div> : <div className="empty">None.</div>}
      </section>

      <section className="section">
        <details className="cold card">
          <summary className="pad row between">
            <span className="row" style={{ gap: 10 }}>
              <span className="chev">▸</span>
              <span className="h2 row" style={{ gap: 10 }}><span style={{ color: "var(--cold)", display: "inline-flex", width: 22 }}><ISnow /></span>Cold — below the bar</span>
            </span>
            <span className="muted small">{cold.length} stories, ranked · nothing is hidden: you may know someone there</span>
          </summary>
          <div className="list" style={{ borderTop: "1px solid var(--line)" }}>
            {cold.map((r) => <StoryRow key={r.signal.id} row={r} reason />)}
          </div>
        </details>
      </section>

      <p className="muted tiny" style={{ marginTop: 28 }}>
        {TEMP.call.label} / {TEMP.watch.label} / {TEMP.fyi.label} / {TEMP.skip.label} are advice from the radar score; every point is explained on each brief and every weight is yours to change in Settings.
      </p>
    </>
  );
}
