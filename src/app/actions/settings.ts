"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadSettings, saveSettings } from "@/lib/settings-store";
import { Settings } from "@/lib/settings";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export async function updateSettings(f: FormData) {
  const cur = await loadSettings();
  const sectors = cur.sectors.map((s, i) => ({
    key: s.key,
    label: String(f.get(`sector_${i}_label`) ?? s.label).trim() || s.label,
    keywords: list(f.get(`sector_${i}_keywords`)),
    enabled: f.get(`sector_${i}_enabled`) === "on",
  }));
  const newLabel = String(f.get("new_sector_label") ?? "").trim();
  if (newLabel) {
    sectors.push({ key: newLabel.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, ""), label: newLabel, keywords: list(f.get("new_sector_keywords")), enabled: true });
  }
  const weights = Object.fromEntries(Object.keys(cur.weights).map((k) => [k, Number(f.get(`w_${k}`) ?? (cur.weights as Record<string, number>)[k])]));
  const next = {
    organisation: {
      name: String(f.get("org_name") ?? ""),
      city: String(f.get("org_city") ?? ""),
      programmes: String(f.get("org_programmes") ?? ""),
      proofPoints: String(f.get("org_proof") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
      senderName: String(f.get("org_sender") ?? "Ananya"),
    },
    sectors: sectors.filter((s) => s.keywords.length),
    geographies: cur.geographies.map((g, i) => ({ ...g, label: String(f.get(`geo_${i}_label`) ?? g.label), terms: list(f.get(`geo_${i}_terms`)) })),
    weights,
    thresholds: { call: Number(f.get("t_call")), watch: Number(f.get("t_watch")) },
    recipients: list(f.get("recipients")),
    windowDays: Number(f.get("windowDays") ?? 7),
  };
  const parsed = Settings.safeParse(next);
  if (!parsed.success) redirect(`/settings?error=${encodeURIComponent(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 300))}`);
  await saveSettings(parsed.data);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
