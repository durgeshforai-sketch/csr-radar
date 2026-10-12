CREATE TYPE "public"."activity_kind" AS ENUM('note', 'call', 'email', 'meeting', 'stage', 'intro');--> statement-breakpoint
CREATE TYPE "public"."bucket" AS ENUM('call', 'watch', 'fyi', 'policy', 'skip');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('radar', 'researching', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'parked');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'done', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('daily', 'weekly', 'manual');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_key" text NOT NULL,
	"article_id" uuid,
	"kind" "activity_kind" NOT NULL,
	"body" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url_key" text NOT NULL,
	"title_key" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"outlet" text,
	"published_at" timestamp with time zone NOT NULL,
	"snippet" text,
	"origin" text NOT NULL,
	"queries" text[] DEFAULT '{}' NOT NULL,
	"first_run_id" uuid,
	"extraction" jsonb,
	"extraction_model" text,
	"evidence_verified" boolean,
	"company_key" text,
	"poc" jsonb,
	"pitch" jsonb,
	"filter_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_urlKey_unique" UNIQUE("url_key")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stage" "deal_stage" DEFAULT 'radar' NOT NULL,
	"deal_value_inr" integer,
	"next_step" text,
	"next_step_due" timestamp with time zone,
	"warm_intro" text,
	"website" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_key" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"linkedin" text,
	"source" text NOT NULL,
	"source_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"status" "run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"stage" text,
	"stats" jsonb,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"emailed_to" text[],
	"emailed_at" timestamp with time zone,
	"email_error" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"also_covered_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"bucket" "bucket" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_company_key_index" ON "activities" USING btree ("company_key");--> statement-breakpoint
CREATE INDEX "articles_published_at_index" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_title_key_index" ON "articles" USING btree ("title_key");--> statement-breakpoint
CREATE INDEX "articles_company_key_index" ON "articles" USING btree ("company_key");--> statement-breakpoint
CREATE INDEX "contacts_company_key_index" ON "contacts" USING btree ("company_key");--> statement-breakpoint
CREATE INDEX "runs_started_at_index" ON "runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "signals_run_id_index" ON "signals" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "signals_article_id_index" ON "signals" USING btree ("article_id");