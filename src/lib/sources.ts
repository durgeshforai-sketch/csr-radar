import { XMLParser } from "fast-xml-parser";
import { ThinkingLevel } from "@google/genai";
import type { Settings } from "./settings";
import { canonicalUrl, decodeEntities, similarity, splitOutlet } from "./text";
import { gemini, MODEL, type Usage } from "./gemini";

// Live sources. Each one can fail on its own; the run continues with whatever came back.

export type RawItem = {
  url: string;
  title: string;
  outlet: string | null;
  publishedAt: Date;
  snippet: string;
  origin: "google_news" | "gdelt" | "gemini_search";
  query: string;
};

export type SourceResult = { source: string; ok: boolean; items: RawItem[]; queries: number; error?: string; ms: number };

const UA = "Mozilla/5.0 (compatible; CSRRadar/1.0; +https://vercel.app)";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          out[idx] = { status: "fulfilled", value: await fn(items[idx]) };
        } catch (reason) {
          out[idx] = { status: "rejected", reason };
        }
      }
    }),
  );
  return out;
}

// ---------- Google News RSS ----------

const or = (xs: string[]) => (xs.length === 1 ? quoteIfSpace(xs[0]) : `(${xs.map(quoteIfSpace).join(" OR ")})`);
const quoteIfSpace = (s: string) => (s.includes(" ") ? `"${s}"` : s);

// Queries are built from Ananya's settings, so a new sector or city is searched on the next run.
export function buildQueries(s: Settings): string[] {
  const q: string[] = [];
  for (const sec of s.sectors.filter((x) => x.enabled)) {
    const kw = or(sec.keywords.slice(0, 3));
    q.push(`CSR ${kw} (launches OR initiative OR programme OR partners OR commits)`);
    q.push(`CSR ${kw} ("implementation partner" OR "NGO partners" OR "invites proposals" OR "expression of interest" OR "call for proposals")`);
  }
  q.push(`CSR ("request for proposal" OR "call for proposals" OR "expression of interest") NGO`);
  q.push(`CSR foundation ("crore" OR "allocates" OR "spend") (education OR skilling OR youth)`);
  q.push(`CSR ("annual report" OR "CSR spend" OR "CSR budget") (education OR skill)`);
  q.push(`("CSR rules" OR "Schedule VII" OR "CSR amendment" OR "CSR norms" OR "CSR policy") (MCA OR government OR SEBI)`);
  q.push(`"Companies Act" CSR (amendment OR circular OR notification OR "unspent")`);
  for (const g of s.geographies.filter((x) => x.tier !== "national")) {
    q.push(`CSR ${or(g.terms.slice(0, 3))} (school OR skill OR youth OR students OR training)`);
  }
  return q;
}

export function parseGoogleNews(body: string, query: string): RawItem[] {
  const doc = xml.parse(body);
  const raw = doc?.rss?.channel?.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((it: Record<string, unknown>) => {
      const src = it.source as { "#text"?: string } | string | undefined;
      const outletTag = typeof src === "string" ? src : src?.["#text"];
      const { title, outlet } = splitOutlet(decodeEntities(String(it.title ?? "")));
      return {
        url: String(it.link ?? ""),
        title,
        outlet: outletTag ? decodeEntities(outletTag) : outlet,
        publishedAt: new Date(String(it.pubDate ?? "")),
        snippet: decodeEntities(String(it.description ?? "")).slice(0, 600),
        origin: "google_news" as const,
        query,
      };
    })
    .filter((x: RawItem) => x.url && x.title);
}

const gnUrl = (q: string, days: number) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=en-IN&gl=IN&ceid=IN:en`;

export async function googleNews(s: Settings): Promise<SourceResult> {
  const t = Date.now();
  const queries = buildQueries(s);
  const res = await pool(queries, 5, async (q) => parseGoogleNews(await fetchText(gnUrl(q, s.windowDays)), q).slice(0, 25));
  const items = res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = res.filter((r) => r.status === "rejected").length;
  return {
    source: "Google News",
    ok: failed < queries.length,
    items,
    queries: queries.length,
    error: failed ? `${failed}/${queries.length} queries failed` : undefined,
    ms: Date.now() - t,
  };
}

// ---------- GDELT (global news index; real publisher URLs) ----------

export async function gdelt(s: Settings): Promise<SourceResult> {
  const t = Date.now();
  const sectorTerms = s.sectors
    .filter((x) => x.enabled)
    .flatMap((x) => x.keywords.slice(0, 2))
    .filter((w) => !w.includes("-"));
  const q = `("CSR" OR "corporate social responsibility") ${or(sectorTerms.slice(0, 8))} sourcecountry:india sourcelang:english`;
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=75&timespan=${s.windowDays}d&format=json&sort=datedesc`;
  try {
    let body = await fetchText(url, 20000);
    if (!body.trim().startsWith("{")) {
      // Rate limit is one request per 5 s; wait once and retry
      await new Promise((r) => setTimeout(r, 6000));
      body = await fetchText(url, 20000);
    }
    if (!body.trim().startsWith("{")) throw new Error(body.slice(0, 120));
    const data = JSON.parse(body) as { articles?: { url: string; title: string; domain: string; seendate: string }[] };
    const items: RawItem[] = (data.articles ?? []).map((a) => ({
      url: a.url,
      title: decodeEntities(a.title),
      outlet: a.domain,
      publishedAt: new Date(a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z")),
      snippet: "",
      origin: "gdelt",
      query: q,
    }));
    return { source: "GDELT", ok: true, items, queries: 1, ms: Date.now() - t };
  } catch (e) {
    return { source: "GDELT", ok: false, items: [], queries: 1, error: String(e).slice(0, 200), ms: Date.now() - t };
  }
}

// ---------- Gemini + Google Search (gap-fill) ----------
// Gemini searches the web for announcements the feeds may have missed. Its links are not trusted:
// every headline it returns is looked up in Google News and kept only if a real article matches.

export async function geminiSearch(s: Settings, now: Date, usage: Usage): Promise<SourceResult> {
  const t = Date.now();
  const sectors = s.sectors.filter((x) => x.enabled).map((x) => x.label.toLowerCase()).join(", ");
  const places = s.geographies.filter((g) => g.tier !== "national").map((g) => g.label).join(", ");
  const prompt = `Today is ${now.toISOString().slice(0, 10)}. Search the news for the last ${s.windowDays} days.
Find Indian corporate CSR developments in: ${sectors}. Priority regions: ${places}, then pan-India.
Include: companies or corporate foundations announcing new CSR programmes; companies increasing CSR allocation; corporates or CSR foundations inviting NGO implementation partners (RFPs, EOIs, calls for proposals); government/MCA/SEBI changes to CSR rules.
Return ONLY a JSON array (max 12) of {"headline": exact news headline, "outlet": publication name, "date": "YYYY-MM-DD"}. No commentary.`;
  try {
    const res = await gemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    usage.add(res.usageMetadata);
    const text = (res.text ?? "").replace(/^```(json)?|```$/gm, "").trim();
    const found = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as { headline: string; outlet?: string; date?: string }[];

    // Verify each AI-found headline against the Google News index
    const checked = await pool(found.slice(0, 12), 4, async (f) => {
      const words = f.headline.split(/\s+/).slice(0, 12).join(" ");
      const hits = parseGoogleNews(await fetchText(gnUrl(words, s.windowDays + 3)), "gemini_search");
      const best = hits.map((h) => ({ h, sim: similarity(h.title, f.headline) })).sort((a, b) => b.sim - a.sim)[0];
      return best && best.sim >= 0.5 ? { ...best.h, origin: "gemini_search" as const, query: "Gemini web search (verified in Google News)" } : null;
    });
    const items = checked.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
    return {
      source: "Gemini web search",
      ok: true,
      items,
      queries: 1 + found.length,
      error: found.length - items.length ? `${found.length - items.length}/${found.length} AI-found headlines not verifiable, dropped` : undefined,
      ms: Date.now() - t,
    };
  } catch (e) {
    return { source: "Gemini web search", ok: false, items: [], queries: 1, error: String(e).slice(0, 200), ms: Date.now() - t };
  }
}

export const urlKeyOf = (it: RawItem) => canonicalUrl(it.url);
