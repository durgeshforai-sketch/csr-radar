import { validCron } from "@/lib/auth";
import { reapStaleRuns, runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

// Vercel Cron, every day 02:00 UTC = 07:30 IST. Refreshes the dashboard daily; on Mondays it also emails the digest.
export async function GET(req: Request) {
  if (!validCron(req)) return new Response("unauthorised", { status: 401 });
  await reapStaleRuns();
  const url = new URL(req.url);
  const istDay = new Date(Date.now() + 5.5 * 3600_000).getUTCDay(); // 1 = Monday in IST
  const weekly = istDay === 1 || url.searchParams.get("weekly") === "1";
  const r = await runPipeline({ trigger: weekly ? "weekly" : "daily", sendEmail: weekly });
  return Response.json({ runId: r.runId, weekly, buckets: r.stats.buckets, errors: r.errors });
}
