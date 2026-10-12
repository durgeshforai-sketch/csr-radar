import { config } from "dotenv";
config({ path: ".env.local" });
const { googleNews } = await import("../src/lib/sources.ts");
const { passesPrefilter } = await import("../src/lib/pipeline.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/settings.ts");
const r = await googleNews(DEFAULT_SETTINGS);
const seen = new Set<string>();
for (const it of r.items) { if (seen.has(it.title)) continue; seen.add(it.title); if (!passesPrefilter(it, DEFAULT_SETTINGS)) console.log("DROP |", it.title.slice(0, 110)); }
