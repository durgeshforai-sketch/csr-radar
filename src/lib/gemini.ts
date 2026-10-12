// Every AI task in this app runs on Gemini Flash (brief requirement), reached through the OpenRouter gateway
// with the course key. Only "google/" models; Google's own infrastructure must serve every request.

export const MODEL = process.env.GEMINI_MODEL || "google/gemini-3.7-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const GOOGLE_ONLY = { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false };

type ORUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  cost_details?: { upstream_inference_cost?: number };
};

export class Usage {
  tokensIn = 0;
  tokensOut = 0;
  calls = 0;
  costUsd = 0;
  add(u: ORUsage | undefined) {
    this.calls++;
    this.tokensIn += u?.prompt_tokens ?? 0;
    this.tokensOut += u?.completion_tokens ?? 0; // includes reasoning tokens
    // BYOK keys report cost 0 with the real Google charge under upstream_inference_cost
    this.costUsd += u?.cost || u?.cost_details?.upstream_inference_cost || 0;
  }
}

export class LlmError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Retry transient failures (network drops, 429, 5xx) with backoff, up to 3 tries. 402 (out of credits) is not retried.
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 1500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const status = err instanceof LlmError ? err.status : 0;
      const transient = status === 429 || status >= 500 || /fetch failed|ECONNRESET|ETIMEDOUT|socket|timeout/i.test(String(err));
      if (!transient || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

export type ChatOptions = {
  system?: string;
  user: string;
  /** JSON Schema the reply must follow (OpenRouter structured outputs) */
  schema?: { name: string; schema: object };
  /** Reply must be a JSON object, no schema */
  json?: boolean;
  temperature?: number;
  effort?: "minimal" | "low" | "medium" | "high";
  /** Google Search grounding, run natively by Google via OpenRouter's web_search server tool */
  webSearch?: boolean;
};

export type ChatResult = { text: string; citations: { url: string; title?: string }[]; model: string; provider?: string };

export async function chat(o: ChatOptions, usage: Usage): Promise<ChatResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [...(o.system ? [{ role: "system", content: o.system }] : []), { role: "user", content: o.user }],
    provider: GOOGLE_ONLY,
    temperature: o.temperature ?? 0,
    reasoning: { effort: o.effort ?? "low" },
  };
  if (o.schema) body.response_format = { type: "json_schema", json_schema: { name: o.schema.name, strict: false, schema: o.schema.schema } };
  else if (o.json) body.response_format = { type: "json_object" };
  if (o.webSearch) body.tools = [{ type: "openrouter:web_search", parameters: { engine: "native" } }];

  return withRetry(async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "CSR Radar" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const j = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
      model?: string;
      provider?: string;
      usage?: ORUsage;
      choices?: { message?: { content?: string; annotations?: { type: string; url_citation?: { url: string; title?: string } }[] } }[];
    };
    if (!res.ok || j.error) throw new LlmError(`OpenRouter ${res.status}: ${j.error?.message ?? res.statusText}`, j.error?.code ?? res.status);
    usage.add(j.usage);
    const msg = j.choices?.[0]?.message;
    return {
      text: msg?.content ?? "",
      citations: (msg?.annotations ?? []).filter((a) => a.type === "url_citation" && a.url_citation).map((a) => a.url_citation!),
      model: j.model ?? MODEL,
      provider: j.provider,
    };
  });
}

// Pull the first JSON object/array out of a free-text reply (used where web search prevents structured output)
export function parseLooseJson<T>(text: string, open: "{" | "["): T {
  const close = open === "{" ? "}" : "]";
  const t = text.replace(/^```(json)?|```$/gm, "");
  return JSON.parse(t.slice(t.indexOf(open), t.lastIndexOf(close) + 1)) as T;
}
