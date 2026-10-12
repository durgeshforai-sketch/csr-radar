import Link from "next/link";
import type { Metadata } from "next";
import { KIND_LABEL, MAP_ACTORS, MAP_COLUMNS, MAP_LINKS, MAP_STEPS, type StepKind } from "@/lib/components-map";
import { MapConnectors } from "@/components/map-connectors";
import { SiteFooter } from "@/components/site-footer";
import { IRadar, IArrow, IExt } from "@/components/icons";

export const metadata: Metadata = {
  title: "Components map · CSR Radar",
  description: "How a CSR Radar run works: actors, inputs, AI steps, deterministic decisions and outputs, numbered in run order.",
};

// **bold** → <b>
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </>
  );
}

const KINDS: StepKind[] = ["ai", "code", "data", "person"];

export default function ComponentsMap() {
  let order = 0;
  return (
    <div className="cmap-page">
      <header className="cmap-top">
        <Link href="/" className="row" style={{ gap: 10 }}>
          <span className="brand-mark"><IRadar /></span>
          <span className="brand-name">CSR Radar</span>
        </Link>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn sm" href="https://github.com/durgeshforai-sketch/csr-radar/blob/main/docs/components-map-detailed.pdf" target="_blank" rel="noreferrer"><IExt />A3 PDF</a>
          <Link className="btn sm primary" href="/">Open the dashboard <IArrow /></Link>
        </div>
      </header>

      <section className="hero cmap-hero rise">
        <div className="blob" />
        <div>
          <div className="eyebrow" style={{ color: "var(--lime)" }}>Components map</div>
          <h1 className="hello" style={{ marginTop: 8 }}>How a CSR Radar run works, <span>step by step</span></h1>
          <p className="lead">Every morning at 07:30 IST: live sources → Gemini reads → code verifies and scores → Ananya decides. Numbered in the order a run happens. AI proposes, code decides, Ananya chooses.</p>
        </div>
        <div className="cmap-legend">
          {KINDS.map((k) => (
            <span key={k} className={`cmap-key k-${k}`}><i />{KIND_LABEL[k]}</span>
          ))}
        </div>
      </section>

      <div className="cmap-scroll">
        <div className="cmap-board">
          <div className="cmap-grid">
            <div className="cmap-corner" />
            {MAP_COLUMNS.map((c) => (
              <div key={c} className="cmap-col">{c}</div>
            ))}
            {MAP_ACTORS.map((a, ai) => (
              <div key={a.name} style={{ display: "contents" }}>
                <div className="cmap-actor">
                  <b>{a.name}</b>
                  <span>{a.role}</span>
                </div>
                {MAP_COLUMNS.map((_, ci) => {
                  const steps = MAP_STEPS.filter((s) => s.actor === ai && s.col === ci);
                  return (
                    <div key={ci} className={`cmap-cell${ai % 2 ? " alt" : ""}${steps.length >= 3 ? " many" : ""}`}>
                      {steps.map((s) => (
                        <div key={s.id} data-step={s.id} className={`cmap-step k-${s.kind} rise`} style={{ ["--i" as string]: order++ }}>
                          <em>{s.id}</em>
                          <Rich text={s.text} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <MapConnectors links={MAP_LINKS} />
        </div>
      </div>

      <section className="cmap-panels">
        <div className="cmap-panel dark rise" style={{ ["--i" as string]: 2 }}>
          <h3>The Cut — three things the radar never does</h3>
          <ol>
            <li><b>Never contacts a company for her.</b> It drafts; Ananya edits and sends every email herself.</li>
            <li><b>Never guesses.</b> Contacts need a source, quotes are checked against the source, numbers in drafts are checked by code.</li>
            <li><b>Never hides a story.</b> Off-sector and low-scoring stories stay listed as Cold, ranked, with the reason.</li>
          </ol>
        </div>
        <div className="cmap-panel rise" style={{ ["--i" as string]: 3 }}>
          <h3>AI proposes, code decides</h3>
          <p>Gemini searches, reads, finds contacts and writes. Everything that must be predictable is code: time windows, deduplication, the quote check, page verification for open calls, the 0–100 radar score from her 16 weights, the always-Hot rules and the invented-number guard. Changing a weight re-scores every story on the next run with no new AI call.</p>
        </div>
        <div className="cmap-panel rise" style={{ ["--i" as string]: 4 }}>
          <h3>Running cost (measured)</h3>
          <ul>
            <li>Daily run, all 5 sources: <b>≈ $0.21</b> of Gemini → <b>≈ $6 a month</b></li>
            <li>Reading only new stories: ≈ $0.01 per run (readings cached)</li>
            <li>Neon, Vercel, Resend, RSS feeds: free tiers → $0</li>
            <li>From OpenRouter&apos;s usage field on every call · google/gemini-3.7-flash</li>
          </ul>
        </div>
      </section>

      <p className="cmap-hint">On a small screen, scroll the map sideways.</p>
      <SiteFooter />
    </div>
  );
}
