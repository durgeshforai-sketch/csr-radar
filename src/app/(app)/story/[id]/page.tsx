import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getStory } from "@/lib/data";
import { getCompany, STAGES, STAGE_LABEL } from "@/lib/crm";
import { SIGNAL_LABEL } from "@/lib/extract";
import { journeyStage } from "@/lib/outreach";
import { addActivity, enrichStory, setStage } from "@/app/actions/crm";
import { Score, SignalChip, TempBadge, fmtDate, initials, inrCrore } from "@/components/ui";
import { CopyButton, SubmitButton } from "@/components/copy-button";
import { IAlert, ICheck, IExt, ILinkedin, IMail, ISearch } from "@/components/icons";

const JOURNEY = [
  { k: "awareness", t: "Awareness", d: "Budget or intent signalled" },
  { k: "consideration", t: "Consideration", d: "Programme forming, partners open" },
  { k: "decision", t: "Decision", d: "Choosing implementers now" },
  { k: "post_purchase", t: "Post-purchase", d: "Delivered — next cycle" },
];

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const data = await getStory(id);
  if (!data) notFound();
  const { article: a, signal: s, related } = data;
  const e = a.extraction;
  const crm = a.companyKey ? await getCompany(a.companyKey) : null;
  const p = a.pitch;
  const poc = a.poc;
  const j = e ? journeyStage(e) : null;
  const mailto = p ? `mailto:?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.email.replace("{{sender_name}}", "Ananya"))}` : null;

  return (
    <>
      <div className="row small muted" style={{ marginBottom: 14 }}>
        <Link href="/" className="link">This week</Link> <span>/</span> <span>{e?.company ?? "Story"}</span>
      </div>

      <div className="grid-main">
        {/* ---------- Left: the story ---------- */}
        <div className="stack" style={{ gap: 20 }}>
          <div className="card pad-lg stack" style={{ gap: 14 }}>
            <div className="row between">
              <div className="row" style={{ gap: 6 }}>
                {s && <TempBadge b={s.bucket} withHint />}
                {e && <SignalChip t={e.signalType} />}
                {e?.partnerSearchExplicit && <span className="chip ok">Partner search stated</span>}
              </div>
              {s && <Score v={s.score} b={s.bucket} />}
            </div>
            <div>
              <div className="eyebrow">{e?.company ?? "Company not named"}</div>
              <h1 className="h1" style={{ marginTop: 6 }}>{a.title}</h1>
            </div>
            {e ? (
              <>
                <p className="ink2" style={{ margin: 0, fontSize: 16 }}>{e.summary}</p>
                <div className="opp-why"><b>Why it matters to you:</b> {e.whyItMatters}</div>
                <figure style={{ margin: 0 }}>
                  <blockquote className="quote">“{e.evidence}”</blockquote>
                  <figcaption className="row small" style={{ marginTop: 8, gap: 8 }}>
                    {a.evidenceVerified ? (
                      <span className="chip ok"><ICheck /> Quote found in the source text</span>
                    ) : (
                      <span className="chip warn"><IAlert /> Quote not found in source — treat with care</span>
                    )}
                    <span className="muted">Read by {a.extractionModel} · confidence {e.confidence}</span>
                  </figcaption>
                </figure>
              </>
            ) : (
              <div className="alert">{s?.breakdown.rule ?? "Not read yet."}</div>
            )}
            <div className="row">
              <a className="btn primary" href={a.url} target="_blank" rel="noreferrer"><IExt />Read on {a.outlet ?? "source"}</a>
              <span className="muted small">Published {fmtDate(a.publishedAt, { day: "numeric", month: "short", year: "numeric" })} · found via {a.origin.replace("_", " ")}</span>
            </div>
            {!!s?.alsoCoveredBy.length && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Also covered by</div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                  {s.alsoCoveredBy.map((c) => (
                    <li key={c.url}><a className="link" href={c.url} target="_blank" rel="noreferrer">{c.outlet ?? "Source"}</a> — {c.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {e && (
            <div className="grid-2">
              <div className="card pad-lg">
                <h2 className="h3" style={{ marginBottom: 10 }}>What the reader extracted</h2>
                <dl className="facts">
                  <dt>Company</dt><dd>{e.company ?? "—"} <span className="muted">({e.companyType.replace("_", " ")})</span></dd>
                  <dt>Signal</dt><dd>{SIGNAL_LABEL[e.signalType]}</dd>
                  <dt>Sectors</dt><dd>{e.sectors.length ? e.sectors.map((x) => x.replace("_", " ")).join(", ") : "None of hers"}</dd>
                  <dt>Where</dt><dd>{e.places.join(", ") || (e.panIndia ? "Pan-India" : "Not stated")}</dd>
                  <dt>Amount</dt><dd>{e.amountInrCrore != null ? `${inrCrore(e.amountInrCrore)} (“${e.amountText}”)` : "Not stated"}</dd>
                  <dt>Deadline</dt><dd>{e.deadline ? fmtDate(e.deadline, { day: "numeric", month: "short", year: "numeric" }) : "None stated"}</dd>
                  <dt>Stage</dt><dd>{e.stage}</dd>
                  <dt>Her audience</dt><dd>{e.audienceMatch ? "Yes — youth / first-gen / dropouts" : "Not clearly"}</dd>
                </dl>
              </div>
              <div className="card pad-lg">
                <h2 className="h3" style={{ marginBottom: 10 }}>Why it scored {s?.score ?? 0}</h2>
                <div className="breakdown">
                  {s?.breakdown.lines.map((l) => (
                    <div className="breakdown-row" key={l.label}>
                      <span>{l.label}</span>
                      <span className={`p ${l.points < 0 ? "neg" : ""}`}>{l.points > 0 ? "+" : ""}{l.points}</span>
                    </div>
                  ))}
                </div>
                <p className="small" style={{ marginTop: 12, fontWeight: 600 }}>{s?.breakdown.rule}</p>
                <p className="tiny muted">Weights are yours to change in <Link className="link" href="/settings">Settings</Link>. The score advises; you decide.</p>
              </div>
            </div>
          )}

          {/* ---------- Outreach draft (B2B method) ---------- */}
          {e && (
            <div className="card pad-lg stack" style={{ gap: 18 }}>
              <div className="row between">
                <div>
                  <div className="eyebrow">Outreach draft</div>
                  <h2 className="h2" style={{ marginTop: 4 }}>{p ? p.subject : "Draft a first email"}</h2>
                </div>
                <form action={enrichStory}>
                  <input type="hidden" name="articleId" value={a.id} />
                  <SubmitButton className={p ? "btn sm" : "btn primary"} pendingText="Researching & drafting…">{p ? "Redraft" : "Find contact & draft email"}</SubmitButton>
                </form>
              </div>

              {j && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Buyer journey — where {e.company ?? "they"} likely are</div>
                  <div className="journey">
                    {JOURNEY.map((x) => (
                      <div key={x.k} className={`journey-step ${x.k === j.stage ? "on" : ""}`}><b>{x.t}</b>{x.d}</div>
                    ))}
                  </div>
                  <p className="small" style={{ margin: "8px 0 0" }}><b>Timing:</b> {j.urgency}</p>
                </div>
              )}

              {p ? (
                <>
                  <div className="grid-2">
                    <div className="alert">
                      <div className="eyebrow" style={{ marginBottom: 6 }}>Job to be done (hypothesis)</div>
                      <p style={{ margin: "0 0 6px" }}>{p.job}</p>
                      <p className="small ink2" style={{ margin: "0 0 4px" }}><b>Possible problem:</b> {p.problem}</p>
                      <p className="small ink2" style={{ margin: 0 }}><b>Desired outcome:</b> {p.desiredOutcome}</p>
                    </div>
                    <div className="alert">
                      <div className="eyebrow" style={{ marginBottom: 6 }}>The buyer</div>
                      <div className="small"><b>Facts</b></div>
                      <ul className="small assume" style={{ margin: "2px 0 8px", paddingLeft: 18 }}>{p.buyerFacts.map((x) => <li key={x}>{x}</li>)}</ul>
                      <div className="small"><b>Assumptions</b></div>
                      <ul className="small assume muted" style={{ margin: "2px 0 0", paddingLeft: 18 }}>{p.buyerAssumptions.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                  </div>
                  <div className="small"><b>Trigger:</b> {p.trigger} <br /><b>Angle:</b> {p.angle}</div>
                  <div className="hpvc">
                    <div><b>Hook</b>{p.hook}</div>
                    <div><b>Pain</b>{p.pain}</div>
                    <div><b>Value</b>{p.value}</div>
                    <div><b>CTA</b>{p.cta}</div>
                  </div>
                  <div>
                    <div className="row between" style={{ marginBottom: 8 }}>
                      <span className="eyebrow">Email{poc?.name ? ` to ${poc.name}` : ""}</span>
                      <div className="row" style={{ gap: 6 }}>
                        <CopyButton text={`Subject: ${p.subject}\n\n${p.email}`} label="Copy email" />
                        {mailto && <a className="btn sm" href={mailto}><IMail />Open in mail</a>}
                      </div>
                    </div>
                    <div className="email">{p.email}</div>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    <div className="eyebrow">Evidence check</div>
                    {p.inventedNumbers.length ? (
                      <div className="alert warn"><b>Check before sending:</b> these numbers are not in the story or your profile: {p.inventedNumbers.join(", ")}. Remove or verify them.</div>
                    ) : (
                      <div className="alert ok"><ICheck /> Every number in the email comes from the story or your NGO profile.</div>
                    )}
                    {!!p.selfCheck.unsupportedClaims.length && <div className="alert warn"><b>Unsupported claims flagged:</b> {p.selfCheck.unsupportedClaims.join("; ")}</div>}
                    <div className="small muted">Generic-hook risk: <b>{p.selfCheck.genericHookRisk}</b>{p.selfCheck.cautionNote ? ` · ${p.selfCheck.cautionNote}` : ""}</div>
                  </div>
                  <details>
                    <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>Follow-up for 5 days later (new angle)</summary>
                    <div className="email" style={{ marginTop: 8 }}>{p.followUp}</div>
                  </details>
                </>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>The radar drafts automatically for Hot stories. For any other story — even a Cold one where you know someone — click “Find contact & draft email”.</p>
              )}
            </div>
          )}
        </div>

        {/* ---------- Right: contact + CRM ---------- */}
        <div className="stack" style={{ gap: 16, position: "sticky", top: 20 }}>
          <div className="card pad-lg stack" style={{ gap: 12 }}>
            <div className="eyebrow">Point of contact</div>
            {poc?.name ? (
              <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{initials(poc.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="h3">{poc.name}</div>
                  <div className="small ink2">{poc.role}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{poc.note}</div>
                </div>
              </div>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>{poc ? poc.note : "Not looked up yet — use “Find contact & draft email”."}</p>
            )}
            {e?.company && (
              <div className="stack" style={{ gap: 6 }}>
                {poc?.sourceUrl && <a className="btn sm" href={poc.sourceUrl} target="_blank" rel="noreferrer"><IExt />Where we found this</a>}
                <a className="btn sm" href={poc?.linkedinSearch ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${e.company} CSR`)}`} target="_blank" rel="noreferrer"><ILinkedin />LinkedIn: {e.company} CSR</a>
                <a className="btn sm" href={poc?.csrPageSearch ?? `https://www.google.com/search?q=${encodeURIComponent(`${e.company} CSR policy committee`)}`} target="_blank" rel="noreferrer"><ISearch />CSR policy & committee</a>
              </div>
            )}
            <p className="tiny muted" style={{ margin: 0 }}>We never guess emails or phone numbers. Add verified details on the company profile.</p>
          </div>

          {a.companyKey && e?.company && (
            <div className="card pad-lg stack" style={{ gap: 12 }}>
              <div className="row between">
                <span className="eyebrow">Deal · {e.company}</span>
                <Link className="link small" href={`/companies/${encodeURIComponent(a.companyKey)}`}>Profile →</Link>
              </div>
              <form action={setStage} className="row" style={{ gap: 6 }}>
                <input type="hidden" name="key" value={a.companyKey} />
                <input type="hidden" name="name" value={e.company} />
                <input type="hidden" name="articleId" value={a.id} />
                <select name="stage" defaultValue={crm?.company.stage ?? "radar"} style={{ flex: 1 }}>
                  {STAGES.map((st) => <option key={st} value={st}>{STAGE_LABEL[st]}</option>)}
                </select>
                <SubmitButton className="btn sm" pendingText="…">Save</SubmitButton>
              </form>
              {crm?.company.warmIntro && <div className="alert ok small"><b>Warm intro:</b> {crm.company.warmIntro}</div>}
              {crm?.company.nextStep && <div className="small"><b>Next:</b> {crm.company.nextStep} {crm.company.nextStepDue && <span className="muted">· {fmtDate(crm.company.nextStepDue)}</span>}</div>}
              <form action={addActivity} className="stack" style={{ gap: 6 }}>
                <input type="hidden" name="key" value={a.companyKey} />
                <input type="hidden" name="name" value={e.company} />
                <input type="hidden" name="articleId" value={a.id} />
                <div className="row" style={{ gap: 6 }}>
                  <select name="kind" defaultValue="note" style={{ width: 110 }}>
                    <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="intro">Intro</option>
                  </select>
                  <input name="body" placeholder="Log what happened…" required />
                </div>
                <SubmitButton className="btn sm" pendingText="Saving…">Log activity</SubmitButton>
              </form>
              {!!crm?.activities.length && (
                <div className="timeline">
                  {crm.activities.slice(0, 4).map((x) => (
                    <div className="tl" key={x.id}>
                      <span className="tl-dot">{x.kind === "stage" ? "↗" : x.kind === "call" ? "☎" : x.kind === "email" ? "✉" : x.kind === "meeting" ? "◎" : "•"}</span>
                      <div className="small"><div>{x.body}</div><div className="tiny muted">{fmtDate(x.at)}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!!related.length && (
            <div className="card pad-lg">
              <div className="eyebrow" style={{ marginBottom: 8 }}>More from {e?.company}</div>
              <div className="stack" style={{ gap: 8 }}>
                {related.map((r) => (
                  <Link key={r.id} href={`/story/${r.id}`} className="small"><span className="link">{r.title}</span> <span className="muted">· {fmtDate(r.publishedAt)}</span></Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
