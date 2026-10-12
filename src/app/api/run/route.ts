import { after } from "next/server";
import { getDb, schema } from "@/db";
import { runningRun } from "@/lib/data";
import { loadSettings } from "@/lib/settings-store";
import { reapStaleRuns, runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

// "Refresh now" from the dashboard. Returns at once; the run continues after the response and the UI polls it.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: boolean };
  await reapStaleRuns();
  const active = await runningRun();
  if (active) return Response.json({ runId: active.id, already: true });
  const s = await loadSettings();
  const now = new Date();
  const [run] = await getDb()
    .insert(schema.runs)
    .values({ trigger: "manual", windowStart: new Date(now.getTime() - s.windowDays * 86_400_000), windowEnd: now, stage: "collect" })
    .returning({ id: schema.runs.id });
  after(() => runPipeline({ trigger: "manual", runId: run.id, sendEmail: !!body.email }).then(() => undefined));
  return Response.json({ runId: run.id });
}
