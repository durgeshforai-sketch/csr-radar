import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
} from "drizzle-orm/pg-core";
import type { Settings } from "@/lib/settings";
import type { Extraction, Poc } from "@/lib/extract";
import type { Pitch } from "@/lib/outreach";
import type { ScoreBreakdown } from "@/lib/score";
import type { RunStats } from "@/lib/pipeline";

export const runTrigger = pgEnum("run_trigger", ["daily", "weekly", "manual"]);
export const runStatus = pgEnum("run_status", ["running", "done", "partial", "failed"]);
export const bucket = pgEnum("bucket", ["call", "watch", "fyi", "policy", "skip"]);
// Ananya's outreach pipeline for a story
export const outreach = pgEnum("outreach", ["new", "contacted", "meeting", "proposal", "won", "lost", "not_relevant"]);

// One row: Ananya's sectors, geographies, weights, recipients. Read by every run.
export const settings = pgTable("settings", {
  id: integer().primaryKey().default(1),
  value: jsonb().$type<Settings>().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const runs = pgTable(
  "runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    trigger: runTrigger().notNull(),
    status: runStatus().notNull().default("running"),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    windowEnd: timestamp({ withTimezone: true }).notNull(),
    stage: text(), // current stage while running, for the live progress view
    stats: jsonb().$type<RunStats>(),
    errors: jsonb().$type<{ stage: string; message: string }[]>().notNull().default([]),
    summary: jsonb().$type<{ headline: string; bullets: string[] }>(),
    tokensIn: integer().notNull().default(0),
    tokensOut: integer().notNull().default(0),
    costUsd: real().notNull().default(0),
    emailedTo: text().array(),
    emailedAt: timestamp({ withTimezone: true }),
    emailError: text(),
  },
  (t) => [index().on(t.startedAt)],
);

// Every story we have read. Extraction is cached here, so a re-run only pays Gemini for new stories.
export const articles = pgTable(
  "articles",
  {
    id: uuid().primaryKey().defaultRandom(),
    urlKey: text().notNull().unique(), // canonical URL
    titleKey: text().notNull(), // normalised title, for cross-outlet dedupe
    url: text().notNull(),
    title: text().notNull(),
    outlet: text(),
    publishedAt: timestamp({ withTimezone: true }).notNull(),
    snippet: text(),
    origin: text().notNull(), // google_news | gdelt | gemini_search
    queries: text().array().notNull().default([]),
    firstRunId: uuid(),
    extraction: jsonb().$type<Extraction>(),
    extractionModel: text(),
    evidenceVerified: boolean(),
    companyKey: text(),
    poc: jsonb().$type<Poc>(),
    pitch: jsonb().$type<Pitch>(),
    outreach: outreach().notNull().default("new"),
    outreachNote: text(),
    outreachAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.publishedAt), index().on(t.titleKey), index().on(t.companyKey)],
);

// A run's verdict on a story: score + bucket under the settings at that time.
export const signals = pgTable(
  "signals",
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid()
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    alsoCoveredBy: jsonb().$type<{ title: string; url: string; outlet: string | null }[]>().notNull().default([]),
    score: integer().notNull(),
    breakdown: jsonb().$type<ScoreBreakdown>().notNull(),
    bucket: bucket().notNull(),
  },
  (t) => [index().on(t.runId), index().on(t.articleId)],
);
