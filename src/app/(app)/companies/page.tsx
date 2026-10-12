import Link from "next/link";
import { connection } from "next/server";
import { listCompanies, STAGE_LABEL } from "@/lib/crm";
import { SIGNAL_LABEL, type SignalType } from "@/lib/extract";
import { addCompanyManually } from "@/app/actions/crm";
import { fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/copy-button";

export default async function Companies({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { q } = await searchParams;
  const all = await listCompanies();
  const rows = q ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : all;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Micro-CRM</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Companies</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>Every company the radar has seen, with its strongest signal, contacts and where your deal stands. {all.length} tracked.</p>
        </div>
        <div className="row">
          <form className="row" style={{ gap: 6 }}>
            <input name="q" defaultValue={q} placeholder="Search companies" style={{ width: 200 }} />
          </form>
          <form action={addCompanyManually} className="row" style={{ gap: 6 }}>
            <input name="name" placeholder="Add a company you know" required style={{ width: 210 }} />
            <SubmitButton className="btn" pendingText="Adding…">Add</SubmitButton>
          </form>
        </div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Company</th><th>Best score</th><th>Signals</th><th>Stories</th><th>Last seen</th><th>Contacts</th><th>Deal</th><th>Next step</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key}>
                <td><Link className="link" href={`/companies/${encodeURIComponent(c.key)}`}><b>{c.name}</b></Link>{c.warmIntro && <div className="tiny" style={{ color: "var(--good)" }}>Warm intro</div>}</td>
                <td className="num"><b>{c.bestScore}</b></td>
                <td><div className="row" style={{ gap: 4 }}>{c.signalTypes.filter((t) => t && t !== "not_relevant").map((t) => <span key={t} className="chip">{SIGNAL_LABEL[t as SignalType]}</span>)}</div></td>
                <td className="num">{c.stories}{c.stories > 1 && <span className="tiny" style={{ color: "var(--hot)", marginLeft: 6 }}>warming</span>}</td>
                <td className="muted">{fmtDate(c.lastSeen)}</td>
                <td className="num">{c.contacts || "—"}</td>
                <td><span className="chip">{STAGE_LABEL[c.stage]}</span>{c.dealValueInr ? <div className="tiny muted">₹{c.dealValueInr.toLocaleString("en-IN")}</div> : null}</td>
                <td className="small">{c.nextStep ?? <span className="muted">—</span>}{c.nextStepDue && <div className="tiny muted">{fmtDate(c.nextStepDue)}</div>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="muted">No companies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
