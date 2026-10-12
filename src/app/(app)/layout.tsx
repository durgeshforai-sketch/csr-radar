import { Suspense } from "react";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { IRadar, ISearch, IMail } from "@/components/icons";
import { latestRun, runningRun } from "@/lib/data";
import { RunNow } from "@/components/run-now";
import { Loader } from "@/components/charts";
import { ago } from "@/components/ui";

function nextMonday() {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const d = (8 - ist.getUTCDay()) % 7 || 7;
  ist.setUTCDate(ist.getUTCDate() + d);
  return ist.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

async function Side() {
  await connection();
  const [run, running] = await Promise.all([latestRun().catch(() => null), runningRun().catch(() => null)]);
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark"><IRadar /></span>
        <div>
          <div className="brand-name">CSR Radar</div>
          <div className="brand-sub">Partnerships · Pune</div>
        </div>
      </div>
      <div className="cta"><RunNow activeId={running?.id} block /></div>
      <Nav hot={run?.stats?.buckets.call ?? 0} />
      <div className="promo">
        <div className="blob" />
        <Loader />
        <b>Next digest · {nextMonday()}, 07:30</b>
        <div className="promo-sub">Dashboard refreshes daily · updated {ago(run?.finishedAt)}</div>
      </div>
    </aside>
  );
}

async function Top() {
  await connection();
  const run = await latestRun().catch(() => null);
  return (
    <div className="topbar">
      <form action="/companies" className="search">
        <ISearch />
        <input name="q" placeholder="Search companies, e.g. Tata, Infosys…" aria-label="Search companies" />
      </form>
      <div className="me">
        <a className="icon-btn" href="/api/digest-preview" target="_blank" rel="noreferrer" title="Preview the Monday email">
          <IMail />
          {!!run?.stats?.buckets.call && <span className="dot" />}
        </a>
        <span className="avatar">AN</span>
        <span>Ananya</span>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Suspense fallback={<aside className="side" />}>
        <Side />
      </Suspense>
      <main className="main">
        <Suspense fallback={<div className="topbar" style={{ height: 42 }} />}>
          <Top />
        </Suspense>
        <Suspense fallback={<div className="page-loading"><Loader purple lg />Loading…</div>}>{children}</Suspense>
      </main>
    </div>
  );
}
