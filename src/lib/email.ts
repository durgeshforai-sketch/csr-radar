import type { Settings } from "./settings";
export async function sendDigest(runId: string, s: Settings): Promise<{ ok: boolean; to: string[]; error?: string }> {
  void runId; void s;
  return { ok: false, to: [], error: "not implemented" };
}
