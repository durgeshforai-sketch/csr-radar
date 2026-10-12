import { GoogleGenAI } from "@google/genai";

// Every AI task in this app goes through Gemini Flash (brief requirement: no other model).
export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

let client: GoogleGenAI | null = null;
export function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return (client ??= new GoogleGenAI({ apiKey }));
}

// Gemini Flash list price (USD per 1M tokens), for the cost shown on the Runs page. Thinking tokens bill as output.
const PRICE = { in: 0.5, out: 3.0 };

type Meta = { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined;

export class Usage {
  tokensIn = 0;
  tokensOut = 0;
  calls = 0;
  add(u: Meta) {
    this.calls++;
    this.tokensIn += u?.promptTokenCount ?? 0;
    this.tokensOut += (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
  }
  get costUsd() {
    return (this.tokensIn * PRICE.in + this.tokensOut * PRICE.out) / 1_000_000;
  }
}

// Retry transient failures (network drops, 429, 5xx) with backoff.
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 1500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const transient = /fetch failed|ECONNRESET|ETIMEDOUT|socket|429|RESOURCE_EXHAUSTED|500|502|503|504|UNAVAILABLE|overloaded/i.test(String(err));
      if (!transient || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}
