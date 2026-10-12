import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { gemini, MODEL, withRetry, type Usage } from "./gemini";
import type { Settings } from "./settings";

// Gemini Flash reads each story and returns facts. It does NOT rank or decide — score.ts does.

export const SIGNAL_TYPES = ["partner_search", "new_initiative", "increased_allocation", "policy_change", "other_csr", "not_relevant"] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_LABEL: Record<SignalType, string> = {
  partner_search: "Seeking NGO partners",
  new_initiative: "New CSR initiative",
  increased_allocation: "Increased allocation",
  policy_change: "Policy / regulation",
  other_csr: "Other CSR activity",
  not_relevant: "Not relevant",
};

const Person = z.object({
  name: z.string().describe("Full name exactly as written in the text"),
  role: z.string().describe("Title / role as written, e.g. 'Head of CSR', 'CEO, XYZ Foundation'"),
  organisation: z.string().nullable(),
});

export const Extraction = z.object({
  id: z.number().int().describe("The [id] of the story"),
  signalType: z.enum(SIGNAL_TYPES),
  company: z
    .string()
    .nullable()
    .describe("The company, PSU or corporate foundation behind the CSR activity. Null for government policy stories or if none named."),
  companyType: z.enum(["private", "psu", "corporate_foundation", "government", "other", "unknown"]),
  sectors: z.array(z.string()).describe("Keys from the sector list that this story is about. Empty if none."),
  places: z.array(z.string()).describe("Indian cities/districts/states where the programme runs, as written. Empty if not stated."),
  panIndia: z.boolean().describe("The programme is national / multi-state"),
  amountInrCrore: z.number().nullable().describe("Money committed in ₹ crore, ONLY if a figure is stated. 1 crore = 10 million; ₹50 lakh = 0.5."),
  amountText: z.string().nullable().describe("The amount exactly as written, e.g. '₹5 crore'"),
  audienceMatch: z
    .boolean()
    .describe("The programme's beneficiaries overlap with OUR NGO's audience (described in the instructions), e.g. youth, school dropouts, first-generation job seekers"),
  partnerSearchExplicit: z.boolean().describe("The text explicitly says they are seeking / inviting NGO or implementation partners, proposals, or EOIs"),
  deadline: z.string().nullable().describe("Application / proposal deadline as YYYY-MM-DD if stated"),
  stage: z.enum(["announced", "launched", "expanded", "completed", "ongoing", "unknown"]).describe("'completed' = inauguration/handover of a finished project"),
  peopleNamed: z.array(Person).describe("People named in the text who speak for the company/foundation. Never invent."),
  evidence: z.string().describe("The single most decisive phrase, copied verbatim from the text"),
  summary: z.string().describe("One sentence: who is doing what, where, how much. Plain English."),
  whyItMatters: z.string().describe("One sentence for an education/skilling NGO's partnerships head: why this is (or isn't) an opening."),
  confidence: z.enum(["high", "medium", "low"]).describe("low if the text is only a headline with little detail"),
});
export type Extraction = z.infer<typeof Extraction>;

const Batch = z.object({ stories: z.array(Extraction) });

export type Poc = {
  name: string | null;
  role: string | null;
  source: "article" | "web_search" | "none";
  sourceUrl: string | null;
  linkedinSearch: string;
  csrPageSearch: string;
  note: string;
  retry?: boolean; // web search was unavailable; try again next run
};

const SYSTEM = (s: Settings) => `You read Indian news stories for the partnerships head of a ${s.organisation.city}-based education and skilling NGO.
Our NGO's audience and programmes: ${s.organisation.programmes}
For each story, extract facts only from the text given. Never use outside knowledge, never guess.

Sector keys (use only these in "sectors"): ${s.sectors.filter((x) => x.enabled).map((x) => `${x.key} (${x.label}: ${x.keywords.slice(0, 5).join(", ")})`).join("; ")}.

signalType:
- partner_search: a company/CSR foundation invites NGOs or implementation partners, RFPs, EOIs, calls for proposals.
- new_initiative: a company/foundation announces or launches a new CSR programme, grant, centre, scholarship or partnership.
- increased_allocation: a company signals more CSR money (higher CSR budget, annual report CSR spend up, new multi-year commitment).
- policy_change: government / MCA / SEBI / court change or proposal affecting how companies spend CSR funds.
- other_csr: real CSR news that is none of the above (awards, conclaves, opinion, completed handovers with no new money).
- not_relevant: not about corporate CSR or philanthropy in India, or a government scheme with no corporate role.
Tag a sector when the programme serves it: schools, school development or upgrades, scholarships, labs and STEM/computer labs, teaching, training, skilling centres, digital skills, jobs/placement all count. Sports, health, nutrition or meals alone do not count, even if beneficiaries are students or youth.
- A company/foundation funding or opening something new this week (a lab, a centre, a scholarship cohort, a school programme) is new_initiative, not other_csr.
A story about a sector outside the list (e.g. health only, environment only) is other_csr with empty sectors, unless it is policy_change.
evidence must be copied character-for-character from the text.`;

function storyText(i: number, a: { title: string; outlet: string | null; snippet: string | null; publishedAt: Date }) {
  const snip = a.snippet && a.snippet.toLowerCase() !== a.title.toLowerCase() && !a.snippet.toLowerCase().startsWith(a.title.toLowerCase().slice(0, 40)) ? `\nText: ${a.snippet}` : "";
  return `[${i}] ${a.title}\nOutlet: ${a.outlet ?? "unknown"} · Published: ${a.publishedAt.toISOString().slice(0, 10)}${snip}`;
}

export const sourceText = (a: { title: string; snippet: string | null }) => `${a.title} ${a.snippet ?? ""}`;

export async function extractBatch(
  items: { title: string; outlet: string | null; snippet: string | null; publishedAt: Date }[],
  s: Settings,
  usage: Usage,
): Promise<(Extraction | null)[]> {
  const res = await withRetry(() =>
    gemini().models.generateContent({
      model: MODEL,
      contents: items.map((a, i) => storyText(i, a)).join("\n\n"),
      config: {
        systemInstruction: SYSTEM(s),
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(Batch),
        temperature: 0,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  );
  usage.add(res.usageMetadata);
  const parsed = Batch.parse(JSON.parse(res.text ?? "{}"));
  const valid = new Set(s.sectors.map((x) => x.key));
  return items.map((_, i) => {
    const e = parsed.stories.find((x) => x.id === i);
    return e ? { ...e, sectors: e.sectors.filter((k) => valid.has(k)) } : null;
  });
}

// ---------- Point of contact ----------
// 1) A spokesperson named in the story. 2) Otherwise Gemini + Google Search for the company's CSR head,
// kept only with a source link. Never an email or phone number: Ananya verifies before reaching out.

export function linkedinSearch(company: string, role = "CSR") {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company} ${role}`)}`;
}
export function csrPageSearch(company: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${company} CSR policy committee`)}`;
}

export async function findPoc(e: Extraction, articleUrl: string, usage: Usage): Promise<Poc> {
  const company = e.company ?? "";
  const base = { linkedinSearch: linkedinSearch(company), csrPageSearch: csrPageSearch(company) };
  const named = e.peopleNamed[0];
  if (named) {
    return { ...base, name: named.name, role: named.role, source: "article", sourceUrl: articleUrl, note: "Named in the story" };
  }
  if (!company) return { ...base, name: null, role: null, source: "none", sourceUrl: null, note: "No company named" };
  try {
    const res = await withRetry(() =>
      gemini().models.generateContent({
        model: MODEL,
        contents: `Who currently leads CSR (or the CSR foundation) at ${company} in India? Search the web.
Reply ONLY as JSON {"name": string|null, "role": string|null, "url": the page that states it|null}. If you are not sure, return nulls.`,
        config: { tools: [{ googleSearch: {} }], temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      }),
    );
    usage.add(res.usageMetadata);
    const t = res.text ?? "";
    const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) as { name: string | null; role: string | null; url: string | null };
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundedUrl = chunks.find((c) => c.web?.uri)?.web?.uri ?? null;
    if (j.name && (j.url || groundedUrl)) {
      return { ...base, name: j.name, role: j.role, source: "web_search", sourceUrl: j.url ?? groundedUrl, note: "Found by web search — verify before outreach" };
    }
  } catch (err) {
    if (/RESOURCE_EXHAUSTED|exceeded your current quota|UNAVAILABLE|fetch failed/i.test(String(err)))
      return { ...base, name: null, role: null, source: "none", sourceUrl: null, note: "Web search unavailable right now — will retry on the next run. Use the LinkedIn search meanwhile.", retry: true };
  }
  return { ...base, name: null, role: null, source: "none", sourceUrl: null, note: "No named contact found — use the LinkedIn search" };
}
