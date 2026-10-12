import { getRun } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const run = await getRun((await ctx.params).id);
  if (!run) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ status: run.status, stage: run.stage, stats: run.stats, errors: run.errors });
}
