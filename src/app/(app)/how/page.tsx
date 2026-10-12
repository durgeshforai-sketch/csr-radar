import Link from "next/link";
import Image from "next/image";
import map from "../../../../public/components-map.png";
import { connection } from "next/server";
import { latestRun } from "@/lib/data";
import { loadSettings } from "@/lib/settings-store";
import { Kpi } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { IExt, INews, IRuns, ICheck, IScale } from "@/components/icons";

const STEPS: [string, string, string][] = [
  ["1 · Collect", "Google News (~15 searches from your settings), Bing News, three CSR trade publications, open calls for NGO partners (RFPs/EOIs, page verified) and Gemini web search — in parallel; each can fail alone. News: 7 days; policy and open calls: 30 days.", "code"],
  ["2 · Clean", "7-day window, canonical URLs, duplicate removal; every story stored once so re-runs never pay twice.", "code"],
  ["3 · Pre-filter", "A free keyword check removes adverts and notices before any AI call. Filtered stories stay listed as Cold, with the reason.", "code"],
  ["4 · Read", "Gemini Flash turns 10 stories per call into structured facts: signal, company, sectors, places, ₹, deadline, partner search, audience fit — plus a verbatim quote.", "ai"],
  ["5 · Verify", "Code checks the quote really appears in the source. Unverified = penalty and no partner-search override.", "code"],
  ["6 · Score", "Deterministic radar score 0–100 from your weights → Hot · Warm · Cool · Cold · Policy. Every point is shown on the brief.", "code"],
  ["7 · Enrich", "For Hot stories: point of contact (named in the story, or web search with a source) and a B2B outreach draft.", "ai"],
  ["8 · Summarise", "Gemini writes “the week in one minute” from the ranked facts only.", "ai"],
  ["9 · Deliver", "Daily dashboard refresh at 07:30 IST; Monday email with a snapshot and only the companies that pass.", "code"],
];

export default async function How() {
  await connection();
  const [run, s] = await Promise.all([latestRun(), loadSettings()]);
  const st = run?.stats;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">For Ananya &amp; examiners</div>
          <h1 className="h1" style={{ marginTop: 6 }}>How CSR Radar works</h1>
          <p className="muted small" style={{ margin: "6px 0 0", maxWidth: 720 }}>
            Gemini Flash reads the news; deterministic code ranks it with weights you own; nothing is hidden; you decide. Every AI task uses Gemini Flash (google/gemini-3.7-flash via the OpenRouter gateway, served only by Google).
          </p>
        </div>
        <div className="row">
          <a className="btn" href="https://github.com/durgeshforai-sketch/csr-radar" target="_blank" rel="noreferrer"><IExt />GitHub repo</a>
          <a className="btn" href="https://github.com/durgeshforai-sketch/csr-radar/blob/main/docs/nine-checks.pdf" target="_blank" rel="noreferrer"><IExt />The Nine Checks</a>
          <a className="btn primary" href="https://github.com/durgeshforai-sketch/csr-radar/blob/main/docs/components-map-detailed.pdf" target="_blank" rel="noreferrer"><IExt />Detailed components map</a>
        </div>
      </div>

      {st && (
        <section className="kpis">
          <Kpi i={0} icon={<INews />} tint="tint-brand" v={<CountUp to={st.collected} />} l="Stories scanned in the latest run" />
          <Kpi i={1} icon={<IRuns />} tint="tint-hot" v={`${Math.round(((run!.finishedAt?.getTime() ?? 0) - run!.startedAt.getTime()) / 1000)}s`} l="End-to-end run time" />
          <Kpi i={2} icon={<ICheck />} tint="tint-policy" v={`${st.verified}/${st.verified + st.unverified}`} l="Evidence quotes verified (this run)" />
          <Kpi i={3} icon={<IScale />} tint="tint-warm" v={`$${run!.costUsd.toFixed(3)}`} l="Gemini cost of the latest run" />
        </section>
      )}

      <section className="section card pad-lg rise">
        <Image src={map} alt="Components map: actors × Trigger, Input, Context, Processing, AI, Output" sizes="(max-width: 1400px) 100vw, 1300px" style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }} priority />
      </section>

      <section className="section grid-2">
        <div className="card pad-lg">
          <h2 className="h2" style={{ marginBottom: 14 }}>The nine stages</h2>
          <div className="timeline">
            {STEPS.map(([t, d, kind]) => (
              <div className="tl" key={t}>
                <span className="tl-dot" style={kind === "ai" ? { background: "#fbd9e7", color: "#d6337a" } : undefined}>{kind === "ai" ? "AI" : "•"}</span>
                <div className="small"><b>{t}</b> <span className="muted">{kind === "ai" ? "· Gemini Flash" : "· code"}</span><div className="ink2" style={{ marginTop: 2 }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card pad-lg stack">
            <h2 className="h2">Why you can trust it</h2>
            <ul className="small ink2" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li><b>Open calls are verified.</b> An RFP or EOI found by search is kept only if its page loads and names the organisation, and only while its deadline is open.</li>
              <li><b>AI never decides.</b> It extracts facts with a quote; code scores; you choose.</li>
              <li><b>Quotes are checked</b> against the source text; AI-found headlines must match a real Google News article.</li>
              <li><b>Nothing is dropped.</b> Off-sector and filtered stories stay in Cold — you may know someone there.</li>
              <li><b>Contacts are never guessed.</b> Named in the story, or found by web search with a source link.</li>
              <li><b>Drafts can’t invent numbers.</b> Any figure not in the story or your profile is flagged in code.</li>
              <li><b>Sources fail alone.</b> A down or rate-limited source never blocks the digest; every stage is logged on <Link className="link" href="/runs">Runs</Link>.</li>
            </ul>
          </div>
          <div className="card pad-lg stack">
            <h2 className="h2">Evidence</h2>
            <ul className="small ink2" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li><b>29 unit tests</b> (scoring rules, override, penalties, geography, dedupe, window, parsers, guards) — run on every push by GitHub Actions.</li>
              <li><b>Extraction eval:</b> 36 real headlines labelled by hand → <b>89% accuracy, opportunity recall 6/7, precision 6/6</b> (v1 prompt: 78%, 2/7). <a className="link" href="https://github.com/durgeshforai-sketch/csr-radar/blob/main/eval/results.md" target="_blank" rel="noreferrer">Results</a></li>
              <li><b>Configurable:</b> {s.sectors.filter((x) => x.enabled).length} sectors, {s.geographies.length} geographic tiers, {Object.keys(s.weights).length} weights — edit in <Link className="link" href="/settings">Settings</Link>.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
