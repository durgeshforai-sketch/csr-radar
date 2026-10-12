import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Read models for the dashboard and the email.

export type Run = typeof schema.runs.$inferSelect;
export type Article = typeof schema.articles.$inferSelect;
export type SignalRow = { signal: typeof schema.signals.$inferSelect; article: Article };

export async function latestRun(): Promise<Run | null> {
  const db = getDb();
  const [r] = await db
    .select()
    .from(schema.runs)
    .where(inArray(schema.runs.status, ["done", "partial"]))
    .orderBy(desc(schema.runs.startedAt))
    .limit(1);
  return r ?? null;
}

export async function getRun(id: string): Promise<Run | null> {
  const [r] = await getDb().select().from(schema.runs).where(eq(schema.runs.id, id));
  return r ?? null;
}

export async function runningRun(): Promise<Run | null> {
  const [r] = await getDb()
    .select()
    .from(schema.runs)
    .where(and(eq(schema.runs.status, "running"), gte(schema.runs.startedAt, new Date(Date.now() - 10 * 60_000))))
    .orderBy(desc(schema.runs.startedAt))
    .limit(1);
  return r ?? null;
}

export async function listRuns(limit = 40): Promise<Run[]> {
  return getDb().select().from(schema.runs).orderBy(desc(schema.runs.startedAt)).limit(limit);
}

export async function signalsForRun(runId: string): Promise<SignalRow[]> {
  const rows = await getDb()
    .select({ signal: schema.signals, article: schema.articles })
    .from(schema.signals)
    .innerJoin(schema.articles, eq(schema.signals.articleId, schema.articles.id))
    .where(eq(schema.signals.runId, runId))
    .orderBy(desc(schema.signals.score), desc(schema.articles.publishedAt));
  return rows;
}

export async function getStory(articleId: string) {
  const db = getDb();
  const [article] = await db.select().from(schema.articles).where(eq(schema.articles.id, articleId));
  if (!article) return null;
  const [latest] = await db
    .select({ signal: schema.signals, run: schema.runs })
    .from(schema.signals)
    .innerJoin(schema.runs, eq(schema.signals.runId, schema.runs.id))
    .where(eq(schema.signals.articleId, articleId))
    .orderBy(desc(schema.runs.startedAt))
    .limit(1);
  const related = article.companyKey
    ? await db
        .select()
        .from(schema.articles)
        .where(and(eq(schema.articles.companyKey, article.companyKey), ne(schema.articles.id, articleId)))
        .orderBy(desc(schema.articles.publishedAt))
        .limit(6)
    : [];
  return { article, signal: latest?.signal ?? null, run: latest?.run ?? null, related };
}

// Stories per day across the last N days, for the trend strip
export async function dailyVolume(days = 14) {
  const rows = await getDb()
    .select({
      day: sql<string>`to_char(${schema.articles.publishedAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
      relevant: sql<number>`count(*) filter (where ${schema.articles.extraction}->>'signalType' not in ('not_relevant'))`,
      total: sql<number>`count(*)`,
    })
    .from(schema.articles)
    .where(gte(schema.articles.publishedAt, new Date(Date.now() - days * 86_400_000)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ day: r.day, relevant: Number(r.relevant), total: Number(r.total) }));
}
