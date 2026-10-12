"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IPlay } from "./icons";

const STAGES = ["collect", "clean", "read", "score", "enrich", "summarise", "deliver"];
const LABEL: Record<string, string> = {
  collect: "Searching 4 live sources",
  clean: "Removing duplicates",
  read: "Gemini is reading stories",
  score: "Scoring against your settings",
  enrich: "Finding contacts & drafting emails",
  summarise: "Writing the summary",
  deliver: "Sending the email",
};

function Bars() {
  return (
    <span className="loader" aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

export function RunNow({ activeId, email, block, variant = "primary" }: { activeId?: string | null; email?: boolean; block?: boolean; variant?: "primary" | "lime" | "pill" }) {
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
      <div className="run-live" role="status" style={block ? { minWidth: 0 } : undefined}>
        <Bars />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small" style={{ fontWeight: 700 }}>{LABEL[stage ?? "collect"] ?? "Working"}…</div>
          <div className="progress" style={{ marginTop: 6, background: "rgba(255,255,255,.15)" }}><div style={{ width: `${((i + 1) / STAGES.length) * 100}%` }} /></div>
        </div>
      </div>
    );
  }
  const cls = variant === "pill" ? "pill" : `btn ${variant}${block ? " block" : ""}`;
  return (
    <div className={block ? "stack" : "row"} style={{ gap: 6 }}>
      <button type="button" className={cls} onClick={start}><IPlay />{email ? "Run & email digest" : "Refresh now"}</button>
      {err && <span className="error">{err}</span>}
    </div>
  );
}
