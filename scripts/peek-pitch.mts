import { config } from "dotenv";
config({ path: ".env.local" });
const { getDb, schema } = await import("../src/db/index.ts");
const { isNotNull } = await import("drizzle-orm");
const rows = await getDb().select().from(schema.articles).where(isNotNull(schema.articles.pitch));
for (const r of rows.slice(0, 7)) console.log(r.title.slice(0, 70), "\n  POC:", JSON.stringify({ n: r.poc?.name, role: r.poc?.role, src: r.poc?.source, url: r.poc?.sourceUrl?.slice(0, 80) }), "\n  invented:", r.pitch?.inventedNumbers, "risk:", r.pitch?.selfCheck.genericHookRisk);
const p = rows[0].pitch!;
console.log(JSON.stringify({ journey: p.journey, job: p.job, problem: p.problem, angle: p.angle, buyerFacts: p.buyerFacts, buyerAssumptions: p.buyerAssumptions, subject: p.subject }, null, 1));
console.log(p.email); console.log("--- follow-up:\n" + p.followUp);
