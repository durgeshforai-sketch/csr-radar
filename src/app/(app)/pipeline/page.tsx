import Link from "next/link";
import { connection } from "next/server";
import { listCompanies, STAGES, STAGE_LABEL } from "@/lib/crm";
import { fmtDate, inr } from "@/components/ui";

export default async function Pipeline() {
  await connection();
  const all = await listCompanies();
  const open = all.filter((c) => !["radar", "won", "lost", "parked"].includes(c.stage));
  const value = open.reduce((a, c) => a + (c.dealValueInr ?? 0), 0);
  const won = all.filter((c) => c.stage === "won").reduce((a, c) => a + (c.dealValueInr ?? 0), 0);
  const cols = STAGES.map((s) => ({ s, items: all.filter((c) => c.stage === s).slice(0, s === "radar" ? 12 : 100) }));
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Micro-CRM</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Partnership pipeline</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>Move a company from any brief or profile. On radar shows the 12 highest-scoring untouched companies.</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="kpi"><div className="v">{open.length}</div><div className="l">Open conversations</div></div>
          <div className="kpi"><div className="v">{value ? inr(value) : "—"}</div><div className="l">Open pipeline value</div></div>
          <div className="kpi"><div className="v">{won ? inr(won) : "—"}</div><div className="l">Won</div></div>
        </div>
      </div>
      <div className="board">
        {cols.map(({ s, items }) => (
          <div className="col" key={s}>
            <div className="col-head"><span>{STAGE_LABEL[s]}</span><span className="muted">{all.filter((c) => c.stage === s).length}</span></div>
            {items.map((c) => (
              <Link key={c.key} href={`/companies/${encodeURIComponent(c.key)}`} className="card" style={{ display: "block" }}>
                <div style={{ fontWeight: 650 }}>{c.name}</div>
                <div className="tiny muted">Best score {c.bestScore} · {c.stories} {c.stories === 1 ? "story" : "stories"}</div>
                {c.nextStep && <div className="tiny" style={{ marginTop: 6 }}>→ {c.nextStep}{c.nextStepDue && <span className="muted"> · {fmtDate(c.nextStepDue)}</span>}</div>}
                {c.dealValueInr ? <div className="tiny" style={{ marginTop: 4, fontWeight: 600 }}>{inr(c.dealValueInr)}</div> : null}
                {c.warmIntro && <div className="tiny" style={{ color: "var(--good)", marginTop: 4 }}>Warm intro</div>}
              </Link>
            ))}
            {!items.length && <div className="tiny muted">—</div>}
          </div>
        ))}
      </div>
    </>
  );
}
