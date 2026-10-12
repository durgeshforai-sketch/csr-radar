import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Ananya's micro-CRM: one deal per company, contacts, and an activity log.

export const STAGES = ["radar", "researching", "contacted", "meeting", "proposal", "won", "lost", "parked"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  radar: "On radar",
  researching: "Researching",
  contacted: "Contacted",
  meeting: "Meeting",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
  parked: "Parked",
};
export const OPEN_STAGES: Stage[] = ["researching", "contacted", "meeting", "proposal"];

export type Company = typeof schema.companies.$inferSelect;
export type Contact = typeof schema.contacts.$inferSelect;
export type Activity = typeof schema.activities.$inferSelect;

export async function getCompany(key: string) {
  const db = getDb();
  const [company] = await db.select().from(schema.companies).where(eq(schema.companies.key, key));
  if (!company) return null;
  const [contacts, activities, stories] = await Promise.all([
    db.select().from(schema.contacts).where(eq(schema.contacts.companyKey, key)).orderBy(asc(schema.contacts.createdAt)),
    db.select().from(schema.activities).where(eq(schema.activities.companyKey, key)).orderBy(desc(schema.activities.at)),
    db
      .select({
        a: schema.articles,
        score: sql<number>`coalesce((select s.score from signals s join runs r on r.id = s.run_id where s.article_id = "articles"."id" order by r.started_at desc limit 1), 0)`,
        bucket: sql<string | null>`(select s.bucket::text from signals s join runs r on r.id = s.run_id where s.article_id = "articles"."id" order by r.started_at desc limit 1)`,
      })
      .from(schema.articles)
      .where(eq(schema.articles.companyKey, key))
      .orderBy(desc(schema.articles.publishedAt)),
  ]);
  return { company, contacts, activities, stories: stories.map((s) => ({ ...s.a, score: Number(s.score), bucket: s.bucket })) };
}

export type CompanyListRow = Company & { stories: number; lastSeen: Date | null; bestScore: number; contacts: number; signalTypes: string[] };

export async function listCompanies(): Promise<CompanyListRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      c: schema.companies,
      stories: sql<number>`(select count(*) from articles a where a.company_key = "companies"."key")`,
      lastSeen: sql<string | null>`(select max(a.published_at) from articles a where a.company_key = "companies"."key")`,
      bestScore: sql<number>`coalesce((select max(s.score) from signals s join articles a on a.id = s.article_id where a.company_key = "companies"."key"), 0)`,
      contacts: sql<number>`(select count(*) from contacts c where c.company_key = "companies"."key")`,
      signalTypes: sql<string[]>`coalesce((select array_agg(distinct a.extraction->>'signalType') from articles a where a.company_key = "companies"."key" and a.extraction is not null), '{}')`,
    })
    .from(schema.companies);
  return rows
    .map((r) => ({ ...r.c, stories: Number(r.stories), lastSeen: r.lastSeen ? new Date(r.lastSeen) : null, bestScore: Number(r.bestScore), contacts: Number(r.contacts), signalTypes: r.signalTypes ?? [] }))
    .sort((a, b) => b.bestScore - a.bestScore);
}

export async function boardCompanies() {
  const db = getDb();
  return db.select().from(schema.companies).where(inArray(schema.companies.stage, [...STAGES])).orderBy(desc(schema.companies.updatedAt));
}

export async function dueNextSteps(withinDays = 7) {
  return getDb()
    .select()
    .from(schema.companies)
    .where(and(isNotNull(schema.companies.nextStepDue), lte(schema.companies.nextStepDue, new Date(Date.now() + withinDays * 86_400_000)), inArray(schema.companies.stage, OPEN_STAGES)))
    .orderBy(asc(schema.companies.nextStepDue));
}

export async function stagesByKeys(keys: string[]) {
  if (!keys.length) return new Map<string, Company>();
  const rows = await getDb().select().from(schema.companies).where(inArray(schema.companies.key, keys));
  return new Map(rows.map((r) => [r.key, r]));
}

export async function logActivity(companyKey: string, kind: Activity["kind"], body: string, articleId?: string | null) {
  await getDb().insert(schema.activities).values({ companyKey, kind, body, articleId: articleId ?? null });
}
