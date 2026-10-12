"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IPlay } from "./icons";

const STAGES = ["collect", "clean", "read", "score", "enrich", "summarise", "deliver"];
const LABEL: Record<string, string> = {
  collect: "Searching 3 live sources",
  clean: "Removing duplicates",
  read: "Gemini is reading stories",
  score: "Scoring against your settings",
  enrich: "Finding contacts & drafting emails",
  summarise: "Writing the summary",
  deliver: "Sending the email",
};

export function RunNow({ activeId, email }: { activeId?: string | null; email?: boolean }) {
  const router = useRouter();
  const [runId, setRunId] = useState<string | null>(activeId ?? null);
  const [stage, setStage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/run/${runId}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (!r) return;
      setStage(r.stage);
      if (r.status !== "running") {
        clearInterval(t);
        setRunId(null);
        setStage(null);
        router.refresh();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [runId, router]);

  async function start() {
    setErr(null);
    const r = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: !!email }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(j.error ?? "Could not start");
    setRunId(j.runId);
    setStage("collect");
  }

  if (runId) {
    const i = Math.max(0, STAGES.indexOf(stage ?? "collect"));
    return (
      <div style={{ minWidth: 260 }}>
        <div className="small pulse" style={{ fontWeight: 600 }}>{LABEL[stage ?? "collect"] ?? "Working"}…</div>
        <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${((i + 1) / STAGES.length) * 100}%` }} /></div>
      </div>
    );
  }
  return (
    <div className="row">
      <button type="button" className="btn primary" onClick={start}><IPlay />{email ? "Run & email digest" : "Refresh now"}</button>
      {err && <span className="error">{err}</span>}
    </div>
  );
}
