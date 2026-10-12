import { config } from "dotenv";
config({ path: ".env.local" });
const { getDb, schema } = await import("../src/db/index.ts");
const { desc, eq } = await import("drizzle-orm");
const db = getDb();
const [run] = await db.select().from(schema.runs).orderBy(desc(schema.runs.startedAt)).limit(1);
console.log(run.summary);
const rows = await db.select().from(schema.signals).innerJoin(schema.articles, eq(schema.signals.articleId, schema.articles.id)).where(eq(schema.signals.runId, run.id)).orderBy(desc(schema.signals.score));
for (const r of rows) {
  const e = r.articles.extraction!;
  console.log(`${r.signals.bucket.padEnd(6)} ${String(r.signals.score).padStart(3)} | ${e.signalType} | ${e.company} | ${e.sectors.join(",")} | ${e.places.join(",")}${e.panIndia?" (pan)":""} | ${r.articles.title.slice(0,90)} | ${r.signals.breakdown.rule}`);
}
