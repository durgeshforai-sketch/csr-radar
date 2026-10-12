import { Suspense } from "react";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { IRadar } from "@/components/icons";
import { latestRun } from "@/lib/data";
import { ago } from "@/components/ui";

async function Side() {
  await connection();
  const run = await latestRun().catch(() => null);
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark"><IRadar /></span>
        <div>
          <div className="brand-name">CSR Radar</div>
          <div className="brand-sub">Partnerships · Pune</div>
        </div>
      </div>
      <Nav hot={run?.stats?.buckets.call ?? 0} />
      <div className="side-foot">
        <span>Updated <b>{ago(run?.finishedAt)}</b></span>
        <span>Refreshes daily · 07:30 IST</span>
        <span>Digest email · <b>Mondays</b></span>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Suspense fallback={<aside className="side" />}>
        <Side />
      </Suspense>
      <main className="main">
        <Suspense fallback={<p className="muted pulse">Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
