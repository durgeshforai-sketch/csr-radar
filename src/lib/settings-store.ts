import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEFAULT_SETTINGS, Settings } from "./settings";

export async function loadSettings(): Promise<Settings> {
  const db = getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (!row) {
    await db.insert(schema.settings).values({ id: 1, value: DEFAULT_SETTINGS }).onConflictDoNothing();
    return DEFAULT_SETTINGS;
  }
  // Fill any field added since the row was saved
  const parsed = Settings.safeParse({ ...DEFAULT_SETTINGS, ...row.value, weights: { ...DEFAULT_SETTINGS.weights, ...row.value.weights } });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(value: Settings) {
  const db = getDb();
  const v = Settings.parse(value);
  await db
    .insert(schema.settings)
    .values({ id: 1, value: v })
    .onConflictDoUpdate({ target: schema.settings.id, set: { value: v, updatedAt: new Date() } });
  return v;
}
