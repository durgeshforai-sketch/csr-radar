import { latestRun, signalsForRun } from "@/lib/data";
import { TEMP } from "@/components/ui";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Everything on the radar for a run, as CSV for Ananya's own sheets
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("run") ?? (await latestRun())?.id;
  if (!id) return new Response("no run", { status: 404 });
  const rows = await signalsForRun(id);
  const head = ["temperature", "score", "company", "signal", "sectors", "where", "amount", "deadline", "contact", "contact_role", "headline", "summary", "why_it_matters", "outlet", "published", "url", "reason"];
  const lines = rows.map(({ signal: s, article: a }) => {
    const e = a.extraction;
    return [TEMP[s.bucket].label, s.score, e?.company, e?.signalType, e?.sectors.join("; "), e?.places.join("; ") || (e?.panIndia ? "Pan-India" : ""), e?.amountText, e?.deadline, a.poc?.name, a.poc?.role, a.title, e?.summary, e?.whyItMatters, a.outlet, a.publishedAt.toISOString().slice(0, 10), a.url, s.breakdown.rule]
      .map(cell)
      .join(",");
  });
  return new Response([head.join(","), ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="csr-radar-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
