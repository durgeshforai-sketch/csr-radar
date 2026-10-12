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
// Micro-CRM: one deal per company, moved by Ananya
export const dealStage = pgEnum("deal_stage", ["radar", "researching", "contacted", "meeting", "proposal", "won", "lost", "parked"]);
export const activityKind = pgEnum("activity_kind", ["note", "call", "email", "meeting", "stage", "intro"]);

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
    // Set when the free keyword pre-filter dropped it; still listed under "Cold" so nothing escapes her eye
    filterReason: text(),
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

// ---------- Micro-CRM ----------

export const companies = pgTable("companies", {
  key: text().primaryKey(), // companyKey from text.ts
  name: text().notNull(),
  stage: dealStage().notNull().default("radar"),
  dealValueInr: integer(), // her estimate, ₹
  nextStep: text(),
  nextStepDue: timestamp({ withTimezone: true }),
  warmIntro: text(), // "I know X there" — relationships the score can't see
  website: text(),
  notes: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyKey: text().notNull(),
    name: text().notNull(),
    role: text(),
    email: text(),
    phone: text(),
    linkedin: text(),
    source: text().notNull(), // "article" | "web_search" | "added by Ananya"
    sourceUrl: text(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.companyKey)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyKey: text().notNull(),
    articleId: uuid(),
    kind: activityKind().notNull(),
    body: text().notNull(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.companyKey)],
);
