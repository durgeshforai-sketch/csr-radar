import Link from "next/link";
import type { SignalRow } from "@/lib/data";
import type { Company } from "@/lib/crm";
import { STAGE_LABEL } from "@/lib/crm";
import { journeyStage } from "@/lib/outreach";
import { IClock, INews, IPin, IRupee, IExt, IArrow } from "./icons";
import { Score, SignalChip, TempBadge, ago, fmtDate, initials, inrCrore } from "./ui";

// Days until an RFP / EOI closes (IST calendar days)
export function daysLeft(deadline: string, now = new Date()) {
  const today = new Date(new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10));
  return Math.round((new Date(deadline).getTime() - today.getTime()) / 86_400_000);
}
const closes = (d: string) => {
  const n = daysLeft(d);
  return n <= 0 ? "closes today" : n === 1 ? "closes tomorrow" : `closes in ${n} days`;
};

export function where(e: NonNullable<SignalRow["article"]["extraction"]>) {
  return e.places.length ? e.places.slice(0, 2).join(", ") : e.panIndia ? "Pan-India" : "Location not stated";
}

export function OppCard({ row, company, i = 0 }: { row: SignalRow; company?: Company; i?: number }) {
  const { article: a, signal: s } = row;
  const e = a.extraction!;
  const j = journeyStage(e);
  const warm = s.bucket === "watch";
  return (
    <article className={`card opp rise${warm ? " warm" : ""}`} style={{ ["--i" as string]: i }}>
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <TempBadge b={s.bucket} />
          {a.origin === "open_call" ? <span className="chip brand">Open call for NGOs</span> : <SignalChip t={e.signalType} />}
        </div>
        <Score v={s.score} b={s.bucket} />
      </div>
      <div>
        <Link href={`/story/${a.id}`} className="opp-company">{e.company ?? "Unnamed company"}</Link>
        <div className="opp-title" style={{ marginTop: 4 }}>{e.summary}</div>
      </div>
      {a.origin === "open_call" && e.deadline && (
        <div className="deadline">
          <b>{closes(e.deadline)}</b>
          <span>Deadline {fmtDate(e.deadline, { day: "numeric", month: "short", year: "numeric" })} · apply on the source page</span>
        </div>
      )}
      <div className="opp-why"><b>Why it matters:</b> {e.whyItMatters}</div>
      <div className="meta">
        <span><IPin />{where(e)}</span>
        {e.amountText && <span><IRupee />{e.amountInrCrore != null ? inrCrore(e.amountInrCrore) : e.amountText}</span>}
        <span><IClock />{ago(a.publishedAt)}</span>
        <span><INews />{a.outlet ?? "news"}{s.alsoCoveredBy.length ? ` +${s.alsoCoveredBy.length}` : ""}</span>
        {e.deadline && a.origin !== "open_call" && <span style={{ color: "var(--hot)", fontWeight: 600 }}>Deadline {fmtDate(e.deadline)}</span>}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <span className="chip brand" title={j.meaning}>Buyer stage: {j.stage.replace("_", "-")}</span>
        {company && company.stage !== "radar" && <span className="chip">CRM: {STAGE_LABEL[company.stage]}</span>}
        {company?.warmIntro && <span className="chip ok">Warm intro</span>}
      </div>
      <div className="poc">
        <span className="avatar">{a.poc?.name ? initials(a.poc.name) : "?"}</span>
        <div>
          <div className="poc-name">{a.poc?.name ?? (a.poc ? "No named contact yet" : "Contact not looked up yet")}</div>
          <div className="poc-role">{a.poc?.name ? `${a.poc.role ?? ""}${a.poc.source === "web_search" ? " · via web search" : " · named in story"}` : "Open the brief to find one"}</div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <a className="btn sm ghost" href={a.url} target="_blank" rel="noreferrer" title="Read the source"><IExt /></a>
          <Link className="btn sm" href={`/story/${a.id}`}>Brief <IArrow /></Link>
        </div>
      </div>
    </article>
  );
}

export function StoryRow({ row, reason }: { row: SignalRow; reason?: boolean }) {
  const { article: a, signal: s } = row;
  const e = a.extraction;
  return (
    <div className="list-row">
      <div className="row" style={{ gap: 8 }}>
        <TempBadge b={s.bucket} />
        <Score v={s.score} b={s.bucket} />
      </div>
      <div style={{ minWidth: 0 }}>
        <Link href={`/story/${a.id}`} className="t">{e?.company ? <b>{e.company}: </b> : null}{a.title}</Link>
        <div className="s">
          {reason ? s.breakdown.rule.replace(/^Cold: /, "") : e?.summary ?? ""} · {a.outlet ?? "news"} · {fmtDate(a.publishedAt)}
        </div>
      </div>
      <a className="btn sm ghost" href={a.url} target="_blank" rel="noreferrer" title="Read the source"><IExt /></a>
    </div>
  );
}
