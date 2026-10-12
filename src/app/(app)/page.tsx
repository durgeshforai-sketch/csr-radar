import Link from "next/link";
import { connection } from "next/server";
import { dailyVolume, latestRun, runningRun, signalsForRun, type SignalRow } from "@/lib/data";
import { dueNextSteps, stagesByKeys, STAGE_LABEL } from "@/lib/crm";
import { loadSettings } from "@/lib/settings-store";
import { SIGNAL_LABEL } from "@/lib/extract";
import { OppCard, StoryRow } from "@/components/opp-card";
import { RunNow } from "@/components/run-now";
import { Bars, Kpi, TEMP, ago, fmtDate, inrCrore } from "@/components/ui";
import { IDownload, IScale, ISnow, IDrop, IFlame, ISun, IClock, IMail, IUser, INews, IRupee, IRuns } from "@/components/icons";
import { Donut, Heatmap, TrendChart } from "@/components/charts";
import { CountUp } from "@/components/count-up";

type SP = { sector?: string; region?: string; cold?: string };

// Greeting by Ananya's local time (IST)
function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

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
  const [crm, due, volume] = await Promise.all([stagesByKeys(keys), dueNextSteps(7), dailyVolume(14)]);

  const live = read.filter((r) => r.signal.bucket !== "skip");
  const committed = [...all.filter((r) => r.signal.bucket === "call" || r.signal.bucket === "watch")].reduce((a, r) => a + (r.article.extraction?.amountInrCrore ?? 0), 0);
  const partnerSearches = read.filter((r) => r.article.extraction?.partnerSearchExplicit || r.article.origin === "open_call").length;
  const COLD_LIMIT = 25;
  const showAllCold = sp.cold === "all";
  const stats = run.stats!;
  const ran = stats.sources.filter((s) => !s.skipped);
  const sourcesOk = ran.filter((s) => s.ok).length;

  const regionCounts = (["home", "priority", "national", "other", "unknown"] as const).map((t) => ({
    label: { home: "Pune & PCMC", priority: "Maharashtra", national: "Pan-India", other: "Other states", unknown: "Not stated" }[t],
    n: live.filter((r) => r.signal.breakdown.geoTier === t).length,
  }));
  const typeCounts = (["partner_search", "new_initiative", "increased_allocation", "policy_change", "other_csr"] as const).map((t) => ({
    label: SIGNAL_LABEL[t],
    n: live.filter((r) => r.article.extraction?.signalType === t).length,
  }));

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dow = (d: Date) => (new Date(d.getTime() + 5.5 * 3600_000).getUTCDay() + 6) % 7;
  const heatRows = settings.sectors.filter((x) => x.enabled).map((sec) => ({
    label: sec.label,
    cells: DOW.map((_, j) => live.filter((r) => r.article.extraction?.sectors.includes(sec.key) && dow(r.article.publishedAt) === j).length),
  }));
  const greet = greeting();
  const inSector = live.filter((r) => r.article.extraction?.sectors.length).length;
  const initiatives = read.filter((r) => r.article.extraction?.signalType === "new_initiative").length;
  const stripes = (n: number, of: number, cap = 22) => Array.from({ length: cap }, (_, k) => k < Math.round((n / Math.max(1, of)) * cap));

  const q = (k: keyof SP, v?: string) => {
    const p = new URLSearchParams(Object.entries({ ...sp, [k]: v }).filter(([, x]) => x) as [string, string][]);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <section className="hero rise">
        <div className="blob" />
        <div>
          <h1 className="hello">{greet}, <span>Ananya</span></h1>
          <p className="lead">{run.summary?.headline ?? "Your week, ranked."}</p>
          <div className="big">
            <b><CountUp to={stats.buckets.call} /></b>
            <span>worth a call this week<br /><span className="delta">{partnerSearches ? `+${partnerSearches} explicit partner search${partnerSearches > 1 ? "es" : ""}` : `${stats.buckets.watch} more warming up`}</span></span>
          </div>
          <div className="actions">
            <RunNow activeId={running?.id} variant="pill" />
            <a className="pill ghost" href="/api/digest-preview" target="_blank" rel="noreferrer"><IMail />Monday email</a>
            <a className="pill ghost" href={`/api/export?run=${run.id}`}><IDownload />CSV</a>
          </div>
          {!!run.summary?.bullets.length && (
            <ul className="hero-summary">{run.summary.bullets.slice(0, 3).map((x) => <li key={x}>{x}</li>)}</ul>
          )}
        </div>
        <div className="hero-mix">
          <div className="avg"><em>Bar to call · {settings.thresholds.call}</em></div>
          <div className="mix-col">
            <div className="v">{committed ? inrCrore(committed) : "—"}</div>
            <div className="k"><b>+{initiatives}</b>New initiatives · ₹ announced</div>
            <div className="mix-solid" />
          </div>
          <div className="mix-col">
            <div className="v"><CountUp to={inSector} /></div>
            <div className="k"><b>{stats.extracted + stats.cached}</b>read · in her sectors</div>
            <div className="mix-stripes">{stripes(inSector, stats.extracted + stats.cached).map((on, k) => <i key={k} className={on ? "" : "off"} style={{ background: on ? undefined : "#2a2140", animationDelay: `${0.3 + k * 0.03}s` }} />)}</div>
          </div>
          <div className="mix-col">
            <div className="v"><CountUp to={stats.buckets.skip} /></div>
            <div className="k"><b>Cold</b>still listed for you</div>
            <div className="mix-stripes dim">{Array.from({ length: 12 }, (_, k) => <i key={k} style={{ animationDelay: `${0.5 + k * 0.04}s` }} />)}</div>
          </div>
        </div>
        <div className="hero-foot">
          <span>{fmtDate(run.windowStart, { day: "numeric", month: "short" })}</span>
          <span>Updated {ago(run.finishedAt)} · {stats.collected} stories scanned from {sourcesOk}/{ran.length} live sources</span>
          <span>{fmtDate(run.windowEnd, { day: "numeric", month: "short" })}</span>
        </div>
      </section>

      <section className="section kpis">
        <Kpi i={1} icon={<IFlame />} tint="tint-hot" v={<CountUp to={stats.buckets.call} />} l="Worth a call this week" />
        <Kpi i={2} icon={<ISun />} tint="tint-warm" v={<CountUp to={stats.buckets.watch} />} l="Warm — watch closely" />
        <Kpi i={3} icon={<INews />} tint="tint-brand" v={<CountUp to={stats.extracted + stats.cached} />} l="Stories read by Gemini" />
        <Kpi i={4} icon={<IUser />} tint="tint-policy" v={<CountUp to={read.filter((r) => r.article.poc?.name).length} />} l="Named contacts found" />
      </section>

      <section className="section grid-3">
        <div className="card pad-lg rise" style={{ ["--i" as string]: 2 }}>
          <div className="card-head">
            <h2 className="h3 row" style={{ gap: 10 }}><span className="ico tint-hot"><IRuns /></span>Signals over 14 days</h2>
            <div className="legend"><span><i style={{ background: "var(--hot)" }} />Relevant</span><span><i style={{ background: "var(--brand)", opacity: 0.6 }} />Scanned</span></div>
          </div>
          <TrendChart days={volume} />
        </div>
        <div className="card pad-lg rise" style={{ ["--i" as string]: 3 }}>
          <div className="card-head">
            <h2 className="h3 row" style={{ gap: 10 }}><span className="ico tint-brand"><IClock /></span>Activity by day & sector</h2>
            <span className="tiny muted">this week</span>
          </div>
          <Heatmap rows={heatRows} cols={DOW} />
        </div>
        <div className="card pad-lg rise" style={{ ["--i" as string]: 4 }}>
          <div className="card-head">
            <h2 className="h3 row" style={{ gap: 10 }}><span className="ico tint-cool"><IRupee /></span>By temperature</h2>
          </div>
          <Donut total={stats.scored} label="stories" parts={(["call", "watch", "fyi", "policy", "skip"] as const).map((b) => ({ b, n: stats.buckets[b] }))} />
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
          <h2 className="h2"><span className="ico tint-hot"><IFlame /></span>Worth a call this week</h2>
          <span className="muted small">Score ≥ {settings.thresholds.call}, open calls for NGOs and explicit partner searches · {hot.length} {hot.length === 1 ? "company" : "companies"}</span>
        </div>
        {hot.length ? (
          <div className="opps">{hot.map((r, i) => <OppCard key={r.signal.id} row={r} i={i} company={crm.get(r.article.companyKey ?? "")} />)}</div>
        ) : (
          <div className="empty">Nothing cleared the bar{sp.sector || sp.region ? " for this filter" : " this week"}. Check Warm and Cold below — you may know someone.</div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2"><span className="ico tint-warm"><ISun /></span>Warm — watch closely</h2>
          <span className="muted small">Score {settings.thresholds.watch}–{settings.thresholds.call - 1} · {warm.length}</span>
        </div>
        {warm.length ? (
          <div className="opps">{warm.map((r, i) => <OppCard key={r.signal.id} row={r} i={i} company={crm.get(r.article.companyKey ?? "")} />)}</div>
        ) : (
          <div className="empty">No warm signals{sp.sector || sp.region ? " for this filter" : ""}.</div>
        )}
      </section>

      <section className="section grid-2">
        <div className="card pad-lg">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <h2 className="h2"><span className="ico tint-policy"><IScale /></span>Policy watch</h2>
            <span className="muted small">This month · MCA · SEBI · Companies Act</span>
          </div>
          {policy.length ? (
            <div className="list" style={{ margin: "0 -18px" }}>{policy.map((r) => <StoryRow key={r.signal.id} row={r} />)}</div>
          ) : (
            <p className="muted small">No changes to CSR rules found in the last 30 days. We searched for Schedule VII, CSR rules, MCA notifications, unspent-fund and Companies Act amendments.</p>
          )}
        </div>
        <div className="card pad-lg stack" style={{ gap: 18 }}>
          <h2 className="h2">Where the signals are</h2>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>By region</div><Bars items={regionCounts} /></div>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>By signal</div><Bars items={typeCounts} /></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2"><span className="ico tint-cool"><IDrop /></span>Cool — for information</h2>
          <span className="muted small">In her sectors, below {settings.thresholds.watch} · {cool.length}</span>
        </div>
        {cool.length ? <div className="card list">{cool.map((r) => <StoryRow key={r.signal.id} row={r} />)}</div> : <div className="empty">None.</div>}
      </section>

      <section className="section">
        <details className="cold card" id="cold" open={showAllCold || undefined}>
          <summary className="pad row between">
            <span className="row" style={{ gap: 10 }}>
              <span className="chev">▸</span>
              <span className="h2 row" style={{ gap: 10 }}><span className="ico tint-cold"><ISnow /></span>Cold — below the bar</span>
            </span>
            <span className="muted small">{cold.length} stories, ranked · nothing is hidden: you may know someone there</span>
          </summary>
          <div className="list" style={{ borderTop: "1px solid var(--line)" }}>
            {(showAllCold ? cold : cold.slice(0, COLD_LIMIT)).map((r) => <StoryRow key={r.signal.id} row={r} reason />)}
          </div>
          {cold.length > COLD_LIMIT && (
            <div className="pad" style={{ borderTop: "1px solid var(--line)", textAlign: "center" }}>
              {showAllCold ? (
                <Link className="btn sm" href={q("cold")}>Show top {COLD_LIMIT} only</Link>
              ) : (
                <Link className="btn sm" href={`${q("cold", "all")}#cold`}>Show all {cold.length} Cold stories</Link>
              )}
            </div>
          )}
        </details>
      </section>

      <p className="muted tiny" style={{ marginTop: 28 }}>
        {TEMP.call.label} / {TEMP.watch.label} / {TEMP.fyi.label} / {TEMP.skip.label} are advice from the radar score; every point is explained on each brief and every weight is yours to change in Settings.
      </p>
    </>
  );
}
