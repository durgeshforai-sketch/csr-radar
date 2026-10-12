import { buildDigest } from "@/lib/email";
import { latestRun } from "@/lib/data";

// Preview the Monday email in the browser (behind the login)
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("run") ?? (await latestRun())?.id;
  if (!id) return new Response("no run", { status: 404 });
  const d = await buildDigest(id);
  return new Response(d.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
