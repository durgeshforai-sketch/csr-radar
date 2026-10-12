import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCompany, STAGES, STAGE_LABEL } from "@/lib/crm";
import { SIGNAL_LABEL } from "@/lib/extract";
import { addActivity, addContact, deleteContact, saveDeal, setStage } from "@/app/actions/crm";
import { TempBadge, fmtDate, initials } from "@/components/ui";
import { SubmitButton } from "@/components/copy-button";
import { IExt, ILinkedin, ISearch } from "@/components/icons";
import { csrPageSearch, linkedinSearch } from "@/lib/extract";
import type { Bucket } from "@/lib/score";

export default async function CompanyPage({ params }: { params: Promise<{ key: string }> }) {
  await connection();
  const key = decodeURIComponent((await params).key);
  const data = await getCompany(key);
  if (!data) notFound();
  const { company: c, contacts, activities, stories } = data;
  const relevant = stories.filter((s) => s.extraction && s.extraction.signalType !== "not_relevant");
  const amounts = relevant.reduce((a, s) => a + (s.extraction?.amountInrCrore ?? 0), 0);
  const dueStr = c.nextStepDue ? new Date(c.nextStepDue.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10) : "";

  return (
    <>
      <div className="row small muted" style={{ marginBottom: 14 }}>
        <Link href="/companies" className="link">Companies</Link> <span>/</span> <span>{c.name}</span>
      </div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Company profile</div>
          <h1 className="h1" style={{ marginTop: 6 }}>{c.name}</h1>
          <div className="row small muted" style={{ marginTop: 8 }}>
            <span>{relevant.length} CSR {relevant.length === 1 ? "signal" : "signals"} on record</span>
            {amounts > 0 && <span>· ₹{+amounts.toFixed(1)} Cr announced</span>}
            {c.website && <a className="link" href={c.website} target="_blank" rel="noreferrer">· Website</a>}
          </div>
        </div>
        <form action={setStage} className="row" style={{ gap: 6 }}>
          <input type="hidden" name="key" value={c.key} />
          <select name="stage" defaultValue={c.stage} style={{ width: 170 }}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
          <SubmitButton className="btn primary" pendingText="…">Update stage</SubmitButton>
        </form>
      </div>

      <div className="grid-main">
        <div className="stack" style={{ gap: 20 }}>
          <div className="card pad-lg">
            <h2 className="h3" style={{ marginBottom: 12 }}>CSR signals over time</h2>
            {stories.length ? (
              <div className="timeline">
                {stories.map((s) => (
                  <div className="tl" key={s.id}>
                    <span className="tl-dot">●</span>
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        {s.bucket && <TempBadge b={s.bucket as Bucket} />}
                        {s.extraction && <span className="chip">{SIGNAL_LABEL[s.extraction.signalType]}</span>}
                        <span className="tiny muted">{fmtDate(s.publishedAt, { day: "numeric", month: "short", year: "numeric" })} · score {s.score}</span>
                      </div>
                      <Link href={`/story/${s.id}`} className="link" style={{ display: "block", marginTop: 6, fontWeight: 600 }}>{s.title}</Link>
                      {s.extraction && <p className="small ink2" style={{ margin: "4px 0 0" }}>{s.extraction.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">No stories yet — the radar will add them as they appear.</p>}
          </div>

          <div className="card pad-lg">
            <h2 className="h3" style={{ marginBottom: 12 }}>Activity</h2>
            <form action={addActivity} className="row" style={{ gap: 6, marginBottom: 14 }}>
              <input type="hidden" name="key" value={c.key} />
              <select name="kind" defaultValue="note" style={{ width: 120 }}>
                <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="intro">Intro</option>
              </select>
              <input name="body" placeholder="e.g. Spoke to Priya at the foundation — RFP opens in November" required style={{ flex: 1, minWidth: 220 }} />
              <SubmitButton className="btn" pendingText="Saving…">Log</SubmitButton>
            </form>
            {activities.length ? (
              <div className="timeline">
                {activities.map((a) => (
                  <div className="tl" key={a.id}>
                    <span className="tl-dot">{a.kind === "stage" ? "↗" : a.kind === "call" ? "☎" : a.kind === "email" ? "✉" : a.kind === "meeting" ? "◎" : "•"}</span>
                    <div className="small"><div>{a.body}</div><div className="tiny muted">{a.kind} · {fmtDate(a.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div></div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">Nothing logged yet.</p>}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <form action={saveDeal} className="card pad-lg stack" style={{ gap: 12 }}>
            <input type="hidden" name="key" value={c.key} />
            <div className="eyebrow">Deal</div>
            <label className="field">Estimated value (₹)<input name="dealValueInr" defaultValue={c.dealValueInr ?? ""} inputMode="numeric" placeholder="e.g. 2500000" /></label>
            <label className="field">Next step<input name="nextStep" defaultValue={c.nextStep ?? ""} placeholder="e.g. Send programme deck" /></label>
            <label className="field">Due<input type="date" name="nextStepDue" defaultValue={dueStr} /></label>
            <label className="field">Warm intro <span className="hint">Who you know there — the score can’t see this</span><input name="warmIntro" defaultValue={c.warmIntro ?? ""} placeholder="e.g. Rahul (ex-colleague) is in their HR team" /></label>
            <label className="field">Website<input name="website" defaultValue={c.website ?? ""} placeholder="https://" /></label>
            <label className="field">Notes<textarea name="notes" defaultValue={c.notes ?? ""} /></label>
            <SubmitButton className="btn primary" pendingText="Saving…">Save deal</SubmitButton>
          </form>

          <div className="card pad-lg stack" style={{ gap: 12 }}>
            <div className="eyebrow">Contacts</div>
            {contacts.map((p) => (
              <div key={p.id} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span className="avatar">{initials(p.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="small muted">{p.role}</div>
                  <div className="tiny muted">{p.source === "added by Ananya" ? "Added by you" : p.source === "article" ? "Named in a story" : "Found by web search — verify"}</div>
                  <div className="row tiny" style={{ gap: 8, marginTop: 4 }}>
                    {p.email && <a className="link" href={`mailto:${p.email}`}>{p.email}</a>}
                    {p.phone && <a className="link" href={`tel:${p.phone}`}>{p.phone}</a>}
                    {p.sourceUrl && <a className="link" href={p.sourceUrl} target="_blank" rel="noreferrer">source</a>}
                    {p.linkedin && <a className="link" href={p.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
                  </div>
                </div>
                <form action={deleteContact}><input type="hidden" name="id" value={p.id} /><button className="btn sm ghost" title="Remove">×</button></form>
              </div>
            ))}
            {!contacts.length && <p className="small muted" style={{ margin: 0 }}>No contacts yet.</p>}
            <div className="row" style={{ gap: 6 }}>
              <a className="btn sm" href={linkedinSearch(c.name)} target="_blank" rel="noreferrer"><ILinkedin />LinkedIn CSR</a>
              <a className="btn sm" href={csrPageSearch(c.name)} target="_blank" rel="noreferrer"><ISearch />CSR committee</a>
            </div>
            <details>
              <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>+ Add a contact you know</summary>
              <form action={addContact} className="stack" style={{ gap: 8, marginTop: 10 }}>
                <input type="hidden" name="key" value={c.key} />
                <input type="hidden" name="companyName" value={c.name} />
                <input name="name" placeholder="Name" required />
                <input name="role" placeholder="Role" />
                <input name="email" type="email" placeholder="Email" />
                <input name="phone" placeholder="Phone" />
                <input name="linkedin" placeholder="LinkedIn URL" />
                <input name="notes" placeholder="How you know them" />
                <SubmitButton className="btn sm primary" pendingText="Saving…">Save contact</SubmitButton>
              </form>
            </details>
          </div>
          {stories[0] && <a className="btn" href={stories[0].url} target="_blank" rel="noreferrer"><IExt />Latest source</a>}
        </div>
      </div>
    </>
  );
}
