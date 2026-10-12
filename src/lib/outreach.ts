import { z } from "zod";
import { chat, MODEL, type Usage } from "./gemini";
import type { Extraction, Poc } from "./extract";
import type { Settings } from "./settings";

// Outreach draft for one opportunity, following the B2B email method:
// research → trigger → buyer (facts vs assumptions) → buying situation (JTBD) → angle →
// Hook·Pain·Value·CTA → evidence check → polish → CTA review → follow-up with a new angle.
// The buying signal is the story itself. Ananya edits and sends; nothing is sent automatically.

export type JourneyStage = "awareness" | "consideration" | "decision" | "post_purchase";

// Where the company is in its partner-selection journey, inferred from the signal (code, not the model).
export function journeyStage(e: Pick<Extraction, "signalType" | "stage" | "partnerSearchExplicit">): { stage: JourneyStage; meaning: string; urgency: string } {
  if (e.partnerSearchExplicit || e.signalType === "partner_search")
    return { stage: "decision", meaning: "Actively choosing implementation partners", urgency: "This week — shortlists close fast" };
  if (e.stage === "completed")
    return { stage: "post_purchase", meaning: "Project delivered with existing partners", urgency: "Relationship play for the next CSR cycle" };
  if (e.signalType === "new_initiative")
    return { stage: "consideration", meaning: "Programme announced; delivery model and partners still forming", urgency: "Within 2 weeks, before partners are locked" };
  return { stage: "awareness", meaning: "Budget or intent signalled; scope not yet defined", urgency: "Introduce early; shape the scope" };
}

export const Draft = z.object({
  research: z.array(z.string()).describe("Step 1: facts about the company from the story only"),
  trigger: z.string().describe("Step 2: the specific, verified reason to write now (from the story)"),
  buyerFacts: z.array(z.string()).describe("Step 3: what we know for certain about the recipient (name, role as written)"),
  buyerAssumptions: z.array(z.string()).describe("Step 3: what we are assuming (responsibilities, success measures). Label as assumptions."),
  job: z.string().describe("Step 4 JTBD: the job the CSR team is trying to get done, phrased 'When…, they want to…, so they can…'"),
  problem: z.string().describe("Step 4: a plausible problem in getting that job done — a hypothesis, not a fact"),
  desiredOutcome: z.string().describe("Step 4: the outcome they likely want"),
  angle: z.string().describe("Step 5: why this observation matters to this buyer, in one sentence"),
  subject: z.string().describe("Specific, under 8 words, no clickbait"),
  hook: z.string().describe("Step 6 Hook: opens with the trigger, specific to them"),
  pain: z.string().describe("Step 6 Pain: the plausible concern, framed as a question or cautious observation"),
  value: z.string().describe("Step 6 Value: what our NGO offers that is relevant — only from the NGO profile given"),
  cta: z.string().describe("Step 6/9 CTA: one proportionate ask"),
  email: z.string().describe("Steps 6–8: the full email, 80–130 words, short paragraphs, greeting + sign-off with {{sender_name}}"),
  selfCheck: z.object({
    genericHookRisk: z.enum(["low", "medium", "high"]).describe("Could this hook be sent to any company? high = yes"),
    unsupportedClaims: z.array(z.string()).describe("Step 7: any claim in the email not backed by the story or the NGO profile. Should be empty."),
    cautionNote: z.string().nullable().describe("If evidence was thin, how the email was kept cautious"),
  }),
  followUp: z.string().describe("Step 10: a 50–70 word follow-up for 5 days later with a genuinely new angle, not a repeat"),
});
export type Draft = z.infer<typeof Draft>;
export type Pitch = Draft & { journey: ReturnType<typeof journeyStage>; inventedNumbers: string[]; model: string };

const SYSTEM = `You draft first-outreach emails from an NGO's Head of Corporate Partnerships to a company's CSR lead.
Work through the method step by step and fill every field.
Non-negotiable: never invent a trigger, buyer pain, metric, company priority, or NGO outcome. Use only the story facts and the NGO profile you are given.
Where evidence is missing, write more cautiously or ask a question instead of asserting.
Write like a thoughtful person, not a marketer: short paragraphs, specific details, no jargon, none of "I hope this finds you well", "synergy", "leverage", "excited to", "game-changer".`;

export async function draftOutreach(
  input: { e: Extraction; title: string; outlet: string | null; url: string; publishedAt: Date; poc: Poc | null },
  s: Settings,
  usage: Usage,
): Promise<Pitch> {
  const { e, poc } = input;
  const journey = journeyStage(e);
  const profile = [`${s.organisation.name}, ${s.organisation.city}.`, s.organisation.programmes, ...s.organisation.proofPoints.map((p) => `Proof point: ${p}`)].join("\n");
  const story = [
    `Headline: ${input.title} (${input.outlet ?? "news"}, ${input.publishedAt.toISOString().slice(0, 10)})`,
    `Company: ${e.company ?? "unknown"} (${e.companyType})`,
    `What happened: ${e.summary}`,
    `Verbatim evidence: "${e.evidence}"`,
    e.amountText ? `Amount: ${e.amountText}` : null,
    e.places.length ? `Where: ${e.places.join(", ")}` : e.panIndia ? "Where: pan-India" : null,
    e.deadline ? `Deadline: ${e.deadline}` : null,
    `Partner search stated: ${e.partnerSearchExplicit ? "yes" : "no"}`,
  ]
    .filter(Boolean)
    .join("\n");
  const buyer = poc?.name ? `${poc.name}, ${poc.role ?? "role unknown"} (${poc.note})` : `Unknown — address the CSR team at ${e.company ?? "the company"}`;

  const res = await chat(
    {
      system: SYSTEM,
      user: `BUYING SIGNAL (the story)\n${story}\n\nBUYER\n${buyer}\n\nBUYER JOURNEY (inferred from the signal)\nStage: ${journey.stage} — ${journey.meaning}. Timing: ${journey.urgency}.\n\nOUR NGO PROFILE (the only facts you may claim about us)\n${profile}`,
      schema: { name: "outreach_draft", schema: z.toJSONSchema(Draft) },
      temperature: 0.4,
      effort: "low",
    },
    usage,
  );
  const d = Draft.parse(JSON.parse(res.text || "{}"));
  return { ...d, journey, inventedNumbers: inventedNumbers(d.email, `${story}\n${profile}`), model: MODEL };
}

// Step 7 in code: every number in the email must appear in the story or the NGO profile.
export function inventedNumbers(email: string, allowedSource: string): string[] {
  const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));
  const allowed = new Set(nums(allowedSource));
  return [...new Set(nums(email))].filter((n) => !allowed.has(n) && !/^(20|30)$/.test(n)); // a 20/30-minute call is an ask, not a claim
}
