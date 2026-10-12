"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { logActivity, STAGE_LABEL, STAGES, type Stage } from "@/lib/crm";
import { enrichArticle } from "@/lib/pipeline";
import { loadSettings } from "@/lib/settings-store";
import { companyKey as toKey } from "@/lib/text";

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v || null;
};

async function ensureCompany(key: string, name?: string | null) {
  await getDb().insert(schema.companies).values({ key, name: name ?? key }).onConflictDoNothing();
}

export async function setStage(f: FormData) {
  const key = String(f.get("key"));
  const stage = String(f.get("stage")) as Stage;
  if (!STAGES.includes(stage)) return;
  await ensureCompany(key, str(f, "name"));
  const [before] = await getDb().select().from(schema.companies).where(eq(schema.companies.key, key));
  await getDb().update(schema.companies).set({ stage, updatedAt: new Date() }).where(eq(schema.companies.key, key));
  if (before?.stage !== stage) await logActivity(key, "stage", `Moved to ${STAGE_LABEL[stage]}`, str(f, "articleId"));
  revalidatePath("/", "layout");
}

export async function saveDeal(f: FormData) {
  const key = String(f.get("key"));
  await ensureCompany(key, str(f, "name"));
  const due = str(f, "nextStepDue");
  const value = str(f, "dealValueInr");
  await getDb()
    .update(schema.companies)
    .set({
      dealValueInr: value ? Math.round(Number(value.replace(/[^\d.]/g, ""))) || null : null,
      nextStep: str(f, "nextStep"),
      nextStepDue: due ? new Date(`${due}T09:00:00+05:30`) : null,
      warmIntro: str(f, "warmIntro"),
      website: str(f, "website"),
      notes: str(f, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(schema.companies.key, key));
  revalidatePath("/", "layout");
}

export async function addActivity(f: FormData) {
  const key = String(f.get("key"));
  const body = str(f, "body");
  if (!body) return;
  await ensureCompany(key, str(f, "name"));
  await logActivity(key, (String(f.get("kind")) || "note") as "note", body, str(f, "articleId"));
  await getDb().update(schema.companies).set({ updatedAt: new Date() }).where(eq(schema.companies.key, key));
  revalidatePath("/", "layout");
}

export async function addContact(f: FormData) {
  const key = String(f.get("key"));
  const name = str(f, "name");
  if (!name) return;
  await ensureCompany(key, str(f, "companyName"));
  await getDb().insert(schema.contacts).values({
    companyKey: key,
    name,
    role: str(f, "role"),
    email: str(f, "email"),
    phone: str(f, "phone"),
    linkedin: str(f, "linkedin"),
    notes: str(f, "notes"),
    source: "added by Ananya",
  });
  revalidatePath("/", "layout");
}

export async function deleteContact(f: FormData) {
  await getDb().delete(schema.contacts).where(eq(schema.contacts.id, String(f.get("id"))));
  revalidatePath("/", "layout");
}

export async function addCompanyManually(f: FormData) {
  const name = str(f, "name");
  const key = toKey(name);
  if (!name || !key) return;
  await ensureCompany(key, name);
  revalidatePath("/companies");
}

// Find a contact + write the outreach draft on demand (any story, even Cold ones)
export async function enrichStory(f: FormData) {
  const id = String(f.get("articleId"));
  await enrichArticle(id, await loadSettings());
  revalidatePath(`/story/${id}`);
}
