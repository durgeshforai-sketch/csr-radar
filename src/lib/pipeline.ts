import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { ThinkingLevel } from "@google/genai";
import { getDb, schema } from "@/db";
import { loadSettings } from "./settings-store";
import type { Settings } from "./settings";
import { gdelt, geminiSearch, googleNews, urlKeyOf, type RawItem, type SourceResult } from "./sources";
import { cluster, companyKey, quoteFound, similarity, SAME_STORY, titleKey, withinWindow } from "./text";
import { extractBatch, findPoc, sourceText, type Extraction } from "./extract";
import { draftOutreach } from "./outreach";
import { score, type Bucket } from "./score";
import { gemini, MODEL, Usage, withRetry } from "./gemini";
import { sendDigest } from "./email";

// The multi-step system. Every stage records counts; a failing source or batch is logged and skipped,
// so a digest always goes out with whatever could be read.
//
//  1 collect  → 2 clean (window, canonical URL, cross-outlet dedupe) → 3 pre-filter (keywords, free)
//  → 4 read (Gemini, cached per story) → 5 verify (evidence quote in source) → 6 score (code, settings)
//  → 7 enrich calls (point of contact + pitch) → 8 summarise → 9 deliver (Monday email)

export type RunStats = {
  sources: { source: string; ok: boolean; items: number; queries: number; ms: number; error?: string }[];
  collected: number;
  inWindow: number;
  unique: number;
  prefilteredOut: number;
  newArticles: number;
  sameStoryMerged: number;
  extracted: number;
  extractFailed: number;
  cached: number;
  verified: number;
  unverified: number;
  scored: number;
  buckets: Record<Bucket, number>;
  enriched: number;
  stageMs: Record<string, number>;
};

const MAX_EXTRACT_PER_RUN = 120;
const BATCH = 10;
const MAX_ENRICH_PER_RUN = 8;

const CSR_TERM = /\bcsr\b|corporate social responsibility|foundation|philanthrop|social impact|companies act|crore|lakh/i;
const POLICY_TERM = /schedule vii|csr rules|csr norms|csr policy|companies act|\bmca\b|unspent|csr amendment|sebi|social stock exchange/i;
// Promotional noise the CSR queries still pull in: course ads, admissions, job postings, exam notices
const NOISE = /\b(course|courses|admission|admissions|recruitment|vacancy|vacancies|apply online|syllabus|exam date|result declared|due dates?|best .* institute)\b/i;

// The search queries already require CSR context, so this is a cheap negative filter: it removes obvious
// noise and stories with no link to her sectors, CSR money or policy, before any Gemini call.
export function passesPrefilter(it: Pick<RawItem, "title" | "snippet">, s: Settings): boolean {
  const text = `${it.title} ${it.snippet}`;
  if (NOISE.test(it.title)) return false;
  if (CSR_TERM.test(text) || POLICY_TERM.test(text)) return true;
  const lc = text.toLowerCase();
  return s.sectors.filter((x) => x.enabled).some((sec) => sec.keywords.some((k) => new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lc)));
}

export async function runPipeline(opts: { trigger: "daily" | "weekly" | "manual"; sendEmail?: boolean; runId?: string }) {
  const db = getDb();
  const s = await loadSettings();
  const now = new Date();
  const windowStart = new Date(now.getTime() - s.windowDays * 86_400_000);
  const usage = new Usage();
  const errors: { stage: string; message: string }[] = [];
  const stats: RunStats = {
    sources: [],
    collected: 0,
    inWindow: 0,
    unique: 0,
    prefilteredOut: 0,
    newArticles: 0,
    sameStoryMerged: 0,
    extracted: 0,
    extractFailed: 0,
    cached: 0,
    verified: 0,
    unverified: 0,
    scored: 0,
    buckets: { call: 0, watch: 0, fyi: 0, policy: 0, skip: 0 },
    enriched: 0,
    stageMs: {},
  };

  const runId =
    opts.runId ??
    (await db.insert(schema.runs).values({ trigger: opts.trigger, windowStart, windowEnd: now, stage: "collect" }).returning({ id: schema.runs.id }))[0].id;

  let t = Date.now();
  const stage = async (name: string) => {
    await db.update(schema.runs).set({ stage: name, stats }).where(eq(schema.runs.id, runId));
  };
  const lap = (name: string) => {
    stats.stageMs[name] = Date.now() - t;
    t = Date.now();
  };

  try {
    // 1 COLLECT — three live sources in parallel
    await stage("collect");
    const results: SourceResult[] = await Promise.all([googleNews(s), gdelt(s), geminiSearch(s, now, usage)]);
    for (const r of results) {
      stats.sources.push({ source: r.source, ok: r.ok, items: r.items.length, queries: r.queries, ms: r.ms, error: r.error });
      if (!r.ok) errors.push({ stage: "collect", message: `${r.source}: ${r.error}` });
    }
    const raw = results.flatMap((r) => r.items);
    stats.collected = raw.length;
    lap("collect");

    // 2 CLEAN — window, canonical URL, same-URL dedupe
    await stage("clean");
    const inWindow = raw.filter((r) => withinWindow(r.publishedAt, windowStart, now));
    stats.inWindow = inWindow.length;
    const byUrl = new Map<string, RawItem & { queries: string[] }>();
    for (const r of inWindow) {
      const k = urlKeyOf(r);
      const prev = byUrl.get(k);
      if (prev) prev.queries.push(r.query);
      else byUrl.set(k, { ...r, queries: [r.query] });
    }
    stats.unique = byUrl.size;

    // 3 PRE-FILTER — free keyword check before any Gemini call
    const kept = [...byUrl.entries()].filter(([, r]) => passesPrefilter(r, s));
    stats.prefilteredOut = byUrl.size - kept.length;
    if (kept.length) {
      const inserted = await db
        .insert(schema.articles)
        .values(
          kept.map(([k, r]) => ({
            urlKey: k,
            titleKey: titleKey(r.title),
            url: r.url,
            title: r.title.slice(0, 500),
            outlet: r.outlet,
            publishedAt: r.publishedAt,
            snippet: r.snippet || null,
            origin: r.origin,
            queries: [...new Set(r.queries)].slice(0, 5),
            firstRunId: runId,
          })),
        )
        .onConflictDoNothing({ target: schema.articles.urlKey })
        .returning({ id: schema.articles.id });
      stats.newArticles = inserted.length;
    }
    lap("clean");

    // 4 READ + 5 VERIFY — only stories without a cached extraction, one per same-story cluster
    await stage("read");
    const windowArticles = await db
      .select()
      .from(schema.articles)
      .where(and(gte(schema.articles.publishedAt, windowStart), lte(schema.articles.publishedAt, new Date(now.getTime() + 6 * 3600_000))))
      .orderBy(desc(schema.articles.publishedAt));
    const done = windowArticles.filter((a) => a.extraction);
    stats.cached = done.length;
    const todo: typeof windowArticles = [];
    for (const a of windowArticles.filter((x) => !x.extraction)) {
      const dupe = [...done, ...todo].some((d) => similarity(d.title, a.title) >= SAME_STORY);
      if (dupe) stats.sameStoryMerged++;
      else todo.push(a);
    }
    const queue = todo.slice(0, MAX_EXTRACT_PER_RUN);
    const batches: (typeof queue)[] = [];
    for (let i = 0; i < queue.length; i += BATCH) batches.push(queue.slice(i, i + BATCH));

    let next = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < batches.length) {
          const batch = batches[next++];
          try {
            const out = await extractBatch(batch, s, usage);
            await Promise.all(
              batch.map((a, i) => {
                const e = out[i];
                if (!e) {
                  stats.extractFailed++;
                  return null;
                }
                const verified = quoteFound(e.evidence, sourceText(a));
                verified ? stats.verified++ : stats.unverified++;
                stats.extracted++;
                return db
                  .update(schema.articles)
                  .set({ extraction: e, extractionModel: MODEL, evidenceVerified: verified, companyKey: companyKey(e.company) })
                  .where(eq(schema.articles.id, a.id));
              }),
            );
          } catch (err) {
            stats.extractFailed += batch.length;
            errors.push({ stage: "read", message: `Batch of ${batch.length} failed: ${String(err).slice(0, 160)}` });
          }
        }
      }),
    );
    lap("read");

    // 6 SCORE — deterministic, under today's settings
    await stage("score");
    const readable = await db
      .select()
      .from(schema.articles)
      .where(and(gte(schema.articles.publishedAt, windowStart), sql`${schema.articles.extraction} is not null`))
      .orderBy(desc(schema.articles.publishedAt));
    const all = await db
      .select({ id: schema.articles.id, url: schema.articles.url, title: schema.articles.title, outlet: schema.articles.outlet })
      .from(schema.articles)
      .where(gte(schema.articles.publishedAt, windowStart));

    // Warming: how many other relevant stories about the same company in the 90 days before this one
    const keys = [...new Set(readable.map((a) => a.companyKey).filter(Boolean))] as string[];
    const history = keys.length
      ? await db
          .select({ id: schema.articles.id, companyKey: schema.articles.companyKey, publishedAt: schema.articles.publishedAt, extraction: schema.articles.extraction })
          .from(schema.articles)
          .where(and(inArray(schema.articles.companyKey, keys), gte(schema.articles.publishedAt, new Date(now.getTime() - 90 * 86_400_000))))
      : [];

    const scored = readable.map((a) => {
      const e = a.extraction as Extraction;
      const prior = history.filter(
        (h) => h.companyKey === a.companyKey && h.id !== a.id && h.publishedAt < a.publishedAt && h.extraction && h.extraction.signalType !== "not_relevant",
      ).length;
      return { a, ...score(e, { publishedAt: a.publishedAt, now, evidenceVerified: !!a.evidenceVerified, priorSignals: prior }, s) };
    });

    // Same story reported by several outlets → one card, highest score leads
    scored.sort((x, y) => y.score - x.score);
    const groups = cluster(scored.map((x) => ({ ...x, title: x.a.title })));
    const rows = groups.map((g) => {
      const coveredIds = new Set([g.lead.a.id, ...g.others.map((o) => o.a.id)]);
      const extra = all.filter((x) => !coveredIds.has(x.id) && similarity(x.title, g.lead.a.title) >= SAME_STORY);
      return {
        runId,
        articleId: g.lead.a.id,
        alsoCoveredBy: [...g.others.map((o) => ({ title: o.a.title, url: o.a.url, outlet: o.a.outlet })), ...extra.map((x) => ({ title: x.title, url: x.url, outlet: x.outlet }))].slice(0, 6),
        score: g.lead.score,
        breakdown: g.lead.breakdown,
        bucket: g.lead.bucket,
      };
    });
    if (rows.length) await db.insert(schema.signals).values(rows);
    stats.scored = rows.length;
    for (const r of rows) stats.buckets[r.bucket]++;
    lap("score");

    // 7 ENRICH — point of contact + pitch for this week's calls (cached per story)
    await stage("enrich");
    const callIds = rows.filter((r) => r.bucket === "call").map((r) => r.articleId);
    const toEnrich = readable.filter((a) => callIds.includes(a.id) && !a.poc).slice(0, MAX_ENRICH_PER_RUN);
    await Promise.all(
      toEnrich.map(async (a) => {
        try {
          await enrichArticle(a.id, s, usage);
          stats.enriched++;
        } catch (err) {
          errors.push({ stage: "enrich", message: `${a.title.slice(0, 60)}: ${String(err).slice(0, 120)}` });
        }
      }),
    );
    lap("enrich");

    // 8 SUMMARISE — the top of the digest
    await stage("summarise");
    let summary: { headline: string; bullets: string[] } | null = null;
    try {
      summary = await summarise(runId, usage);
    } catch (err) {
      errors.push({ stage: "summarise", message: String(err).slice(0, 160) });
    }
    lap("summarise");

    await db
      .update(schema.runs)
      .set({
        status: errors.length ? "partial" : "done",
        stage: null,
        finishedAt: new Date(),
        stats,
        errors,
        summary,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
        costUsd: usage.costUsd,
      })
      .where(eq(schema.runs.id, runId));

    // 9 DELIVER — Monday email (or when asked)
    if (opts.sendEmail) {
      await stage("deliver");
      const r = await sendDigest(runId, s);
      await db
        .update(schema.runs)
        .set({ stage: null, emailedTo: r.to, emailedAt: r.ok ? new Date() : null, emailError: r.error ?? null })
        .where(eq(schema.runs.id, runId));
    }
    return { runId, stats, errors };
  } catch (err) {
    errors.push({ stage: "pipeline", message: String(err).slice(0, 300) });
    await db
      .update(schema.runs)
      .set({ status: "failed", stage: null, finishedAt: new Date(), stats, errors, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, costUsd: usage.costUsd })
      .where(eq(schema.runs.id, runId));
    return { runId, stats, errors };
  }
}

export async function enrichArticle(articleId: string, s: Settings, usage = new Usage()) {
  const db = getDb();
  const [a] = await db.select().from(schema.articles).where(eq(schema.articles.id, articleId));
  if (!a?.extraction) throw new Error("Story not read yet");
  const poc = await findPoc(a.extraction, a.url, usage);
  const pitch = await draftOutreach({ e: a.extraction, title: a.title, outlet: a.outlet, url: a.url, publishedAt: a.publishedAt, poc }, s, usage);
  await db.update(schema.articles).set({ poc, pitch }).where(eq(schema.articles.id, articleId));
  return { poc, pitch, usage };
}

async function summarise(runId: string, usage: Usage) {
  const db = getDb();
  const rows = await db
    .select({ bucket: schema.signals.bucket, score: schema.signals.score, title: schema.articles.title, extraction: schema.articles.extraction })
    .from(schema.signals)
    .innerJoin(schema.articles, eq(schema.signals.articleId, schema.articles.id))
    .where(and(eq(schema.signals.runId, runId), inArray(schema.signals.bucket, ["call", "watch", "policy"])))
    .orderBy(desc(schema.signals.score))
    .limit(20);
  if (!rows.length) return { headline: "A quiet week: nothing in your sectors cleared the bar.", bullets: [] };
  const lines = rows.map((r) => `[${r.bucket}] ${r.extraction?.company ?? "—"}: ${r.extraction?.summary}`).join("\n");
  const res = await withRetry(() =>
    gemini().models.generateContent({
      model: MODEL,
      contents: `These are this week's CSR signals for an education/skilling NGO's partnerships head, already ranked:\n${lines}\n\nWrite JSON {"headline": one sentence (max 20 words) naming the single most important opportunity, "bullets": 3 short bullets on the week (what to call about first, any trend, any policy change)}. Use only the facts above.`,
      config: { responseMimeType: "application/json", temperature: 0.2, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    }),
  );
  usage.add(res.usageMetadata);
  const j = JSON.parse(res.text ?? "{}") as { headline?: string; bullets?: string[] };
  return { headline: j.headline ?? "", bullets: (j.bullets ?? []).slice(0, 4) };
}

// Runs that are still "running" after 10 minutes died with the function; mark them so the UI doesn't spin forever.
export async function reapStaleRuns() {
  const db = getDb();
  await db
    .update(schema.runs)
    .set({ status: "failed", stage: null, finishedAt: new Date(), errors: [{ stage: "pipeline", message: "Timed out" }] })
    .where(and(eq(schema.runs.status, "running"), lte(schema.runs.startedAt, new Date(Date.now() - 10 * 60_000)), isNull(schema.runs.finishedAt)));
}
